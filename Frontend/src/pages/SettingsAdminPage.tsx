import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useLocale } from "../context/LocaleContext";
import { UserAvatarBadge } from "../components/UserAvatarBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { createUserSocket } from "../lib/socket";

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
  | "snapshots"
  | "trend"
  | "production"
  | "system"
  | "kaizen";

const settingsTabValues: SettingsTab[] = [
  "overview",
  "trend",
  "production",
  "system",
  "kaizen",
];

const isSettingsTab = (value: string | null): value is SettingsTab =>
  value !== null && settingsTabValues.includes(value as SettingsTab);

type AdminKaizenSuggestion = {
  id: number;
  user_id: number;
  worker_name: string;
  title: string;
  details: string;
  estimated_impact: string | null;
  review_status: "PENDING" | "APPROVED" | "REJECTED";
  review_note: string | null;
  score: number;
  reward_points: number;
  created_at: string;
};

type KaizenReviewDraft = {
  score: string;
  rewardPoints: string;
  reviewNote: string;
};

type OpsSnapshot = {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
  machineCounterImage: string | null;
  electricityImage: string | null;
};

type SnapshotTrendPoint = {
  bucket: string;
  avgMachineCounter: number;
  avgElectricityKwh: number;
  snapshotsCount: number;
};

type SnapshotImagePreview = {
  src: string;
  alt: string;
};

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

const toIsoStartOfDay = (dateValue: string) => {
  if (!dateValue) {
    return "";
  }

  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

const toIsoEndOfDay = (dateValue: string) => {
  if (!dateValue) {
    return "";
  }

  const parsed = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

const downloadCsv = (filename: string, header: string[], rows: string[][]) => {
  const escapeCsv = (value: string) => {
    const safe = value.replace(/"/g, '""');
    return `"${safe}"`;
  };

  const csv = [header, ...rows]
    .map((line) => line.map((item) => escapeCsv(item)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
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
  const [snapshots, setSnapshots] = useState<OpsSnapshot[]>([]);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [trendRange, setTrendRange] = useState<"daily" | "weekly">("daily");
  const [snapshotTrend, setSnapshotTrend] = useState<SnapshotTrendPoint[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [snapshotFromDate, setSnapshotFromDate] = useState("");
  const [snapshotToDate, setSnapshotToDate] = useState("");
  const [previewImage, setPreviewImage] = useState<SnapshotImagePreview | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [kaizenSuggestions, setKaizenSuggestions] = useState<
    AdminKaizenSuggestion[]
  >([]);
  const [kaizenDrafts, setKaizenDrafts] = useState<
    Record<number, KaizenReviewDraft>
  >({});
  const [kaizenFilter, setKaizenFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [loadingKaizen, setLoadingKaizen] = useState(false);

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
            snapshotTitle: "لقطة التشغيل",
            snapshotSubtitle:
              "سجّل قراءة عداد الماكينة والكهرباء مع ملاحظات المناوبة.",
            machineLabel: "اسم/رمز الماكينة",
            machineCounter: "قراءة عداد الماكينة",
            electricityKwh: "قراءة الكهرباء (kWh)",
            notes: "ملاحظات",
            takeSnapshot: "حفظ اللقطة",
            snapshotSaved: "تم حفظ اللقطة بنجاح",
            snapshotInvalid: "أدخل اسم ماكينة وقيم رقمية صحيحة.",
            latestSnapshots: "آخر اللقطات",
            deltaFromPrevious: "الفرق عن السابقة",
            exportLatest: "تصدير أحدث لقطة",
            noSnapshots: "لا توجد لقطات بعد.",
            presetBalanced: "تطبيق إعداد متوازن",
            presetStrict: "تطبيق إعداد صارم",
            presetRelaxed: "تطبيق إعداد مرن",
            machineCounterImage: "صورة عداد الماكينة",
            electricityImage: "صورة العداد الكهربائي",
            dailyTrend: "اتجاه يومي",
            weeklyTrend: "اتجاه أسبوعي",
            trendTitle: "تحليل اتجاه القراءات",
            trendEmpty: "لا توجد بيانات كافية للرسم البياني.",
            fromDate: "من تاريخ",
            toDate: "إلى تاريخ",
            applyFilter: "تطبيق الفلترة",
            clearFilter: "مسح الفلترة",
            exportReadingsCsv: "تصدير CSV للقراءات",
            exportTrendCsv: "تصدير CSV للترند",
            closePreview: "إغلاق المعاينة",
            tabOverview: "نظرة عامة",
            tabSnapshots: "اللقطات",
            tabTrend: "الاتجاه",
            tabProduction: "الإنتاج",
            tabSystem: "النظام",
            tabKaizen: "كايزن",
            electricityStandalone: "صفحة الكهرباء",
            kaizenTitle: "مراجعة اقتراحات Kaizen",
            kaizenFilter: "فلتر الحالة",
            kaizenApprove: "اعتماد",
            kaizenReject: "رفض",
            kaizenWorker: "العامل",
            kaizenStatus: "الحالة",
            kaizenScore: "التقييم",
            kaizenReward: "النقاط",
            kaizenImpact: "الأثر المتوقع",
            kaizenCreatedAt: "تاريخ الإنشاء",
            kaizenActions: "الإجراء",
            kaizenNote: "ملاحظة المراجع",
            kaizenNoItems: "لا توجد اقتراحات حالياً",
            kaizenReviewed: "تمت مراجعة الاقتراح",
            kaizenLoadError: "تعذر تحميل اقتراحات Kaizen",
            electricityReportTitle: "تقرير الكهرباء والتكلفة",
            totalReadings: "إجمالي القراءات",
            totalKwh: "إجمالي kWh",
            totalCost: "إجمالي التكلفة",
            avgKwhPerReading: "متوسط kWh لكل قراءة",
            reportDay: "اليوم",
            reportKwh: "kWh",
            reportCost: "التكلفة",
            exportCostReportCsv: "تصدير CSV للتكلفة",
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
            snapshotTitle: "Operational Snapshot",
            snapshotSubtitle:
              "Capture machine counter and electricity readings with shift notes.",
            machineLabel: "Machine name/code",
            machineCounter: "Machine counter reading",
            electricityKwh: "Electricity reading (kWh)",
            notes: "Notes",
            takeSnapshot: "Save snapshot",
            snapshotSaved: "Snapshot saved successfully",
            snapshotInvalid: "Enter a machine name and valid numeric readings.",
            latestSnapshots: "Latest snapshots",
            deltaFromPrevious: "Delta from previous",
            exportLatest: "Export latest snapshot",
            noSnapshots: "No snapshots yet.",
            presetBalanced: "Apply balanced preset",
            presetStrict: "Apply strict preset",
            presetRelaxed: "Apply relaxed preset",
            machineCounterImage: "Machine counter image",
            electricityImage: "Electric meter image",
            dailyTrend: "Daily trend",
            weeklyTrend: "Weekly trend",
            trendTitle: "Reading Trend Analysis",
            trendEmpty: "No enough data for chart rendering.",
            fromDate: "From date",
            toDate: "To date",
            applyFilter: "Apply filter",
            clearFilter: "Clear filter",
            exportReadingsCsv: "Export readings CSV",
            exportTrendCsv: "Export trend CSV",
            closePreview: "Close preview",
            tabOverview: "Overview",
            tabSnapshots: "Snapshots",
            tabTrend: "Trend",
            tabProduction: "Production",
            tabSystem: "System",
            tabKaizen: "Kaizen",
            electricityStandalone: "Electricity page",
            kaizenTitle: "Kaizen Suggestions Review",
            kaizenFilter: "Status filter",
            kaizenApprove: "Approve",
            kaizenReject: "Reject",
            kaizenWorker: "Worker",
            kaizenStatus: "Status",
            kaizenScore: "Score",
            kaizenReward: "Reward points",
            kaizenImpact: "Estimated impact",
            kaizenCreatedAt: "Created at",
            kaizenActions: "Actions",
            kaizenNote: "Review note",
            kaizenNoItems: "No suggestions found",
            kaizenReviewed: "Suggestion reviewed successfully",
            kaizenLoadError: "Failed to load Kaizen suggestions",
            electricityReportTitle: "Electricity Cost Report",
            totalReadings: "Total readings",
            totalKwh: "Total kWh",
            totalCost: "Total cost",
            avgKwhPerReading: "Avg kWh per reading",
            reportDay: "Day",
            reportKwh: "kWh",
            reportCost: "Cost",
            exportCostReportCsv: "Export cost CSV",
          },
    [locale],
  );

  const getProductTypeLabel = (type: "CAPS" | "PREFORM") =>
    copy.admin.productTypeLabels[type] ?? type;
  const getAuditFrequencyLabel = (value: "DAILY" | "WEEKLY" | "MONTHLY") =>
    copy.admin.auditFrequencyLabels[value] ?? value;

  const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "overview", label: text.tabOverview },
    { id: "trend", label: text.tabTrend },
    { id: "production", label: text.tabProduction },
    { id: "system", label: text.tabSystem },
    { id: "kaizen", label: text.tabKaizen },
  ];

  const normalizeSnapshotImagePath = (value: string | null) => {
    if (!value) {
      return null;
    }

    if (value.startsWith("http")) {
      return value;
    }

    return `${API_BASE_URL}/${value.replace(/^prisma\/?pictures\//, "pictures/")}`;
  };

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

  const loadSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      const fromIso = toIsoStartOfDay(snapshotFromDate);
      const toIso = toIsoEndOfDay(snapshotToDate);

      if (fromIso) {
        params.set("from", fromIso);
      }

      if (toIso) {
        params.set("to", toIso);
      }

      const response = await fetchWithAdminAuth(
        `/settings/snapshots?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as OpsSnapshot[];
      setSnapshots(data);
    } catch (loadError) {
      setSnapshotMessage(
        loadError instanceof Error ? loadError.message : text.snapshotInvalid,
      );
    } finally {
      setLoadingSnapshots(false);
    }
  }, [snapshotFromDate, snapshotToDate, text.snapshotInvalid]);

  const loadSnapshotTrend = useCallback(
    async (range: "daily" | "weekly") => {
      setLoadingTrend(true);
      try {
        const params = new URLSearchParams({
          range,
          limit: range === "weekly" ? "12" : "14",
        });
        const fromIso = toIsoStartOfDay(snapshotFromDate);
        const toIso = toIsoEndOfDay(snapshotToDate);

        if (fromIso) {
          params.set("from", fromIso);
        }

        if (toIso) {
          params.set("to", toIso);
        }

        const response = await fetchWithAdminAuth(
          `/settings/snapshots/trend?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        const data = (await response.json()) as SnapshotTrendPoint[];
        setSnapshotTrend(data);
      } catch {
        setSnapshotTrend([]);
      } finally {
        setLoadingTrend(false);
      }
    },
    [snapshotFromDate, snapshotToDate],
  );

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    void loadSnapshotTrend(trendRange);
  }, [loadSnapshotTrend, trendRange]);

  useEffect(() => {
    if (snapshotFromDate || snapshotToDate) {
      return;
    }

    void Promise.all([loadSnapshots(), loadSnapshotTrend(trendRange)]);
  }, [
    loadSnapshotTrend,
    loadSnapshots,
    snapshotFromDate,
    snapshotToDate,
    trendRange,
  ]);

  const loadKaizenSuggestions = useCallback(async () => {
    setLoadingKaizen(true);
    try {
      const params = new URLSearchParams();
      if (kaizenFilter !== "ALL") {
        params.set("reviewStatus", kaizenFilter);
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const response = await fetchWithAdminAuth(
        `/worker-tools/admin/kaizen${suffix}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as AdminKaizenSuggestion[];
      setKaizenSuggestions(data);
      setKaizenDrafts((prev) => {
        const next = { ...prev };
        data.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = {
              score: String(item.score ?? 0),
              rewardPoints: String(item.reward_points ?? 0),
              reviewNote: item.review_note ?? "",
            };
          }
        });
        return next;
      });
    } catch (loadError) {
      setStatusTone("error");
      setStatusMessage(
        loadError instanceof Error ? loadError.message : text.kaizenLoadError,
      );
    } finally {
      setLoadingKaizen(false);
    }
  }, [kaizenFilter, text.kaizenLoadError]);

  useEffect(() => {
    if (activeTab !== "kaizen") {
      return;
    }

    void loadKaizenSuggestions();
  }, [activeTab, loadKaizenSuggestions]);

  useEffect(() => {
    const socket = createUserSocket();
    if (!socket) {
      return;
    }

    const refreshKaizen = () => {
      if (activeTab === "kaizen") {
        void loadKaizenSuggestions();
      }
    };

    socket.on("notification:new", refreshKaizen);

    return () => {
      socket.off("notification:new", refreshKaizen);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [activeTab, loadKaizenSuggestions]);

  const handleReviewKaizen = async (
    suggestionId: number,
    reviewStatus: "APPROVED" | "REJECTED",
  ) => {
    const draft = kaizenDrafts[suggestionId] ?? {
      score: "0",
      rewardPoints: reviewStatus === "APPROVED" ? "20" : "0",
      reviewNote: "",
    };

    try {
      const response = await fetchWithAdminAuth(
        `/worker-tools/admin/kaizen/${suggestionId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewStatus,
            score: Number(draft.score || "0"),
            rewardPoints: Number(draft.rewardPoints || "0"),
            reviewNote: draft.reviewNote,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setStatusTone("success");
      setStatusMessage(text.kaizenReviewed);
      await loadKaizenSuggestions();
    } catch (reviewError) {
      setStatusTone("error");
      setStatusMessage(
        reviewError instanceof Error
          ? reviewError.message
          : text.kaizenLoadError,
      );
    }
  };

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

  const latestSnapshot = snapshots[0] ?? null;
  const previousSnapshot = snapshots[1] ?? null;

  const deltaValues = useMemo(() => {
    if (!latestSnapshot || !previousSnapshot) {
      return null;
    }
    return {
      machineCounter:
        latestSnapshot.machineCounter - previousSnapshot.machineCounter,
      electricityKwh:
        latestSnapshot.electricityKwh - previousSnapshot.electricityKwh,
    };
  }, [latestSnapshot, previousSnapshot]);

  const trendChartData = useMemo(() => {
    if (!snapshotTrend.length) {
      return [];
    }

    const maxCounter = Math.max(
      ...snapshotTrend.map((item) => item.avgMachineCounter),
      1,
    );
    const maxElectricity = Math.max(
      ...snapshotTrend.map((item) => item.avgElectricityKwh),
      1,
    );

    return snapshotTrend.map((item) => ({
      ...item,
      counterPercent: Math.max(8, (item.avgMachineCounter / maxCounter) * 100),
      electricityPercent: Math.max(
        8,
        (item.avgElectricityKwh / maxElectricity) * 100,
      ),
    }));
  }, [snapshotTrend]);

  const exportLatestSnapshot = () => {
    if (!latestSnapshot) {
      return;
    }
    const blob = new Blob([JSON.stringify(latestSnapshot, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `ops-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const exportReadingsCsv = () => {
    const rows = snapshots.map((item) => [
      String(item.id),
      item.machineLabel,
      String(item.machineCounter),
      item.electricityKwh.toFixed(2),
      item.notes ?? "",
      item.createdAt,
      item.machineCounterImage ?? "",
      item.electricityImage ?? "",
    ]);

    downloadCsv(
      `settings-readings-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "id",
        "machineLabel",
        "machineCounter",
        "electricityKwh",
        "notes",
        "createdAt",
        "machineCounterImage",
        "electricityImage",
      ],
      rows,
    );
  };

  const exportTrendCsv = () => {
    const rows = snapshotTrend.map((item) => [
      item.bucket,
      item.avgMachineCounter.toFixed(2),
      item.avgElectricityKwh.toFixed(2),
      String(item.snapshotsCount),
    ]);

    downloadCsv(
      `settings-trend-${trendRange}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["bucket", "avgMachineCounter", "avgElectricityKwh", "snapshotsCount"],
      rows,
    );
  };

  const applySnapshotFilter = () => {
    void Promise.all([loadSnapshots(), loadSnapshotTrend(trendRange)]);
  };

  const clearSnapshotFilter = () => {
    setSnapshotFromDate("");
    setSnapshotToDate("");
  };

  const productionConfiguredCount = productionTypes.filter((type) =>
    Boolean(productionLookup.get(type)),
  ).length;

  const productionHealthPercent = Math.round(
    (productionConfiguredCount / productionTypes.length) * 100,
  );

  const systemHealthPercent = systemSetting ? 100 : 0;

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{text.title}</h1>
          </div>
          <div className="admin-header__actions">
            <UserAvatarBadge size="sm" />
          </div>
        </header>

        <section className="admin-section">
          <div className="settings-hero">
            <div>
              <h2>{text.title}</h2>
              <p>{text.heroSubtitle}</p>
            </div>
            <div className="settings-hero__chips">
              <span className="settings-chip">
                {text.productionHealth}: {productionHealthPercent}%
              </span>
              <span className="settings-chip">
                {text.systemHealth}: {systemHealthPercent}%
              </span>
              <span className="settings-chip">{text.heroTips}: 3</span>
            </div>
          </div>
          <div className="settings-tab-row">
            <div
              className="settings-tab-list"
              role="tablist"
              aria-label={text.title}
            >
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`auth-button settings-tab-btn ${
                    activeTab === tab.id ? "" : "auth-button--ghost"
                  }`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "overview") {
                      setSearchParams({}, { replace: true });
                      return;
                    }

                    setSearchParams({ tab: tab.id }, { replace: true });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {activeTab === "overview" ? (
            <>
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
                    {overview?.productionSettingsCount ??
                      productionSettings.length}
                  </p>
                  <p className="admin-kpi-card__status">
                    {overview?.productionSettingsCount ||
                    productionSettings.length
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
                  <p className="admin-kpi-card__label">
                    {copy.admin.systemTab}
                  </p>
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
            </>
          ) : null}
        </section>

        {activeTab === "snapshots" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <div>
                <h2>{text.snapshotTitle}</h2>
                <p className="admin-muted">{text.snapshotSubtitle}</p>
              </div>
              <div className="settings-export-actions">
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  dir="ltr"
                  onClick={exportLatestSnapshot}
                  disabled={!latestSnapshot}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {text.exportLatest}
                </button>
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  dir="ltr"
                  onClick={exportReadingsCsv}
                  disabled={!snapshots.length}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {text.exportReadingsCsv}
                </button>
              </div>
            </div>

            <div className="admin-filter-bar settings-snapshot-filter-bar">
              <label>
                {text.fromDate}
                <input
                  type="date"
                  value={snapshotFromDate}
                  onChange={(event) => setSnapshotFromDate(event.target.value)}
                />
              </label>
              <label>
                {text.toDate}
                <input
                  type="date"
                  value={snapshotToDate}
                  onChange={(event) => setSnapshotToDate(event.target.value)}
                />
              </label>
              <div className="settings-filter-actions">
                <button
                  type="button"
                  className="auth-button"
                  onClick={applySnapshotFilter}
                >
                  {text.applyFilter}
                </button>
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={clearSnapshotFilter}
                >
                  {text.clearFilter}
                </button>
              </div>
            </div>

            <div className="settings-snapshot-layout">
              <div className="admin-panel settings-snapshot-panel">
                <h3>{locale === "ar" ? "عرض المشغّل" : "Worker Feed"}</h3>
                <p className="admin-muted">
                  {locale === "ar"
                    ? "إدخال القراءات تم نقله إلى واجهة العامل. هذه الشاشة مخصصة لك كمشرف للمراجعة والتدقيق فقط."
                    : "Recording has been moved to worker interface. This panel is now admin view-only for monitoring and audits."}
                </p>
                {snapshotMessage ? (
                  <p className="admin-muted">{snapshotMessage}</p>
                ) : null}
              </div>

              <aside className="admin-panel settings-snapshot-panel">
                <h3>{text.latestSnapshots}</h3>
                {deltaValues ? (
                  <p className="admin-muted">
                    {text.deltaFromPrevious}: {text.machineCounter}{" "}
                    {deltaValues.machineCounter >= 0 ? "+" : ""}
                    {deltaValues.machineCounter} | {text.electricityKwh}{" "}
                    {deltaValues.electricityKwh >= 0 ? "+" : ""}
                    {deltaValues.electricityKwh.toFixed(2)}
                  </p>
                ) : null}
                <div className="settings-snapshot-list">
                  {loadingSnapshots ? (
                    <p className="admin-muted">{text.loading}</p>
                  ) : snapshots.length ? (
                    snapshots.slice(0, 6).map((item) => (
                      <article className="settings-snapshot-item" key={item.id}>
                        <strong>{item.machineLabel}</strong>
                        <p>
                          {text.machineCounter}: {item.machineCounter}
                        </p>
                        <p>
                          {text.electricityKwh}:{" "}
                          {item.electricityKwh.toFixed(2)}
                        </p>
                        {item.notes ? <p>{item.notes}</p> : null}
                        <div className="settings-snapshot-images">
                          {item.machineCounterImage ? (
                            <button
                              type="button"
                              className="settings-snapshot-image-btn"
                              onClick={() => {
                                const src = normalizeSnapshotImagePath(
                                  item.machineCounterImage,
                                );
                                if (!src) {
                                  return;
                                }
                                setPreviewImage({
                                  src,
                                  alt: text.machineCounterImage,
                                });
                              }}
                            >
                              <img
                                src={
                                  normalizeSnapshotImagePath(
                                    item.machineCounterImage,
                                  ) ?? ""
                                }
                                alt={text.machineCounterImage}
                              />
                            </button>
                          ) : null}
                          {item.electricityImage ? (
                            <button
                              type="button"
                              className="settings-snapshot-image-btn"
                              onClick={() => {
                                const src = normalizeSnapshotImagePath(
                                  item.electricityImage,
                                );
                                if (!src) {
                                  return;
                                }
                                setPreviewImage({
                                  src,
                                  alt: text.electricityImage,
                                });
                              }}
                            >
                              <img
                                src={
                                  normalizeSnapshotImagePath(
                                    item.electricityImage,
                                  ) ?? ""
                                }
                                alt={text.electricityImage}
                              />
                            </button>
                          ) : null}
                        </div>
                        <small>{formatDateTime(item.createdAt, locale)}</small>
                      </article>
                    ))
                  ) : (
                    <p className="admin-muted">{text.noSnapshots}</p>
                  )}
                </div>
              </aside>
            </div>
          </section>
        ) : null}

        {activeTab === "trend" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <div>
                <h2>{text.trendTitle}</h2>
                <p className="admin-muted">{text.snapshotSubtitle}</p>
              </div>
              <div className="settings-export-actions">
                <button
                  type="button"
                  className={`auth-button ${trendRange === "daily" ? "" : "auth-button--ghost"}`}
                  onClick={() => setTrendRange("daily")}
                >
                  {text.dailyTrend}
                </button>
                <button
                  type="button"
                  className={`auth-button ${trendRange === "weekly" ? "" : "auth-button--ghost"}`}
                  onClick={() => setTrendRange("weekly")}
                >
                  {text.weeklyTrend}
                </button>
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  dir="ltr"
                  onClick={exportTrendCsv}
                  disabled={!snapshotTrend.length}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {text.exportTrendCsv}
                </button>
              </div>
            </div>

            <div className="settings-trend-chart">
              {loadingTrend ? (
                <p className="admin-muted">{text.loading}</p>
              ) : trendChartData.length ? (
                trendChartData.map((point) => (
                  <div
                    className="settings-trend-row"
                    key={`${point.bucket}-${point.snapshotsCount}`}
                  >
                    <p className="settings-trend-row__label">
                      {new Intl.DateTimeFormat(
                        locale === "ar" ? "ar-EG" : "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      ).format(new Date(point.bucket))}
                    </p>
                    <div className="settings-trend-bar-wrap">
                      <div
                        className="settings-trend-bar settings-trend-bar--counter"
                        style={{ width: `${point.counterPercent}%` }}
                      />
                      <span>{point.avgMachineCounter.toFixed(1)}</span>
                    </div>
                    <div className="settings-trend-bar-wrap">
                      <div
                        className="settings-trend-bar settings-trend-bar--electricity"
                        style={{ width: `${point.electricityPercent}%` }}
                      />
                      <span>{point.avgElectricityKwh.toFixed(1)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="admin-muted">{text.trendEmpty}</p>
              )}
            </div>
          </section>
        ) : null}

        {previewImage ? (
          <div
            className="settings-image-modal"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="settings-image-modal__content"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => setPreviewImage(null)}
              >
                {text.closePreview}
              </button>
              <img src={previewImage.src} alt={previewImage.alt} />
            </div>
          </div>
        ) : null}

        {activeTab === "production" ? (
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
                          savingProductionType === type ||
                          !productionChangeMap[type]
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
        ) : null}

        {activeTab === "system" ? (
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
                <div className="settings-preset-row">
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() => applySystemPreset("BALANCED")}
                  >
                    {text.presetBalanced}
                  </button>
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() => applySystemPreset("STRICT")}
                  >
                    {text.presetStrict}
                  </button>
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() => applySystemPreset("RELAXED")}
                  >
                    {text.presetRelaxed}
                  </button>
                </div>
                <div className="settings-group-title">
                  {text.qualityGroupTitle}
                </div>
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
                          inventoryAuditFrequency: event.target
                            .value as FrequencyValue,
                        }))
                      }
                    >
                      <option value="DAILY">
                        {getAuditFrequencyLabel("DAILY")}
                      </option>
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

                <div className="settings-group-title">
                  {text.reportingGroupTitle}
                </div>
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

                <div className="settings-group-title">
                  {locale === "ar"
                    ? "قواعد الإشعارات الأوتوماتيكية"
                    : "Automatic Notification Rules"}
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{locale === "ar" ? "القاعدة" : "Rule"}</th>
                        <th>{locale === "ar" ? "مفعلة" : "Enabled"}</th>
                        <th>{locale === "ar" ? "الوصول" : "Delivery"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          [
                            "PRODUCTION_CREATED",
                            locale === "ar"
                              ? "عند إضافة إنتاج"
                              : "On production create",
                          ],
                          [
                            "PURCHASE_CREATED",
                            locale === "ar"
                              ? "عند إضافة شراء"
                              : "On purchase create",
                          ],
                          [
                            "SALE_CREATED",
                            locale === "ar"
                              ? "عند إضافة بيع"
                              : "On sale create",
                          ],
                          [
                            "INVENTORY_TRANSACTION_CREATED",
                            locale === "ar"
                              ? "عند حركة مخزون"
                              : "On inventory transaction",
                          ],
                        ] as Array<[NotificationRuleKey, string]>
                      ).map(([ruleKey, label]) => (
                        <tr key={ruleKey}>
                          <td>{label}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={notificationRules.rules[ruleKey].enabled}
                              onChange={(event) =>
                                updateNotificationRule(ruleKey, {
                                  enabled: event.target.checked,
                                })
                              }
                            />
                          </td>
                          <td>
                            <select
                              value={notificationRules.rules[ruleKey].delivery}
                              onChange={(event) =>
                                updateNotificationRule(ruleKey, {
                                  delivery: event.target
                                    .value as NotificationRuleDelivery,
                                })
                              }
                              disabled={
                                !notificationRules.rules[ruleKey].enabled
                              }
                            >
                              <option value="ADMIN_ONLY">
                                {locale === "ar" ? "الأدمن فقط" : "Admin only"}
                              </option>
                              <option value="ADMIN_AND_SHIFT">
                                {locale === "ar"
                                  ? "الأدمن + الشفت"
                                  : "Admin + shift"}
                              </option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="admin-panel settings-side-panel">
                <h3>{text.summaryPanelTitle}</h3>
                <p>{text.summaryPanelSubtitle}</p>
                <p>
                  {copy.admin.inventoryAuditFrequency}:{" "}
                  {getAuditFrequencyLabel(systemForm.inventoryAuditFrequency)}
                </p>
                <p>
                  {copy.admin.weeklyReportDayOfWeek}:{" "}
                  {systemForm.weeklyReportDayOfWeek} ·{" "}
                  {copy.admin.weeklyReportTime}: {systemForm.weeklyReportTime}
                </p>
                <p>
                  {copy.admin.monthlyReportDayOfMonth}:{" "}
                  {systemForm.monthlyReportDayOfMonth} ·{" "}
                  {copy.admin.monthlyReportTime}: {systemForm.monthlyReportTime}
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
              <button
                type="button"
                className="auth-button auth-button--ghost"
                disabled={savingNotificationRules || !notificationRulesChanged}
                onClick={() => void handleSaveNotificationRules()}
              >
                {savingNotificationRules
                  ? text.saving
                  : locale === "ar"
                    ? "حفظ قواعد الإشعارات"
                    : "Save notification rules"}
              </button>
            </div>
            {!systemHasChanges ? (
              <p className="admin-muted">{text.noChanges}</p>
            ) : null}
          </section>
        ) : null}

        {activeTab === "kaizen" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <div>
                <h2>{text.kaizenTitle}</h2>
                <p className="admin-muted">{text.kaizenFilter}</p>
              </div>
              <div className="settings-export-actions">
                <select
                  value={kaizenFilter}
                  onChange={(event) =>
                    setKaizenFilter(
                      event.target.value as
                        | "ALL"
                        | "PENDING"
                        | "APPROVED"
                        | "REJECTED",
                    )
                  }
                >
                  <option value="ALL">ALL</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={() => void loadKaizenSuggestions()}
                >
                  {copy.refresh}
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{text.kaizenWorker}</th>
                    <th>{text.kaizenTitle}</th>
                    <th>{text.kaizenImpact}</th>
                    <th>{text.kaizenStatus}</th>
                    <th>{text.kaizenScore}</th>
                    <th>{text.kaizenReward}</th>
                    <th>{text.kaizenCreatedAt}</th>
                    <th>{text.kaizenActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingKaizen ? (
                    <tr>
                      <td colSpan={8}>{text.loading}</td>
                    </tr>
                  ) : kaizenSuggestions.length ? (
                    kaizenSuggestions.map((item) => {
                      const draft = kaizenDrafts[item.id] ?? {
                        score: String(item.score ?? 0),
                        rewardPoints: String(item.reward_points ?? 0),
                        reviewNote: item.review_note ?? "",
                      };

                      return (
                        <tr key={item.id}>
                          <td>{item.worker_name}</td>
                          <td>
                            <strong>{item.title}</strong>
                            <div className="admin-muted">{item.details}</div>
                            {item.review_note ? (
                              <div className="admin-muted">
                                {text.kaizenNote}: {item.review_note}
                              </div>
                            ) : null}
                          </td>
                          <td>{item.estimated_impact || "-"}</td>
                          <td>{item.review_status}</td>
                          <td>
                            {item.review_status === "PENDING" ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={draft.score}
                                onChange={(event) =>
                                  setKaizenDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      score: event.target.value,
                                    },
                                  }))
                                }
                              />
                            ) : (
                              item.score
                            )}
                          </td>
                          <td>
                            {item.review_status === "PENDING" ? (
                              <input
                                type="number"
                                min={0}
                                value={draft.rewardPoints}
                                onChange={(event) =>
                                  setKaizenDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      rewardPoints: event.target.value,
                                    },
                                  }))
                                }
                              />
                            ) : (
                              item.reward_points
                            )}
                          </td>
                          <td>{formatDateTime(item.created_at, locale)}</td>
                          <td>
                            {item.review_status === "PENDING" ? (
                              <>
                                <textarea
                                  rows={2}
                                  value={draft.reviewNote}
                                  placeholder={text.kaizenNote}
                                  onChange={(event) =>
                                    setKaizenDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...draft,
                                        reviewNote: event.target.value,
                                      },
                                    }))
                                  }
                                />
                                <div className="admin-panel__actions">
                                  <button
                                    type="button"
                                    className="auth-button"
                                    onClick={() =>
                                      void handleReviewKaizen(
                                        item.id,
                                        "APPROVED",
                                      )
                                    }
                                  >
                                    {text.kaizenApprove}
                                  </button>
                                  <button
                                    type="button"
                                    className="auth-button auth-button--ghost"
                                    onClick={() =>
                                      void handleReviewKaizen(
                                        item.id,
                                        "REJECTED",
                                      )
                                    }
                                  >
                                    {text.kaizenReject}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="admin-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>{text.kaizenNoItems}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
