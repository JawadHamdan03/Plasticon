import { useCallback, useEffect, useMemo, useState } from "react";
import { Factory, LayoutDashboard, Settings2, Trash2, Users2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { createUserSocket } from "../../lib/socket";

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

type NotificationRuleKey =
  | "PRODUCTION_CREATED"
  | "PURCHASE_CREATED"
  | "SALE_CREATED"
  | "INVENTORY_TRANSACTION_CREATED";

type NotificationRuleDelivery = "ADMIN_ONLY" | "ADMIN_AND_SHIFT";

type NotificationRulesSettings = {
  rules: Record<
    NotificationRuleKey,
    { enabled: boolean; delivery: NotificationRuleDelivery }
  >;
  updatedAt?: string;
  updatedById?: number | null;
};

type FrequencyValue = SystemFormState["inventoryAuditFrequency"];

type SettingsTab =
  | "overview"
  | "production"
  | "system"
  | "users";

const settingsTabValues: SettingsTab[] = [
  "overview",
  "production",
  "system",
  "users",
];

type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: string;
  phone: string | null;
  nationalId: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  profileImage: string | null;
};

type UserFormState = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  nationalId: string;
};

const emptyUserForm = (): UserFormState => ({
  fullName: "",
  username: "",
  email: "",
  phone: "",
  role: "WORKER",
  password: "",
  nationalId: "",
});

const isSettingsTab = (value: string | null): value is SettingsTab =>
  value !== null && settingsTabValues.includes(value as SettingsTab);

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

const defaultNotificationRules: NotificationRulesSettings = {
  rules: {
    PRODUCTION_CREATED: { enabled: true, delivery: "ADMIN_AND_SHIFT" },
    PURCHASE_CREATED: { enabled: true, delivery: "ADMIN_ONLY" },
    SALE_CREATED: { enabled: true, delivery: "ADMIN_ONLY" },
    INVENTORY_TRANSACTION_CREATED: { enabled: true, delivery: "ADMIN_ONLY" },
  },
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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

export function SettingsAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [notificationRules, setNotificationRules] =
    useState<NotificationRulesSettings>(defaultNotificationRules);
  const [initialNotificationRules, setInitialNotificationRules] =
    useState<NotificationRulesSettings>(defaultNotificationRules);
  const [savingNotificationRules, setSavingNotificationRules] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");

  /* ── Users management ── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userModal, setUserModal] = useState<"add" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm());
  const [userFormError, setUserFormError] = useState("");
  const [userFormSaving, setUserFormSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");

    if (!isSettingsTab(tabParam)) {
      if (activeTab !== "overview") {
        setActiveTab("overview");
      }
      return;
    }

    if (tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [activeTab, searchParams]);

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
            summaryPanelSubtitle:
              "تأكد أن كل القيم تعكس سياسة المصنع قبل الحفظ.",
            productionChanged: "تم تعديل القيمة",
            productionUnchanged: "بدون تعديل",
            heroSubtitle:
              "مركز إعدادات المصنع: راقب القيم، عدّل بسرعة، واحفظ بثقة.",
            heroTips: "مؤشرات سريعة",
            productionHealth: "جاهزية إعدادات الإنتاج",
            systemHealth: "جاهزية إعدادات النظام",
            presetBalanced: "تطبيق إعداد متوازن",
            presetStrict: "تطبيق إعداد صارم",
            presetRelaxed: "تطبيق إعداد مرن",
            tabOverview: "نظرة عامة",
            tabProduction: "الإنتاج",
            tabSystem: "النظام",
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
            heroSubtitle:
              "Factory control center: monitor values, tune quickly, and save with confidence.",
            heroTips: "Quick indicators",
            productionHealth: "Production readiness",
            systemHealth: "System readiness",
            presetBalanced: "Apply balanced preset",
            presetStrict: "Apply strict preset",
            presetRelaxed: "Apply relaxed preset",
            tabOverview: "Overview",
            tabProduction: "Production",
            tabSystem: "System",
          },
    [locale],
  );

  const getProductTypeLabel = (type: "CAPS" | "PREFORM") =>
    copy.admin.productTypeLabels[type] ?? type;
  const getAuditFrequencyLabel = (value: "DAILY" | "WEEKLY" | "MONTHLY") =>
    copy.admin.auditFrequencyLabels[value] ?? value;

  const settingsTabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "overview",   label: text.tabOverview,                           icon: <LayoutDashboard size={14} /> },
    { id: "production", label: text.tabProduction,                         icon: <Factory size={14} /> },
    { id: "system",     label: text.tabSystem,                             icon: <Settings2 size={14} /> },
    { id: "users",      label: locale === "ar" ? "المستخدمون" : "Users",  icon: <Users2 size={14} /> },
  ];

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

      const notificationRulesResponse = await fetchWithAdminAuth(
        "/settings/notification-rules",
      );
      if (notificationRulesResponse.ok) {
        const notificationRulesData =
          (await notificationRulesResponse.json()) as NotificationRulesSettings;
        setNotificationRules(notificationRulesData);
        setInitialNotificationRules(notificationRulesData);
      }
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
    [systemForm],
  );

  const systemHasChanges = useMemo(() => {
    if (!systemSetting) {
      return JSON.stringify(systemForm) !== JSON.stringify(defaultSystemForm);
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
      normalizedSystemForm.weeklyReportTime !==
        systemSetting.weeklyReportTime ||
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

  const notificationRulesChanged =
    JSON.stringify(notificationRules.rules) !==
    JSON.stringify(initialNotificationRules.rules);

  const updateNotificationRule = (
    key: NotificationRuleKey,
    updates: Partial<{ enabled: boolean; delivery: NotificationRuleDelivery }>,
  ) => {
    setNotificationRules((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: {
          ...prev.rules[key],
          ...updates,
        },
      },
    }));
  };

  const handleSaveNotificationRules = async () => {
    setSavingNotificationRules(true);
    setStatusTone("");
    setStatusMessage("");

    try {
      const response = await fetchWithAdminAuth(
        "/settings/notification-rules",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: notificationRules.rules }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const saved = (await response.json()) as NotificationRulesSettings;
      setNotificationRules(saved);
      setInitialNotificationRules(saved);
      setStatusTone("success");
      setStatusMessage(
        locale === "ar"
          ? "تم حفظ قواعد الإشعارات بنجاح"
          : "Notification rules saved successfully",
      );
    } catch (saveError) {
      setStatusTone("error");
      setStatusMessage(
        saveError instanceof Error
          ? saveError.message
          : locale === "ar"
            ? "فشل حفظ قواعد الإشعارات"
            : "Failed to save notification rules",
      );
    } finally {
      setSavingNotificationRules(false);
    }
  };

  const applySystemPreset = (preset: "BALANCED" | "STRICT" | "RELAXED") => {
    const next: SystemFormState =
      preset === "STRICT"
        ? {
            qualityCheckIntervalMinutes: "60",
            qualityCheckReminderMinutes: "20",
            inventoryAuditFrequency: "DAILY",
            shiftEndReminderMinutes: "15",
            weeklyReportDayOfWeek: "1",
            weeklyReportTime: "08:00",
            monthlyReportDayOfMonth: "1",
            monthlyReportTime: "08:00",
          }
        : preset === "RELAXED"
          ? {
              qualityCheckIntervalMinutes: "180",
              qualityCheckReminderMinutes: "60",
              inventoryAuditFrequency: "MONTHLY",
              shiftEndReminderMinutes: "30",
              weeklyReportDayOfWeek: "5",
              weeklyReportTime: "11:00",
              monthlyReportDayOfMonth: "5",
              monthlyReportTime: "11:00",
            }
          : {
              qualityCheckIntervalMinutes: "120",
              qualityCheckReminderMinutes: "40",
              inventoryAuditFrequency: "WEEKLY",
              shiftEndReminderMinutes: "20",
              weeklyReportDayOfWeek: "2",
              weeklyReportTime: "09:00",
              monthlyReportDayOfMonth: "1",
              monthlyReportTime: "09:00",
            };

    setSystemForm(next);
    setStatusTone("");
    setStatusMessage("");
  };

  /* ── User management functions ── */
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchWithAdminAuth("/users/all");
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch {
      // silent
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") void loadUsers();
  }, [activeTab, loadUsers]);

  const openAddUser = () => {
    setUserForm(emptyUserForm());
    setUserFormError("");
    setEditingUser(null);
    setUserModal("add");
  };

  const openEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setUserForm({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone ?? "",
      role: u.role,
      password: "",
      nationalId: u.nationalId ?? "",
    });
    setUserFormError("");
    setUserModal("edit");
  };

  const handleSaveUser = async () => {
    if (!userForm.fullName.trim() || !userForm.email.trim()) {
      setUserFormError(locale === "ar" ? "الاسم والبريد الإلكتروني مطلوبان" : "Name and email are required");
      return;
    }
    if (userModal === "add" && !userForm.password.trim()) {
      setUserFormError(locale === "ar" ? "كلمة المرور مطلوبة للمستخدم الجديد" : "Password is required for new users");
      return;
    }
    setUserFormSaving(true);
    setUserFormError("");
    try {
      if (userModal === "add") {
        const fd = new FormData();
        fd.append("fullName", userForm.fullName.trim());
        fd.append("username", userForm.username.trim() || userForm.email.split("@")[0]);
        fd.append("email", userForm.email.trim());
        fd.append("password", userForm.password);
        fd.append("role", userForm.role);
        fd.append("nationalId", userForm.nationalId.trim() || "0000000000");
        if (userForm.phone.trim()) fd.append("phone", userForm.phone.trim());
        const res = await fetch(`${API_BASE_URL}/auth/register`, { method: "POST", credentials: "include", body: fd });
        if (!res.ok) throw new Error(await readApiError(res));
      } else if (editingUser) {
        const body: Record<string, unknown> = {
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim() || null,
        };
        if (userForm.password.trim()) body.password = userForm.password;
        const res = await fetchWithAdminAuth(`/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await readApiError(res));
        // Update role separately if changed
        if (userForm.role !== editingUser.role) {
          const roleRes = await fetchWithAdminAuth(`/users/${editingUser.id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: userForm.role }),
          });
          if (!roleRes.ok) throw new Error(await readApiError(roleRes));
        }
      }
      setUserModal(null);
      await loadUsers();
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setUserFormSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await fetchWithAdminAuth(`/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
      setDeleteConfirmId(null);
      setStatusTone("success");
      setStatusMessage("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (u.deletedAt) return false;
    const q = userSearch.toLowerCase();
    const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const ROLES = ["ADMIN", "WORKER", "ENGINEER", "ACCOUNTANT", "SALES_REP"];

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "linear-gradient(135deg,#f97316,#ea580c)",
      WORKER: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
      ENGINEER: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
      ACCOUNTANT: "linear-gradient(135deg,#10b981,#059669)",
    };
    return map[role] ?? "linear-gradient(135deg,#94a3b8,#64748b)";
  };

  const productionConfiguredCount = productionTypes.filter((type) =>
    Boolean(productionLookup.get(type)),
  ).length;

  const productionHealthPercent = Math.round(
    (productionConfiguredCount / productionTypes.length) * 100,
  );

  const systemHealthPercent = systemSetting ? 100 : 0;

  /* ── helpers ── */
  const tabBtn = (id: SettingsTab, label: string, icon: React.ReactNode) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => {
          setActiveTab(id);
          setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true });
        }}
        style={{
          display: "flex", alignItems: "center", gap: ".4rem",
          padding: ".5rem 1.1rem",
          borderRadius: 10,
          border: active ? "none" : "1px solid transparent",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: ".82rem",
          transition: "all .18s",
          background: active ? "var(--orange-500,#f97316)" : "transparent",
          color: active ? "#fff" : "var(--text-secondary)",
          boxShadow: active ? "0 3px 10px rgba(249,115,22,.35)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {icon}
        {label}
      </button>
    );
  };

  const kpiCard = (label: string, value: string | number, sub: string, gradient: string) => (
    <div style={{
      borderRadius: 14,
      padding: "1.25rem 1.5rem",
      background: gradient,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: ".3rem",
    }}>
      <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: ".78rem", opacity: .8 }}>{sub}</p>
    </div>
  );

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ margin: "0 0 .2rem", fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--orange-500,#f97316)" }}>
            Admin
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900 }}>{text.title}</h1>
          <p style={{ margin: ".25rem 0 0", color: "var(--text-secondary)", fontSize: ".88rem" }}>{text.heroSubtitle}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            {[
              { label: text.productionHealth, value: `${productionHealthPercent}%`, ok: productionHealthPercent === 100 },
              { label: text.systemHealth, value: `${systemHealthPercent}%`, ok: systemHealthPercent === 100 },
            ].map(({ label, value, ok }) => (
              <span key={label} style={{
                padding: ".3rem .75rem",
                borderRadius: 999,
                fontSize: ".75rem",
                fontWeight: 700,
                background: ok ? "rgba(34,197,94,.12)" : "rgba(249,115,22,.12)",
                color: ok ? "#16a34a" : "var(--orange-600,#ea580c)",
              }}>
                {label}: {value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: ".3rem",
        padding: ".4rem",
        borderRadius: 14,
        background: "var(--bg-card,#fff)",
        border: "1px solid var(--border-default,#e5e7eb)",
        width: "fit-content",
        flexWrap: "wrap",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      }} role="tablist">
        {settingsTabs.map((tab) => tabBtn(tab.id, tab.label, tab.icon))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
            {kpiCard(
              copy.admin.productionTab,
              overview?.productionSettingsCount ?? productionSettings.length,
              overview?.productionSettingsCount ? text.configured : text.notConfigured,
              "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            )}
            {kpiCard(
              text.missingTypes,
              overviewMissingProductTypes.length,
              overviewMissingProductTypes.length
                ? overviewMissingProductTypes.map((t) => getProductTypeLabel(t)).join(", ")
                : text.configured,
              overviewMissingProductTypes.length
                ? "linear-gradient(135deg,#f97316,#ea580c)"
                : "linear-gradient(135deg,#22c55e,#16a34a)",
            )}
            {kpiCard(
              copy.admin.systemTab,
              overview?.hasSystemSetting ? "✓" : "—",
              systemSetting ? `ID ${systemSetting.id}` : text.systemMissing,
              systemSetting ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "linear-gradient(135deg,#94a3b8,#64748b)",
            )}
            {kpiCard(
              text.lastUpdated,
              formatDateTime(
                overview?.latestSystemSetting?.updatedAt ?? productionSettings[0]?.updatedAt,
                locale,
              ).split(",")[0] ?? "—",
              overview?.latestSystemSetting ? copy.admin.systemTab : copy.admin.productionTab,
              "linear-gradient(135deg,#f59e0b,#d97706)",
            )}
          </div>

          {overviewMissingProductTypes.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: ".6rem",
              padding: ".75rem 1.1rem", borderRadius: 10,
              background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.25)",
              fontSize: ".85rem", color: "var(--orange-700,#c2410c)", fontWeight: 600,
            }}>
              ⚠ {text.missingTypes}: {overviewMissingProductTypes.map((t) => getProductTypeLabel(t)).join(", ")}
            </div>
          )}

          {statusMessage && (
            <div style={{
              display: "flex", alignItems: "center", gap: ".5rem",
              padding: ".7rem 1rem", borderRadius: 8,
              background: statusTone === "error" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)",
              color: statusTone === "error" ? "#dc2626" : "#16a34a",
              fontSize: ".85rem", fontWeight: 500,
            }}>
              {statusTone === "error" ? "✕" : "✓"} {statusMessage}
            </div>
          )}

          {loading && <p style={{ color: "var(--text-secondary)", fontSize: ".88rem" }}>{text.loading}</p>}
          {error && (
            <div style={{ padding: ".7rem 1rem", borderRadius: 8, background: "rgba(239,68,68,.1)", color: "#dc2626", fontSize: ".85rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => void loadData()}
              style={{
                padding: ".5rem 1.1rem", borderRadius: 8,
                background: "var(--orange-500,#f97316)", color: "#fff",
                border: "none", cursor: "pointer", fontWeight: 700, fontSize: ".85rem",
              }}
            >
              {copy.refresh}
            </button>
          </div>
        </div>
      )}

      {/* ─── PRODUCTION TAB ─── */}
      {activeTab === "production" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h2 style={{ margin: "0 0 .2rem", fontSize: "1.1rem", fontWeight: 800 }}>{copy.admin.productionTab}</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>{text.productionSubtitle}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.25rem" }}>
            {productionTypes.map((type) => {
              const setting = productionLookup.get(type);
              const isMissing = !setting;
              const changed = productionChangeMap[type];
              return (
                <div key={type} style={{ padding: "1.5rem", borderRadius: 14, border: `2px solid ${isMissing ? "rgba(249,115,22,.3)" : "var(--border-default,#e5e7eb)"}`, background: "var(--bg-card,#fff)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{getProductTypeLabel(type)}</h3>
                    <span style={{ padding: ".2rem .65rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: isMissing ? "rgba(249,115,22,.12)" : "rgba(34,197,94,.1)", color: isMissing ? "var(--orange-600,#ea580c)" : "#16a34a" }}>
                      {isMissing ? text.notConfigured : text.configured}
                    </span>
                  </div>
                  {!isMissing && (
                    <p style={{ margin: "0 0 .75rem", fontSize: ".85rem", color: "var(--text-secondary)" }}>
                      {copy.admin.productionPiecesPerCarton}: <strong style={{ color: "var(--text-primary)" }}>{setting.piecesPerCarton}</strong>
                    </p>
                  )}
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".35rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>{copy.admin.productionPiecesPerCarton}</label>
                    <input
                      type="number"
                      min={1}
                      className="auth-input"
                      style={{ paddingLeft: "1rem" }}
                      value={productionDrafts[type]}
                      onChange={(e) => setProductionDrafts((prev) => ({ ...prev, [type]: e.target.value }))}
                    />
                    {changed && <p style={{ margin: ".35rem 0 0", fontSize: ".75rem", color: "var(--orange-600,#ea580c)", fontWeight: 600 }}>● {text.productionChanged}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={savingProductionType === type || !changed}
                    onClick={() => void handleUpdateProductionSetting(type)}
                    style={{ width: "100%", padding: ".55rem", borderRadius: 8, background: changed ? "var(--orange-500,#f97316)" : "var(--border-color,#e5e7eb)", color: changed ? "#fff" : "var(--text-secondary)", border: "none", cursor: changed ? "pointer" : "not-allowed", fontWeight: 700, fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}
                  >
                    {savingProductionType === type ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: changed ? "#fff" : "var(--text-secondary)" }} /> {text.saving}</> : copy.admin.saveChanges}
                  </button>
                </div>
              );
            })}
          </div>
          {statusMessage && (
            <div style={{ padding: ".65rem 1rem", borderRadius: 8, background: statusTone === "error" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: statusTone === "error" ? "#dc2626" : "#16a34a", fontSize: ".85rem", fontWeight: 500 }}>
              {statusMessage}
            </div>
          )}
        </div>
      )}

      {/* ─── SYSTEM TAB ─── */}
      {activeTab === "system" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem" }}>
            <div>
              <h2 style={{ margin: "0 0 .2rem", fontSize: "1.1rem", fontWeight: 800 }}>{copy.admin.systemTab}</h2>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>{text.systemSubtitle}</p>
              {systemSetting && <p style={{ margin: ".3rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{text.systemLoaded}: {systemSetting.id} · {formatDateTime(systemSetting.updatedAt, locale)}</p>}
            </div>
            {/* Presets */}
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {(["BALANCED", "STRICT", "RELAXED"] as const).map((p) => (
                <button key={p} type="button" onClick={() => applySystemPreset(p)} style={{ padding: ".4rem .85rem", borderRadius: 8, border: "1px solid var(--border-default,#e5e7eb)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: ".78rem", color: "var(--text-secondary)" }}>
                  {p === "BALANCED" ? text.presetBalanced : p === "STRICT" ? text.presetStrict : text.presetRelaxed}
                </button>
              ))}
            </div>
          </div>

          <div className="layout-main-aside">
            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Quality group */}
              <div style={{ background: "var(--bg-card,#fff)", border: "1px solid var(--border-default,#e5e7eb)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem", fontSize: ".85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--orange-500,#f97316)" }}>{text.qualityGroupTitle}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
                  {[
                    { label: copy.admin.qualityCheckIntervalMinutes, key: "qualityCheckIntervalMinutes" as const, type: "number", min: 1 },
                    { label: copy.admin.qualityCheckReminderMinutes, key: "qualityCheckReminderMinutes" as const, type: "number", min: 0 },
                    { label: copy.admin.shiftEndReminderMinutes, key: "shiftEndReminderMinutes" as const, type: "number", min: 1 },
                  ].map(({ label, key, type, min }) => (
                    <div key={key}>
                      <label style={{ display: "block", marginBottom: ".35rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
                      <input type={type} min={min} className="auth-input" style={{ paddingLeft: "1rem" }} value={systemForm[key]} onChange={(e) => setSystemForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", marginBottom: ".35rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>{copy.admin.inventoryAuditFrequency}</label>
                    <select className="auth-input" style={{ paddingLeft: "1rem" }} value={systemForm.inventoryAuditFrequency} onChange={(e) => setSystemForm((p) => ({ ...p, inventoryAuditFrequency: e.target.value as FrequencyValue }))}>
                      {(["DAILY","WEEKLY","MONTHLY"] as const).map((v) => <option key={v} value={v}>{getAuditFrequencyLabel(v)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reporting group */}
              <div style={{ background: "var(--bg-card,#fff)", border: "1px solid var(--border-default,#e5e7eb)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem", fontSize: ".85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--orange-500,#f97316)" }}>{text.reportingGroupTitle}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
                  {[
                    { label: copy.admin.weeklyReportDayOfWeek, key: "weeklyReportDayOfWeek" as const, type: "number", min: 1, max: 7 },
                    { label: copy.admin.weeklyReportTime, key: "weeklyReportTime" as const, type: "time" },
                    { label: copy.admin.monthlyReportDayOfMonth, key: "monthlyReportDayOfMonth" as const, type: "number", min: 1, max: 31 },
                    { label: copy.admin.monthlyReportTime, key: "monthlyReportTime" as const, type: "time" },
                  ].map(({ label, key, type, min, max }) => (
                    <div key={key}>
                      <label style={{ display: "block", marginBottom: ".35rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
                      <input type={type} min={min} max={max} className="auth-input" style={{ paddingLeft: "1rem" }} value={systemForm[key]} onChange={(e) => setSystemForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification rules */}
              <div style={{ background: "var(--bg-card,#fff)", border: "1px solid var(--border-default,#e5e7eb)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
                <h4 style={{ margin: "0 0 1rem", fontSize: ".85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--orange-500,#f97316)" }}>{locale === "ar" ? "قواعد الإشعارات" : "Notification Rules"}</h4>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>{locale === "ar" ? "القاعدة" : "Rule"}</th><th>{locale === "ar" ? "مفعلة" : "Enabled"}</th><th>{locale === "ar" ? "الوصول" : "Delivery"}</th></tr></thead>
                    <tbody>
                      {([["PRODUCTION_CREATED", locale === "ar" ? "عند إضافة إنتاج" : "On production create"], ["PURCHASE_CREATED", locale === "ar" ? "عند إضافة شراء" : "On purchase create"], ["SALE_CREATED", locale === "ar" ? "عند إضافة بيع" : "On sale create"], ["INVENTORY_TRANSACTION_CREATED", locale === "ar" ? "عند حركة مخزون" : "On inventory transaction"]] as Array<[NotificationRuleKey, string]>).map(([ruleKey, label]) => (
                        <tr key={ruleKey}>
                          <td>{label}</td>
                          <td><input type="checkbox" checked={notificationRules.rules[ruleKey].enabled} onChange={(e) => updateNotificationRule(ruleKey, { enabled: e.target.checked })} /></td>
                          <td><select value={notificationRules.rules[ruleKey].delivery} disabled={!notificationRules.rules[ruleKey].enabled} onChange={(e) => updateNotificationRule(ruleKey, { delivery: e.target.value as NotificationRuleDelivery })}><option value="ADMIN_ONLY">{locale === "ar" ? "الأدمن فقط" : "Admin only"}</option><option value="ADMIN_AND_SHIFT">{locale === "ar" ? "الأدمن + الشفت" : "Admin + shift"}</option></select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Summary panel */}
            <div style={{ background: "linear-gradient(135deg,var(--orange-500,#f97316),var(--orange-600,#ea580c))", borderRadius: 14, padding: "1.25rem 1.5rem", color: "#fff", position: "sticky", top: "1rem" }}>
              <h4 style={{ margin: "0 0 1rem", fontSize: ".85rem", fontWeight: 800, opacity: .9 }}>{text.summaryPanelTitle}</h4>
              <p style={{ margin: "0 0 .5rem", fontSize: ".78rem", opacity: .8, lineHeight: 1.5 }}>{text.summaryPanelSubtitle}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginTop: "1rem" }}>
                {[
                  [copy.admin.inventoryAuditFrequency, getAuditFrequencyLabel(systemForm.inventoryAuditFrequency)],
                  [copy.admin.weeklyReportDayOfWeek, `Day ${systemForm.weeklyReportDayOfWeek} at ${systemForm.weeklyReportTime}`],
                  [copy.admin.monthlyReportDayOfMonth, `Day ${systemForm.monthlyReportDayOfMonth} at ${systemForm.monthlyReportTime}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,.15)", borderRadius: 8, padding: ".5rem .75rem" }}>
                    <p style={{ margin: 0, fontSize: ".7rem", opacity: .8 }}>{label}</p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".85rem" }}>{val}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: "1rem 0 0", fontSize: ".75rem", opacity: .8 }}>{systemHasChanges ? "⚡ " + (copy.admin.edit ?? "Unsaved changes") : "✓ " + text.noChanges}</p>
            </div>
          </div>

          {statusMessage && (
            <div style={{ padding: ".65rem 1rem", borderRadius: 8, background: statusTone === "error" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: statusTone === "error" ? "#dc2626" : "#16a34a", fontSize: ".85rem", fontWeight: 500 }}>
              {statusMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handleSaveSystemSettings()} disabled={savingSystem || !systemHasChanges} style={{ padding: ".55rem 1.4rem", borderRadius: 8, background: systemHasChanges ? "var(--orange-500,#f97316)" : "var(--border-color,#e5e7eb)", color: systemHasChanges ? "#fff" : "var(--text-secondary)", border: "none", cursor: systemHasChanges ? "pointer" : "not-allowed", fontWeight: 700, fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".4rem" }}>
              {savingSystem ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: "#fff" }} />{text.saving}</> : copy.save}
            </button>
            <button type="button" onClick={resetSystemForm} style={{ padding: ".55rem 1.1rem", borderRadius: 8, border: "1px solid var(--border-default,#e5e7eb)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: ".875rem", color: "var(--text-secondary)" }}>{text.reset}</button>
            <button type="button" onClick={() => void handleSaveNotificationRules()} disabled={savingNotificationRules || !notificationRulesChanged} style={{ padding: ".55rem 1.1rem", borderRadius: 8, border: "1px solid var(--border-default,#e5e7eb)", background: "transparent", cursor: notificationRulesChanged ? "pointer" : "not-allowed", fontWeight: 600, fontSize: ".875rem", color: notificationRulesChanged ? "var(--orange-600,#ea580c)" : "var(--text-secondary)", opacity: notificationRulesChanged ? 1 : .6 }}>
              {savingNotificationRules ? text.saving : locale === "ar" ? "حفظ قواعد الإشعارات" : "Save notification rules"}
            </button>
          </div>
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder={locale === "ar" ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="auth-input"
                style={{ width: 220, paddingLeft: "1rem" }}
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="auth-input"
                style={{ width: 140, paddingLeft: "1rem" }}
              >
                <option value="ALL">{locale === "ar" ? "جميع الأدوار" : "All Roles"}</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <span style={{ fontSize: ".82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {filteredUsers.length} {locale === "ar" ? "مستخدم" : "users"}
              </span>
            </div>
            <button
              type="button"
              onClick={openAddUser}
              style={{ padding: ".5rem 1.25rem", borderRadius: 8, background: "var(--orange-500,#f97316)", color: "#fff", border: "none", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(249,115,22,.3)" }}
            >
              + {locale === "ar" ? "إضافة مستخدم" : "Add User"}
            </button>
          </div>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "1rem" }}>
            {ROLES.map((role) => {
              const count = users.filter((u) => u.role === role).length;
              return (
                <div key={role} style={{ background: roleColor(role), borderRadius: 12, padding: "1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".25rem", boxShadow: "0 4px 14px rgba(0,0,0,.1)" }}>
                  <p style={{ margin: 0, fontSize: ".72rem", opacity: .85, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{role}</p>
                  <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>{count}</p>
                </div>
              );
            })}
          </div>

          {/* Status feedback */}
          {statusMessage && (
            <div style={{ padding: ".65rem 1rem", borderRadius: 8, background: statusTone === "error" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: statusTone === "error" ? "#dc2626" : "#16a34a", fontSize: ".85rem", fontWeight: 500 }}>
              {statusMessage}
            </div>
          )}

          {/* Users table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden" }}>
            {loadingUsers ? (
              <div style={{ padding: "2rem", textAlign: "center" }}><span className="spinner" style={{ margin: "0 auto" }} /></div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{locale === "ar" ? "الاسم" : "Name"}</th>
                      <th>{locale === "ar" ? "اسم المستخدم" : "Username"}</th>
                      <th>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                      <th>{locale === "ar" ? "الدور" : "Role"}</th>
                      <th>{locale === "ar" ? "الهاتف" : "Phone"}</th>
                      <th>{locale === "ar" ? "تاريخ الإنشاء" : "Created"}</th>
                      <th>{locale === "ar" ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>{locale === "ar" ? "لا توجد نتائج" : "No users found"}</td></tr>
                    ) : filteredUsers.map((u, i) => (
                      <tr key={u.id}>
                        <td style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{i + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: roleColor(u.role), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: ".8rem", flexShrink: 0, overflow: "hidden" }}>
                              {u.profileImage ? <img src={u.profileImage.startsWith("http") ? u.profileImage : `${API_BASE_URL}/${u.profileImage.replace(/^prisma\/?/, "")}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{u.username}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>{u.email}</td>
                        <td>
                          <span style={{ padding: ".2rem .65rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: `rgba(0,0,0,.07)`, color: "var(--text-primary)" }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>{u.phone ?? "—"}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: ".8rem", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: ".4rem" }}>
                            <button type="button" onClick={() => openEditUser(u)} style={{ padding: ".3rem .75rem", borderRadius: 7, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: ".78rem" }}>
                              {locale === "ar" ? "تعديل" : "Edit"}
                            </button>
                            <button type="button" onClick={() => setDeleteConfirmId(u.id)} style={{ padding: ".3rem .75rem", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: ".78rem" }}>
                              {locale === "ar" ? "حذف" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT USER MODAL ─── */}
      {userModal && (
        <div role="dialog" aria-modal="true" onClick={() => setUserModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "1.1rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
              {userModal === "add" ? (locale === "ar" ? "إضافة مستخدم جديد" : "Add New User") : (locale === "ar" ? "تعديل المستخدم" : "Edit User")}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: ".75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                {locale === "ar" ? "الاسم الكامل *" : "Full Name *"}
                <input className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.fullName} onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="John Doe" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                {locale === "ar" ? "اسم المستخدم" : "Username"}
                <input className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.username} onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))} placeholder="johndoe" disabled={userModal === "edit"} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, gridColumn: "1/-1" }}>
                {locale === "ar" ? "البريد الإلكتروني *" : "Email *"}
                <input type="email" className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@company.com" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                {locale === "ar" ? "رقم الهاتف" : "Phone"}
                <input className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+966..." />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                {locale === "ar" ? "الدور" : "Role"}
                <select className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              {userModal === "add" && (
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                  {locale === "ar" ? "رقم الهوية" : "National ID"}
                  <input className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.nationalId} onChange={(e) => setUserForm((p) => ({ ...p, nationalId: e.target.value }))} placeholder="1234567890" />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, gridColumn: userModal === "add" ? "2/-1" : "1/-1" }}>
                {locale === "ar" ? (userModal === "add" ? "كلمة المرور *" : "كلمة المرور الجديدة (اختياري)") : (userModal === "add" ? "Password *" : "New Password (optional)")}
                <input type="password" className="auth-input" style={{ paddingLeft: "1rem" }} value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
              </label>
            </div>

            {userFormError && (
              <div style={{ padding: ".6rem 1rem", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#dc2626", fontSize: ".83rem", fontWeight: 600 }}>
                {userFormError}
              </div>
            )}

            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setUserModal(null)} style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" onClick={() => void handleSaveUser()} disabled={userFormSaving} style={{ padding: ".5rem 1.5rem", borderRadius: 8, background: "var(--orange-500,#f97316)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: userFormSaving ? .7 : 1 }}>
                {userFormSaving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteConfirmId !== null && (
        <div role="dialog" aria-modal="true" onClick={() => setDeleteConfirmId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto .75rem", fontSize: "1.5rem" }}>🗑️</div>
              <h3 style={{ margin: "0 0 .4rem", fontSize: "1.05rem", fontWeight: 800 }}>
                {locale === "ar" ? "حذف المستخدم؟" : "Delete User?"}
              </h3>
              <p style={{ margin: 0, fontSize: ".85rem", color: "var(--text-secondary)" }}>
                {locale === "ar" ? "لا يمكن التراجع عن هذا الإجراء." : "This action cannot be undone."}
              </p>
            </div>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button type="button" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: ".5rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" onClick={() => void handleDeleteUser(deleteConfirmId)} style={{ flex: 1, padding: ".5rem", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                {locale === "ar" ? "نعم، احذف" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
