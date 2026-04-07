import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type ProductType = "CAPS" | "PREFORM";

type ProductionSetting = {
  id: number;
  productType: ProductType;
  piecesPerCarton: number;
  updatedAt?: string;
};

type SystemSetting = {
  id: number;
  qualityCheckIntervalMinutes: number;
  qualityCheckReminderMinutes: number;
  inventoryAuditFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  shiftEndReminderMinutes: number;
  weeklyReportDayOfWeek: number;
  weeklyReportTime: string;
  monthlyReportDayOfMonth: number;
  monthlyReportTime: string;
  updatedAt?: string;
};

type SettingsOverview = {
  productionSettingsCount: number;
  hasSystemSetting: boolean;
  productionSettings: ProductionSetting[];
  latestSystemSetting: SystemSetting | null;
  summary: {
    missingProductTypes: ProductType[];
  };
};

type SystemFormState = {
  qualityCheckIntervalMinutes: string;
  qualityCheckReminderMinutes: string;
  inventoryAuditFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  shiftEndReminderMinutes: string;
  weeklyReportDayOfWeek: string;
  weeklyReportTime: string;
  monthlyReportDayOfMonth: string;
  monthlyReportTime: string;
};

type FrequencyValue = SystemFormState["inventoryAuditFrequency"];

const productionTypes: ProductType[] = ["CAPS", "PREFORM"];

const defaultSystemForm: SystemFormState = {
  qualityCheckIntervalMinutes: "120",
  qualityCheckReminderMinutes: "60",
  inventoryAuditFrequency: "DAILY",
  shiftEndReminderMinutes: "20",
  weeklyReportDayOfWeek: "1",
  weeklyReportTime: "09:00",
  monthlyReportDayOfMonth: "1",
  monthlyReportTime: "09:00",
};

const tokenKey = "plasticon_token";

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const buildSystemForm = (setting: SystemSetting | null): SystemFormState =>
  setting
    ? {
        qualityCheckIntervalMinutes: String(
          setting.qualityCheckIntervalMinutes,
        ),
        qualityCheckReminderMinutes: String(
          setting.qualityCheckReminderMinutes,
        ),
        inventoryAuditFrequency: setting.inventoryAuditFrequency,
        shiftEndReminderMinutes: String(setting.shiftEndReminderMinutes),
        weeklyReportDayOfWeek: String(setting.weeklyReportDayOfWeek),
        weeklyReportTime: setting.weeklyReportTime,
        monthlyReportDayOfMonth: String(setting.monthlyReportDayOfMonth),
        monthlyReportTime: setting.monthlyReportTime,
      }
    : defaultSystemForm;

const buildProductionDrafts = (settings: ProductionSetting[]) => ({
  CAPS: String(
    settings.find((setting) => setting.productType === "CAPS")
      ?.piecesPerCarton ?? "",
  ),
  PREFORM: String(
    settings.find((setting) => setting.productType === "PREFORM")
      ?.piecesPerCarton ?? "",
  ),
});

const formatDateTime = (value: string | undefined, locale: string) => {
  if (!value) {
    return locale === "ar" ? "غير متوفر" : "Not available";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function SettingsAdminPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [productionSettings, setProductionSettings] = useState<
    ProductionSetting[]
  >([]);
  const [systemSetting, setSystemSetting] = useState<SystemSetting | null>(
    null,
  );
  const [productionDrafts, setProductionDrafts] = useState(
    buildProductionDrafts([]),
  );
  const [savingProductionType, setSavingProductionType] =
    useState<ProductType | null>(null);
  const [savingSystem, setSavingSystem] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "">("");
  const [systemForm, setSystemForm] =
    useState<SystemFormState>(defaultSystemForm);

  const text = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الإعدادات",
            loading: "جارٍ تحميل الإعدادات...",
            overviewTitle: "ملخص الإعدادات",
            overviewSubtitle: "راجع حالة الإعدادات قبل التعديل والحفظ.",
            productionSubtitle:
              "اضبط القيم الافتراضية لكل نوع منتج ويمكنك إنشاء القيم الناقصة مباشرة من هنا.",
            systemSubtitle:
              "راجع إعدادات التنبيهات والتقارير قبل حفظ الإعدادات العامة.",
            configured: "مضبوط",
            notConfigured: "غير مضبوط",
            missingTypes: "أنواع ناقصة",
            lastUpdated: "آخر تحديث",
            saving: "جارٍ الحفظ...",
            createDefault: "أنشئ أو حدّث القيمة الافتراضية لهذا النوع.",
            systemLoaded: "آخر إعداد نظام تم تحميله، المعرف",
            systemMissing: "لا توجد إعدادات نظام محفوظة حتى الآن.",
            settingsSaved: "تم حفظ الإعدادات بنجاح",
            productionSaved: "تم حفظ إعدادات الإنتاج بنجاح",
            invalidProduction: "أدخل عددًا صحيحًا موجبًا في حقل قطع الكرتونة.",
            invalidSystem: "تحقق من قيم النظام قبل الحفظ.",
            noChanges: "لا توجد تغييرات للحفظ",
            reset: "إعادة تعيين",
            qualityGroupTitle: "الجودة والتنبيهات",
            reportingGroupTitle: "التقارير الدورية",
            summaryPanelTitle: "ملخص النظام",
            summaryPanelSubtitle: "تأكد أن كل القيم تعكس سياسة المصنع قبل الحفظ.",
            productionChanged: "تم تعديل القيمة",
            productionUnchanged: "بدون تعديل",
          }
        : {
            title: "Settings",
            loading: "Loading settings...",
            overviewTitle: "Settings Overview",
            overviewSubtitle:
              "Check the current configuration state before saving changes.",
            productionSubtitle:
              "Adjust the default values for each product type and create missing ones here.",
            systemSubtitle:
              "Review alert and report settings before saving global configuration.",
            configured: "Configured",
            notConfigured: "Not configured",
            missingTypes: "Missing types",
            lastUpdated: "Last updated",
            saving: "Saving...",
            createDefault: "Create or update the default value for this type.",
            systemLoaded: "Last loaded system setting ID",
            systemMissing: "No system settings have been saved yet.",
            settingsSaved: "Settings saved successfully",
            productionSaved: "Production settings saved successfully",
            invalidProduction:
              "Enter a positive integer for pieces per carton.",
            invalidSystem: "Check the system fields before saving.",
            noChanges: "No changes to save",
            reset: "Reset",
            qualityGroupTitle: "Quality and Alerts",
            reportingGroupTitle: "Scheduled Reports",
            summaryPanelTitle: "System Snapshot",
            summaryPanelSubtitle:
              "Make sure all values reflect your factory policy before saving.",
            productionChanged: "Value changed",
            productionUnchanged: "No changes",
          },
    [locale],
  );

  const getProductTypeLabel = (type: "CAPS" | "PREFORM") =>
    copy.admin.productTypeLabels[type] ?? type;
  const getAuditFrequencyLabel = (value: "DAILY" | "WEEKLY" | "MONTHLY") =>
    copy.admin.auditFrequencyLabels[value] ?? value;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const overviewResponse = await fetchWithAdminAuth(
        "/settings/admin/overview",
      );

      let overviewData: SettingsOverview;
      if (overviewResponse.ok) {
        overviewData = (await overviewResponse.json()) as SettingsOverview;
      } else if (overviewResponse.status === 404) {
        const [productionResponse, systemResponse] = await Promise.all([
          fetchWithAdminAuth("/settings/production"),
          fetchWithAdminAuth("/settings/system"),
        ]);
        if (!productionResponse.ok) {
          throw new Error(await readApiError(productionResponse));
        }
        if (!systemResponse.ok) {
          throw new Error(await readApiError(systemResponse));
        }
        const productionData =
          (await productionResponse.json()) as ProductionSetting[];
        const systemData =
          (await systemResponse.json()) as SystemSetting | null;
        overviewData = {
          productionSettingsCount: productionData.length,
          hasSystemSetting: Boolean(systemData),
          productionSettings: productionData,
          latestSystemSetting: systemData,
          summary: {
            missingProductTypes: productionTypes.filter(
              (type) =>
                !productionData.some((setting) => setting.productType === type),
            ),
          },
        };
      } else {
        throw new Error(await readApiError(overviewResponse));
      }

      setOverview(overviewData);
      setProductionSettings(overviewData.productionSettings ?? []);
      setSystemSetting(overviewData.latestSystemSetting);
      setProductionDrafts(
        buildProductionDrafts(overviewData.productionSettings ?? []),
      );
      setSystemForm(buildSystemForm(overviewData.latestSystemSetting));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loading);
    } finally {
      setLoading(false);
    }
  }, [text.loading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleUpdateProductionSetting = async (productType: ProductType) => {
    const piecesPerCarton = Number(productionDrafts[productType]);
    if (!Number.isInteger(piecesPerCarton) || piecesPerCarton <= 0) {
      setStatusTone("error");
      setStatusMessage(text.invalidProduction);
      return;
    }
    setSavingProductionType(productType);
    setStatusTone("");
    setStatusMessage("");
    try {
      const response = await fetchWithAdminAuth(
        `/settings/production/${productType}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ piecesPerCarton }),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadData();
      setStatusTone("success");
      setStatusMessage(text.productionSaved);
    } catch (updateError) {
      setStatusTone("error");
      setStatusMessage(
        updateError instanceof Error
          ? updateError.message
          : text.invalidProduction,
      );
    } finally {
      setSavingProductionType(null);
    }
  };

  const validateSystemForm = () => {
    const interval = Number(systemForm.qualityCheckIntervalMinutes);
    const reminder = Number(systemForm.qualityCheckReminderMinutes);
    const shiftReminder = Number(systemForm.shiftEndReminderMinutes);
    const weeklyDay = Number(systemForm.weeklyReportDayOfWeek);
    const monthlyDay = Number(systemForm.monthlyReportDayOfMonth);

    if (
      !Number.isInteger(interval) ||
      interval <= 0 ||
      !Number.isInteger(reminder) ||
      reminder < 0 ||
      !Number.isInteger(shiftReminder) ||
      shiftReminder <= 0 ||
      !Number.isInteger(weeklyDay) ||
      weeklyDay < 1 ||
      weeklyDay > 7 ||
      !Number.isInteger(monthlyDay) ||
      monthlyDay < 1 ||
      monthlyDay > 31 ||
      !isValidTime(systemForm.weeklyReportTime) ||
      !isValidTime(systemForm.monthlyReportTime)
    ) {
      return text.invalidSystem;
    }

    return "";
  };

  const handleSaveSystemSettings = async () => {
    const validationError = validateSystemForm();
    if (validationError) {
      setStatusTone("error");
      setStatusMessage(validationError);
      return;
    }

    setSavingSystem(true);
    setStatusTone("");
    setStatusMessage("");
    try {
      const response = await fetchWithAdminAuth("/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualityCheckIntervalMinutes: Number(
            systemForm.qualityCheckIntervalMinutes,
          ),
          qualityCheckReminderMinutes: Number(
            systemForm.qualityCheckReminderMinutes,
          ),
          inventoryAuditFrequency: systemForm.inventoryAuditFrequency,
          shiftEndReminderMinutes: Number(systemForm.shiftEndReminderMinutes),
          weeklyReportDayOfWeek: Number(systemForm.weeklyReportDayOfWeek),
          weeklyReportTime: systemForm.weeklyReportTime,
          monthlyReportDayOfMonth: Number(systemForm.monthlyReportDayOfMonth),
          monthlyReportTime: systemForm.monthlyReportTime,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadData();
      setStatusTone("success");
      setStatusMessage(text.settingsSaved);
    } catch (saveError) {
      setStatusTone("error");
      setStatusMessage(
        saveError instanceof Error ? saveError.message : text.invalidSystem,
      );
    } finally {
      setSavingSystem(false);
    }
  };

  const overviewMissingProductTypes =
    overview?.summary.missingProductTypes ?? [];
  const productionLookup = useMemo(
    () =>
      new Map(
        productionSettings.map((setting) => [setting.productType, setting]),
      ),
    [productionSettings],
  );

  const productionChangeMap = useMemo(() => {
    const map: Record<ProductType, boolean> = {
      CAPS: false,
      PREFORM: false,
    };

    productionTypes.forEach((type) => {
      const setting = productionLookup.get(type);
      const draftValue = Number(productionDrafts[type]);
      map[type] = setting
        ? Number.isFinite(draftValue) && draftValue !== setting.piecesPerCarton
        : productionDrafts[type].trim().length > 0;
    });

    return map;
  }, [productionDrafts, productionLookup]);

  const normalizedSystemForm = useMemo(
    () => ({
      qualityCheckIntervalMinutes: Number(systemForm.qualityCheckIntervalMinutes),
      qualityCheckReminderMinutes: Number(systemForm.qualityCheckReminderMinutes),
      inventoryAuditFrequency: systemForm.inventoryAuditFrequency,
      shiftEndReminderMinutes: Number(systemForm.shiftEndReminderMinutes),
      weeklyReportDayOfWeek: Number(systemForm.weeklyReportDayOfWeek),
      weeklyReportTime: systemForm.weeklyReportTime,
      monthlyReportDayOfMonth: Number(systemForm.monthlyReportDayOfMonth),
      monthlyReportTime: systemForm.monthlyReportTime,
    }),
    [systemForm],
  );

  const systemHasChanges = useMemo(() => {
    if (!systemSetting) {
      return Object.values(systemForm).some((value) => value !== "");
    }

    return (
      normalizedSystemForm.qualityCheckIntervalMinutes !==
        systemSetting.qualityCheckIntervalMinutes ||
      normalizedSystemForm.qualityCheckReminderMinutes !==
        systemSetting.qualityCheckReminderMinutes ||
      normalizedSystemForm.inventoryAuditFrequency !==
        systemSetting.inventoryAuditFrequency ||
      normalizedSystemForm.shiftEndReminderMinutes !==
        systemSetting.shiftEndReminderMinutes ||
      normalizedSystemForm.weeklyReportDayOfWeek !==
        systemSetting.weeklyReportDayOfWeek ||
      normalizedSystemForm.weeklyReportTime !== systemSetting.weeklyReportTime ||
      normalizedSystemForm.monthlyReportDayOfMonth !==
        systemSetting.monthlyReportDayOfMonth ||
      normalizedSystemForm.monthlyReportTime !== systemSetting.monthlyReportTime
    );
  }, [normalizedSystemForm, systemForm, systemSetting]);

  const resetSystemForm = () => {
    setSystemForm(buildSystemForm(systemSetting));
    setStatusTone("");
    setStatusMessage("");
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{text.title}</h1>
          </div>
          <div className="admin-header__actions">
            <DateTimeBadge />
            <LocaleSwitch />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/admin")}
            >
              {locale === "ar" ? "لوحة الإدارة" : "Admin"}
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2>{text.overviewTitle}</h2>
              <p className="admin-muted">{text.overviewSubtitle}</p>
            </div>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadData()}
            >
              {copy.refresh}
            </button>
          </div>
          <div className="admin-kpi-grid admin-overview-grid">
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">
                {copy.admin.productionTab}
              </p>
              <p className="admin-kpi-card__value">
                {overview?.productionSettingsCount ?? productionSettings.length}
              </p>
              <p className="admin-kpi-card__status">
                {overview?.productionSettingsCount || productionSettings.length
                  ? text.configured
                  : text.notConfigured}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.missingTypes}</p>
              <p className="admin-kpi-card__value">
                {overviewMissingProductTypes.length}
              </p>
              <p className="admin-kpi-card__status">
                {overviewMissingProductTypes.length
                  ? overviewMissingProductTypes
                      .map((type) => getProductTypeLabel(type))
                      .join(", ")
                  : text.configured}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{copy.admin.systemTab}</p>
              <p className="admin-kpi-card__value">
                {overview?.hasSystemSetting
                  ? text.configured
                  : text.notConfigured}
              </p>
              <p className="admin-kpi-card__status">
                {systemSetting
                  ? `${text.systemLoaded}: ${systemSetting.id}`
                  : text.systemMissing}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.lastUpdated}</p>
              <p className="admin-kpi-card__value admin-kpi-card__value--small">
                {formatDateTime(
                  overview?.latestSystemSetting?.updatedAt ??
                    productionSettings[0]?.updatedAt,
                  locale,
                )}
              </p>
              <p className="admin-kpi-card__status">
                {overview?.latestSystemSetting
                  ? copy.admin.systemTab
                  : copy.admin.productionTab}
              </p>
            </article>
          </div>
          {overviewMissingProductTypes.length ? (
            <div className="admin-status-banner admin-status-banner--warning">
              {text.missingTypes}:{" "}
              {overviewMissingProductTypes
                .map((type) => getProductTypeLabel(type))
                .join(", ")}
            </div>
          ) : null}
          {statusMessage ? (
            <div
              className={`auth-alert ${
                statusTone === "error"
                  ? "auth-alert--error"
                  : "auth-alert--success"
              }`}
            >
              {statusMessage}
            </div>
          ) : null}
          {loading ? <p>{text.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2>{copy.admin.productionTab}</h2>
              <p className="admin-muted">{text.productionSubtitle}</p>
            </div>
          </div>
          <div className="admin-grid">
            {productionTypes.map((type) => {
              const setting = productionLookup.get(type);
              const currentValue = productionDrafts[type];
              const isMissing = !setting;

              return (
                <article className="admin-panel" key={type}>
                  <div className="admin-panel__head">
                    <h3>{getProductTypeLabel(type)}</h3>
                    <span
                      className={`admin-pill ${isMissing ? "admin-pill--warning" : "admin-pill--success"}`}
                    >
                      {isMissing ? text.notConfigured : text.configured}
                    </span>
                  </div>
                  <p>
                    {isMissing
                      ? text.createDefault
                      : `${copy.admin.productionPiecesPerCarton}: ${setting.piecesPerCarton}`}
                  </p>
                  <p className="admin-muted">
                    {productionChangeMap[type]
                      ? text.productionChanged
                      : text.productionUnchanged}
                  </p>
                  <label>
                    {copy.admin.productionPiecesPerCarton}
                    <input
                      type="number"
                      min={1}
                      value={currentValue}
                      onChange={(event) =>
                        setProductionDrafts((prev) => ({
                          ...prev,
                          [type]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="admin-panel__actions">
                    <button
                      type="button"
                      className="auth-button"
                      disabled={
                        savingProductionType === type || !productionChangeMap[type]
                      }
                      onClick={() => void handleUpdateProductionSetting(type)}
                    >
                      {savingProductionType === type
                        ? text.saving
                        : copy.admin.saveChanges}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2>{copy.admin.systemTab}</h2>
              <p className="admin-muted">{text.systemSubtitle}</p>
            </div>
          </div>
          {systemSetting ? (
            <p className="admin-muted">
              {text.systemLoaded}: {systemSetting.id} ·{" "}
              {formatDateTime(systemSetting.updatedAt, locale)}
            </p>
          ) : (
            <p className="admin-muted">{text.systemMissing}</p>
          )}
          <div className="settings-system-layout">
            <div className="settings-system-content">
              <div className="settings-group-title">{text.qualityGroupTitle}</div>
              <div className="admin-form-grid">
                <label>
                  {copy.admin.qualityCheckIntervalMinutes}
                  <input
                    type="number"
                    min={1}
                    value={systemForm.qualityCheckIntervalMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        qualityCheckIntervalMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.qualityCheckReminderMinutes}
                  <input
                    type="number"
                    min={0}
                    value={systemForm.qualityCheckReminderMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        qualityCheckReminderMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.inventoryAuditFrequency}
                  <select
                    value={systemForm.inventoryAuditFrequency}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        inventoryAuditFrequency: event.target.value as FrequencyValue,
                      }))
                    }
                  >
                    <option value="DAILY">{getAuditFrequencyLabel("DAILY")}</option>
                    <option value="WEEKLY">
                      {getAuditFrequencyLabel("WEEKLY")}
                    </option>
                    <option value="MONTHLY">
                      {getAuditFrequencyLabel("MONTHLY")}
                    </option>
                  </select>
                </label>
                <label>
                  {copy.admin.shiftEndReminderMinutes}
                  <input
                    type="number"
                    min={1}
                    value={systemForm.shiftEndReminderMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        shiftEndReminderMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="settings-group-title">{text.reportingGroupTitle}</div>
              <div className="admin-form-grid">
                <label>
                  {copy.admin.weeklyReportDayOfWeek}
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={systemForm.weeklyReportDayOfWeek}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        weeklyReportDayOfWeek: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.weeklyReportTime}
                  <input
                    type="time"
                    value={systemForm.weeklyReportTime}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        weeklyReportTime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.monthlyReportDayOfMonth}
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={systemForm.monthlyReportDayOfMonth}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        monthlyReportDayOfMonth: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.monthlyReportTime}
                  <input
                    type="time"
                    value={systemForm.monthlyReportTime}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        monthlyReportTime: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <aside className="admin-panel settings-side-panel">
              <h3>{text.summaryPanelTitle}</h3>
              <p>{text.summaryPanelSubtitle}</p>
              <p>
                {copy.admin.inventoryAuditFrequency}: {getAuditFrequencyLabel(systemForm.inventoryAuditFrequency)}
              </p>
              <p>
                {copy.admin.weeklyReportDayOfWeek}: {systemForm.weeklyReportDayOfWeek} · {copy.admin.weeklyReportTime}: {systemForm.weeklyReportTime}
              </p>
              <p>
                {copy.admin.monthlyReportDayOfMonth}: {systemForm.monthlyReportDayOfMonth} · {copy.admin.monthlyReportTime}: {systemForm.monthlyReportTime}
              </p>
              <p className="admin-muted">
                {systemHasChanges ? copy.admin.edit : text.noChanges}
              </p>
            </aside>
          </div>
          <div className="admin-section__actions">
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={resetSystemForm}
            >
              {text.reset}
            </button>
            <button
              type="button"
              className="auth-button"
              disabled={savingSystem || !systemHasChanges}
              onClick={() => void handleSaveSystemSettings()}
            >
              {savingSystem ? text.saving : copy.save}
            </button>
          </div>
          {!systemHasChanges ? (
            <p className="admin-muted">{text.noChanges}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
