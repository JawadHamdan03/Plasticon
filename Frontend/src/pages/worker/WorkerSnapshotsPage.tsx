import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";
import { PhotoUploadButton } from "../../components/PhotoUploadButton";
import { API_BASE_URL, pictureUrl as globalPictureUrl, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { createUserSocket } from "../../lib/socket";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";

type WorkerSnapshot = {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
  machineCounterImage: string | null;
  electricityImage: string | null;
};

type SnapshotDraft = {
  machineLabel: string;
  machineCounter: string;
  electricityKwh: string;
  notes: string;
  machineCounterImage: File | null;
  electricityImage: File | null;
};

type ToolTab =
  | "stops"
  | "checklist"
  | "waste"
  | "target"
  | "kaizen"
  | "quality"
  | "micro"
  | "anomaly";

type WorkerPageMode = "snapshots" | "tools";

const defaultDraft: SnapshotDraft = {
  machineLabel: "",
  machineCounter: "",
  electricityKwh: "",
  notes: "",
  machineCounterImage: null,
  electricityImage: null,
};

function workerAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithWorkerAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...workerAuthHeader(),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

const normalizeSnapshotImagePath = (value: string | null) => {
  if (!value) {
    return null;
  }

  if (value.startsWith("http")) {
    return value;
  }

  return globalPictureUrl(value);
};

export function WorkerSnapshotsPage({
  mode = "snapshots",
}: {
  mode?: WorkerPageMode;
}) {
  const { locale } = useLocale();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const showSnapshots = mode === "snapshots";
  const showTools = mode === "tools";
  const requestedTab = searchParams.get("tab");

  const isToolTab = (value: string | null): value is ToolTab =>
    value === "stops" ||
    value === "checklist" ||
    value === "waste" ||
    value === "target" ||
    value === "kaizen" ||
    value === "quality" ||
    value === "micro" ||
    value === "anomaly";

  const text = useMemo(
    () => ({
      title: "لوحة العامل الذكية",
      subtitle:
        "كل أدوات العامل: القراءات، بلاغات التوقف، الجودة، الهدر، المهام، والتحسين.",
      machineLabel: "اسم/رمز الماكينة",
      machineCounter: "قراءة عداد الماكينة",
      electricityKwh: "قراءة الكهرباء (kWh)",
      notes: "ملاحظات الشفت",
      machineCounterImage: "صورة عداد الماكينة",
      electricityImage: "صورة العداد الكهربائي",
      submit: "تسجيل القراءة",
      refresh: "تحديث",
      clearFilters: "مسح الفلاتر",
      searchSnapshots: "بحث في القراءات",
      fromDate: "من تاريخ",
      toDate: "إلى تاريخ",
      edit: "تعديل",
      remove: "حذف",
      removeEntry: "حذف السجل",
      cancel: "إلغاء",
      saveChanges: "حفظ التغييرات",
      loading: "جارٍ التحميل...",
      noData: "لا توجد بيانات.",
      invalid: "تأكد من إدخال البيانات بشكل صحيح.",
      saved: "تم الحفظ بنجاح.",
      updated: "تم التعديل بنجاح.",
      deleted: "تم الحذف بنجاح.",
      deleteConfirm: "هل تريد حذف هذا السجل؟",
      profileTitle: "بطاقة العامل",
      progressLabel: "تقدم اليوم",
      summariesTitle: "ملخص القراءات",
      entriesLabel: "السجلات الظاهرة",
      totalElectricityLabel: "إجمالي الكهرباء",
      averageElectricityLabel: "متوسط الكهرباء",
      counterDeltaLabel: "فرق العداد",
      machinesLabel: "الماكينات الظاهرة",
      editHint:
        "يمكنك تعديل السجل أو حذفه بعد الإرسال مباشرة من القائمة.",
      toolsTitle: "أدوات تشغيل العامل",
    }),
    [],
  );

  const [draft, setDraft] = useState<SnapshotDraft>(defaultDraft);
  const [history, setHistory] = useState<WorkerSnapshot[]>([]);
  const [snapshotSearch, setSnapshotSearch] = useState("");
  const [snapshotFrom, setSnapshotFrom] = useState("");
  const [snapshotTo, setSnapshotTo] = useState("");
  const [editingSnapshotId, setEditingSnapshotId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "">("");
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [activeTool, setActiveTool] = useState<ToolTab>(
    isToolTab(requestedTab) ? requestedTab : "stops",
  );

  const [stopForm, setStopForm] = useState({
    machineLabel: "",
    priority: "NORMAL",
    reason: "",
  });
  const [stopLogs, setStopLogs] = useState<Array<Record<string, unknown>>>([]);

  const [checklistForm, setChecklistForm] = useState({
    shiftPhase: "START",
    tasksText: "Machine visual check\nSafety check\nMaterial ready",
    digitalSignature: "",
  });
  const [checklists, setChecklists] = useState<Array<Record<string, unknown>>>(
    [],
  );

  const [wasteForm, setWasteForm] = useState({
    machineLabel: "",
    machineType: "",
    materialType: "",
    wasteKg: "",
    reason: "",
  });
  const [wasteLogs, setWasteLogs] = useState<Array<Record<string, unknown>>>(
    [],
  );

  const [targetForm, setTargetForm] = useState({
    targetDate: new Date().toISOString().slice(0, 10),
    targetUnits: "",
    actualUnits: "",
    note: "",
  });
  const [targetLogs, setTargetLogs] = useState<Array<Record<string, unknown>>>(
    [],
  );

  const [kaizenForm, setKaizenForm] = useState({
    title: "",
    details: "",
    estimatedImpact: "",
  });
  const [kaizenLogs, setKaizenLogs] = useState<Array<Record<string, unknown>>>(
    [],
  );

  const [qualityForm, setQualityForm] = useState({
    batchCode: "",
    machineLabel: "",
    issueType: "",
    details: "",
    issueImage: null as File | null,
  });
  const [qualityLogs, setQualityLogs] = useState<
    Array<Record<string, unknown>>
  >([]);

  const [microForm, setMicroForm] = useState({
    machineLabel: "",
    reason: "",
    durationMinutes: "",
  });
  const [microLogs, setMicroLogs] = useState<Array<Record<string, unknown>>>(
    [],
  );

  const [anomalyForm, setAnomalyForm] = useState({
    machineLabel: "",
    currentKwh: "",
    thresholdRatio: "1.3",
  });
  const [anomalyLogs, setAnomalyLogs] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [toolsApiUnavailable, setToolsApiUnavailable] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (snapshotFrom) {
        params.set("from", snapshotFrom);
      }
      if (snapshotTo) {
        params.set("to", snapshotTo);
      }

      const response = await fetchWithWorkerAuth(
        `/settings/snapshots/mine?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as WorkerSnapshot[];
      setHistory(data);
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.invalid);
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }, [snapshotFrom, snapshotTo, text.invalid]);

  const loadWorkerTools = useCallback(async () => {
    if (toolsApiUnavailable) {
      return;
    }

    const endpoints = [
      ["/worker-tools/machine-stop-alerts/mine", setStopLogs],
      ["/worker-tools/shift-checklists/mine", setChecklists],
      ["/worker-tools/material-waste/mine", setWasteLogs],
      ["/worker-tools/daily-targets/mine", setTargetLogs],
      ["/worker-tools/kaizen/mine", setKaizenLogs],
      ["/worker-tools/quality-issues/mine", setQualityLogs],
      ["/worker-tools/micro-stops/mine", setMicroLogs],
      ["/worker-tools/electricity-anomaly-alerts/mine", setAnomalyLogs],
    ] as const;

    await Promise.all(
      endpoints.map(async ([path, setter]) => {
        const response = await fetchWithWorkerAuth(path);
        if (response.status === 404) {
          setToolsApiUnavailable(true);
          setMessageTone("error");
          setMessage(
            locale === "ar"
              ? "خدمة أدوات العامل غير متاحة حاليا على الخادم."
              : "Worker tools service is currently unavailable on the server.",
          );
          return;
        }
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as Array<Record<string, unknown>>;
        setter(data);
      }),
    );
  }, [locale, toolsApiUnavailable]);

  useEffect(() => {
    if (showSnapshots) {
      void loadHistory();
    }
    if (showTools) {
      void loadWorkerTools();
    }
  }, [loadHistory, loadWorkerTools, showSnapshots, showTools]);

  useEffect(() => {
    if (isToolTab(requestedTab)) {
      setActiveTool(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    const socket = createUserSocket();
    if (!socket) {
      return;
    }

    const refreshData = () => {
      if (showTools) {
        void loadWorkerTools();
      }
      if (showSnapshots) {
        void loadHistory();
      }
    };

    socket.on("notification:new", refreshData);

    return () => {
      socket.off("notification:new", refreshData);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [loadHistory, loadWorkerTools, showSnapshots, showTools]);

  const handleSnapshotSubmit = async () => {
    const machineLabel = draft.machineLabel.trim();
    const machineCounter = Number(draft.machineCounter);
    const electricityKwh = Number(draft.electricityKwh);

    if (
      !machineLabel ||
      !Number.isFinite(machineCounter) ||
      machineCounter < 0 ||
      !Number.isFinite(electricityKwh) ||
      electricityKwh < 0
    ) {
      setMessageTone("error");
      setMessage(text.invalid);
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("machineLabel", machineLabel);
      formData.append("machineCounter", String(machineCounter));
      formData.append("electricityKwh", String(electricityKwh));
      formData.append("notes", draft.notes.trim());

      if (draft.machineCounterImage) {
        formData.append("machineCounterImage", draft.machineCounterImage);
      }

      if (draft.electricityImage) {
        formData.append("electricityImage", draft.electricityImage);
      }

      const isEditing = editingSnapshotId !== null;
      const response = await fetchWithWorkerAuth(
        isEditing
          ? `/settings/snapshots/${editingSnapshotId}`
          : "/settings/snapshots",
        {
          method: isEditing ? "PUT" : "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      if (showTools) {
        await fetchWithWorkerAuth("/worker-tools/electricity-anomaly-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            machineLabel,
            currentKwh: electricityKwh,
            thresholdRatio: Number(anomalyForm.thresholdRatio || 1.3),
          }),
        });
      }

      setDraft(defaultDraft);
      setEditingSnapshotId(null);
      setMessageTone("success");
      setMessage(isEditing ? text.updated : text.saved);
      await Promise.all([loadHistory(), loadWorkerTools()]);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : text.invalid);
    } finally {
      setSaving(false);
    }
  };

  const beginSnapshotEdit = (item: WorkerSnapshot) => {
    setEditingSnapshotId(item.id);
    setDraft({
      machineLabel: item.machineLabel,
      machineCounter: String(item.machineCounter),
      electricityKwh: String(item.electricityKwh),
      notes: item.notes ?? "",
      machineCounterImage: null,
      electricityImage: null,
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSnapshotEdit = () => {
    setEditingSnapshotId(null);
    setDraft(defaultDraft);
    setMessage("");
  };

  const deleteSnapshot = async (item: WorkerSnapshot) => {
    const confirmed = await confirmDialog(
      `حذف قراءة ${item.machineLabel}؟`,
      { danger: true, confirmText: "حذف" },
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    try {
      const response = await fetchWithWorkerAuth(
        `/settings/snapshots/${item.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      if (editingSnapshotId === item.id) {
        cancelSnapshotEdit();
      }

      setMessageTone("success");
      setMessage(text.deleted);
      await loadHistory();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : text.invalid);
    } finally {
      setSaving(false);
    }
  };

  const deleteToolLog = async (entryIdRaw: unknown) => {
    const entryId = Number(entryIdRaw);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return;
    }

    const confirmed = await confirmDialog(text.deleteConfirm, { danger: true });
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    try {
      const response = await fetchWithWorkerAuth(
        `/worker-tools/entries/${activeTool}/${entryId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMessageTone("success");
      setMessage(text.deleted);
      await loadWorkerTools();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : text.invalid);
    } finally {
      setSaving(false);
    }
  };

  const postJson = async (path: string, body: Record<string, unknown>) => {
    const response = await fetchWithWorkerAuth(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
  };

  const submitStopAlert = async () => {
    await postJson("/worker-tools/machine-stop-alerts", stopForm);
    setStopForm({ machineLabel: "", priority: "NORMAL", reason: "" });
    await loadWorkerTools();
  };

  const resolveStopAlert = async (id: number) => {
    const response = await fetchWithWorkerAuth(
      `/worker-tools/machine-stop-alerts/${id}/resolve`,
      { method: "PATCH" },
    );

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    await loadWorkerTools();
  };

  const submitChecklist = async () => {
    const tasks = checklistForm.tasksText
      .split(/\r?\n/)
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({ label, done: true }));

    await postJson("/worker-tools/shift-checklists", {
      shiftPhase: checklistForm.shiftPhase,
      tasks,
      digitalSignature: checklistForm.digitalSignature,
    });

    await loadWorkerTools();
  };

  const submitWaste = async () => {
    await postJson("/worker-tools/material-waste", {
      ...wasteForm,
      wasteKg: Number(wasteForm.wasteKg),
    });
    setWasteForm({
      machineLabel: "",
      machineType: "",
      materialType: "",
      wasteKg: "",
      reason: "",
    });
    await loadWorkerTools();
  };

  const submitTarget = async () => {
    await postJson("/worker-tools/daily-targets", {
      ...targetForm,
      targetUnits: Number(targetForm.targetUnits),
      actualUnits: Number(targetForm.actualUnits),
    });
    await loadWorkerTools();
  };

  const submitKaizen = async () => {
    await postJson("/worker-tools/kaizen", kaizenForm);
    setKaizenForm({ title: "", details: "", estimatedImpact: "" });
    await loadWorkerTools();
  };

  const submitQualityIssue = async () => {
    const formData = new FormData();
    formData.append("batchCode", qualityForm.batchCode);
    formData.append("machineLabel", qualityForm.machineLabel);
    formData.append("issueType", qualityForm.issueType);
    formData.append("details", qualityForm.details);
    if (qualityForm.issueImage) {
      formData.append("issueImage", qualityForm.issueImage);
    }

    const response = await fetchWithWorkerAuth("/worker-tools/quality-issues", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    setQualityForm({
      batchCode: "",
      machineLabel: "",
      issueType: "",
      details: "",
      issueImage: null,
    });
    await loadWorkerTools();
  };

  const submitMicroStop = async () => {
    await postJson("/worker-tools/micro-stops", {
      ...microForm,
      durationMinutes: Number(microForm.durationMinutes),
    });
    setMicroForm({ machineLabel: "", reason: "", durationMinutes: "" });
    await loadWorkerTools();
  };

  const submitAnomaly = async () => {
    await postJson("/worker-tools/electricity-anomaly-alerts", {
      machineLabel: anomalyForm.machineLabel,
      currentKwh: Number(anomalyForm.currentKwh),
      thresholdRatio: Number(anomalyForm.thresholdRatio || "1.3"),
    });
    await loadWorkerTools();
  };

  const latest = history[0] ?? null;

  const visibleHistory = useMemo(() => {
    const term = snapshotSearch.trim().toLowerCase();

    if (!term) {
      return history;
    }

    return history.filter((item) => {
      const haystack = [
        item.machineLabel,
        item.notes ?? "",
        String(item.machineCounter),
        String(item.electricityKwh),
        new Date(item.createdAt).toLocaleString(),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [history, snapshotSearch]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const sameDay = (value: string) => {
      const d = new Date(value);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };

    const todayRecords = visibleHistory.filter((item) =>
      sameDay(item.createdAt),
    );
    const avgElectricity = todayRecords.length
      ? todayRecords.reduce((sum, item) => sum + item.electricityKwh, 0) /
        todayRecords.length
      : 0;

    const totalElectricity = todayRecords.reduce(
      (sum, item) => sum + item.electricityKwh,
      0,
    );

    return {
      entries: todayRecords.length,
      avgElectricity,
      totalElectricity,
    };
  }, [visibleHistory]);

  const counterDelta = useMemo(() => {
    const latestVisible = visibleHistory[0] ?? null;
    const previousVisible = visibleHistory[1] ?? null;

    if (!latestVisible || !previousVisible) {
      return null;
    }

    return latestVisible.machineCounter - previousVisible.machineCounter;
  }, [visibleHistory]);

  const visibleSummary = useMemo(() => {
    const totalElectricity = visibleHistory.reduce(
      (sum, item) => sum + item.electricityKwh,
      0,
    );
    const averageElectricity = visibleHistory.length
      ? totalElectricity / visibleHistory.length
      : 0;
    const uniqueMachines = new Set(
      visibleHistory.map((item) => item.machineLabel.trim()).filter(Boolean),
    ).size;

    return {
      totalElectricity,
      averageElectricity,
      uniqueMachines,
      entries: visibleHistory.length,
    };
  }, [visibleHistory]);

  const machineSuggestions = useMemo(
    () => Array.from(new Set(history.map((item) => item.machineLabel))),
    [history],
  );

  const profileInitial = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || "U";
    return source.charAt(0).toUpperCase();
  }, [user?.email, user?.name]);

  const targetEntries = 8;
  const progressPercent = Math.min(
    100,
    Math.round((todayStats.entries / targetEntries) * 100),
  );

  const tabs: Array<{ id: ToolTab; label: string }> = [
    { id: "stops", label: "توقف فوري" },
    { id: "checklist", label: "مهام الشفت" },
    { id: "waste", label: "هدر المواد" },
    { id: "target", label: "الهدف اليومي" },
    { id: "kaizen", label: "Kaizen" },
    { id: "quality", label: "مشاكل الجودة" },
    { id: "micro", label: "توقف قصير" },
    { id: "anomaly", label: "تنبيه كهرباء" },
  ];

  const tabIcons: Record<ToolTab, string> = {
    stops: "🛑",
    checklist: "✅",
    waste: "🗑️",
    target: "🎯",
    kaizen: "💡",
    quality: "🔍",
    micro: "⏱️",
    anomaly: "⚡",
  };

  const tabColors: Record<ToolTab, string> = {
    stops: "#ef4444",
    checklist: "#22c55e",
    waste: "#f59e0b",
    target: "#3b82f6",
    kaizen: "#8b5cf6",
    quality: "#f97316",
    micro: "#14b8a6",
    anomaly: "#eab308",
  };

  const toolDescriptions: Record<ToolTab, string> = {
    stops: "أبلغ عن توقف فوري في الماكينة",
    checklist: "أكمل قائمة مهام بداية/نهاية الشفت",
    waste: "سجّل هدر المواد الخام",
    target: "سجّل الهدف اليومي والإنجاز الفعلي",
    kaizen: "أرسل اقتراحاً لتحسين العمليات",
    quality: "بلّغ عن مشكلة في الجودة",
    micro: "سجّل توقفاً قصيراً للماكينة",
    anomaly: "اكتشاف استهلاك كهربائي غير طبيعي",
  };

  return (
    <ModulePageShell
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            if (showSnapshots) void loadHistory();
            if (showTools) void loadWorkerTools();
          }}
        >
          {text.refresh}
        </button>
      }
    >
      {/* ── Hero Card ── */}
      <div className="wt-hero">
        <div className="wt-hero__left">
          <div className="wt-hero__avatar">{profileInitial}</div>
          <div className="wt-hero__info">
            <p className="wt-hero__eyebrow">{text.profileTitle}</p>
            <strong className="wt-hero__name">{user?.name ?? "-"}</strong>
            <span className="wt-hero__meta">
              {user?.email ?? "-"}
              {user?.role ? ` · ${user.role}` : ""}
            </span>
          </div>
        </div>
        <div className="wt-hero__progress-wrap">
          <div className="wt-hero__progress-label">
            <span>{text.progressLabel}</span>
            <strong>{todayStats.entries}/{targetEntries}</strong>
          </div>
          <div className="wt-hero__progress-track">
            <div
              className="wt-hero__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="wt-hero__progress-pct">{progressPercent}%</div>
        </div>
      </div>

      {/* ── KPI Row (Snapshots mode) ── */}
      {showSnapshots ? (
        <div className="wt-kpi-grid">
          <div className="wt-kpi-card wt-kpi-card--blue">
            <span className="wt-kpi-icon">📊</span>
            <p className="wt-kpi-label">{text.entriesLabel}</p>
            <strong className="wt-kpi-value">{visibleSummary.entries}</strong>
            <small className="wt-kpi-sub">
              {"آخر تحديث"}:{" "}
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "-"}
            </small>
          </div>
          <div className="wt-kpi-card wt-kpi-card--green">
            <span className="wt-kpi-icon">⚡</span>
            <p className="wt-kpi-label">{text.totalElectricityLabel}</p>
            <strong className="wt-kpi-value">
              {visibleSummary.totalElectricity.toFixed(2)}
            </strong>
            <small className="wt-kpi-sub">
              kWh · {"اليوم"}:{" "}
              {todayStats.totalElectricity.toFixed(2)}
            </small>
          </div>
          <div className="wt-kpi-card wt-kpi-card--orange">
            <span className="wt-kpi-icon">📈</span>
            <p className="wt-kpi-label">{text.averageElectricityLabel}</p>
            <strong className="wt-kpi-value">
              {visibleSummary.averageElectricity.toFixed(2)}
            </strong>
            <small className="wt-kpi-sub">
              kWh · {text.counterDeltaLabel}:{" "}
              {counterDelta === null
                ? "-"
                : `${counterDelta > 0 ? "+" : ""}${counterDelta}`}
            </small>
          </div>
          <div className="wt-kpi-card wt-kpi-card--purple">
            <span className="wt-kpi-icon">🏭</span>
            <p className="wt-kpi-label">{text.machinesLabel}</p>
            <strong className="wt-kpi-value">{visibleSummary.uniqueMachines}</strong>
            <small className="wt-kpi-sub">
              {"آخر قراءة"}:{" "}
              {latest ? new Date(latest.createdAt).toLocaleString() : "-"}
            </small>
          </div>
        </div>
      ) : null}

      {/* ── Tab Navigation (Tools mode) ── */}
      {showTools ? (
        <div className="wt-tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`wt-tab-btn${activeTool === tab.id ? " wt-tab-btn--active" : ""}`}
              style={
                activeTool === tab.id
                  ? { background: tabColors[tab.id], borderColor: tabColors[tab.id], color: "#fff" }
                  : {}
              }
              onClick={() => setActiveTool(tab.id)}
            >
              <span className="wt-tab-icon">{tabIcons[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ── Message Banner ── */}
      {message ? (
        <div
          className={`auth-alert ${messageTone === "error" ? "auth-alert--error" : "auth-alert--success"}`}
          style={{ marginBottom: "1rem" }}
        >
          {message}
        </div>
      ) : null}

      {/* ── Main Two-Column Layout ── */}
      <div className="wt-layout">
        {/* ─── LEFT: Form Panel ─── */}
        <div>
          {/* Snapshots form */}
          {showSnapshots ? (
            <div className="wt-card">
              <div className="wt-card__header wt-card__header--blue">
                <span className="wt-card__header-icon">📸</span>
                <div style={{ flex: 1 }}>
                  <h2 className="wt-card__header-title">
                    {editingSnapshotId !== null
                      ? "تعديل قراءة"
                      : "تسجيل قراءة جديدة"}
                  </h2>
                  <p className="wt-card__header-sub">{text.editHint}</p>
                </div>
                {editingSnapshotId !== null ? (
                  <button
                    type="button"
                    className="wt-card__header-cancel"
                    onClick={cancelSnapshotEdit}
                  >
                    {text.cancel}
                  </button>
                ) : null}
              </div>
              <div className="wt-card__body">
                {/* Filters */}
                <div className="wt-filter-row">
                  <div className="wt-field">
                    <label>{text.searchSnapshots}</label>
                    <input
                      value={snapshotSearch}
                      onChange={(e) => setSnapshotSearch(e.target.value)}
                      placeholder={"ابحث..."}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.fromDate}</label>
                    <input
                      type="date"
                      value={snapshotFrom}
                      onChange={(e) => setSnapshotFrom(e.target.value)}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.toDate}</label>
                    <input
                      type="date"
                      value={snapshotTo}
                      onChange={(e) => setSnapshotTo(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    style={{ alignSelf: "flex-end" }}
                    onClick={() => {
                      setSnapshotSearch("");
                      setSnapshotFrom("");
                      setSnapshotTo("");
                    }}
                  >
                    {text.clearFilters}
                  </button>
                </div>

                {/* Summary strip */}
                <div className="wt-summary-strip">
                  <div className="wt-summary-chip">
                    <span>{text.entriesLabel}</span>
                    <strong>{visibleSummary.entries}</strong>
                  </div>
                  <div className="wt-summary-chip">
                    <span>{text.totalElectricityLabel}</span>
                    <strong>{visibleSummary.totalElectricity.toFixed(2)} kWh</strong>
                  </div>
                  <div className="wt-summary-chip">
                    <span>{text.averageElectricityLabel}</span>
                    <strong>{visibleSummary.averageElectricity.toFixed(2)} kWh</strong>
                  </div>
                  <div className="wt-summary-chip">
                    <span>{text.machinesLabel}</span>
                    <strong>{visibleSummary.uniqueMachines}</strong>
                  </div>
                </div>

                {editingSnapshotId !== null ? (
                  <div className="worker-snapshot-edit-banner">
                    {locale === "ar"
                      ? "أنت الآن تعدل سجلًا محفوظًا."
                      : "Editing a saved record — saving will update it."}
                  </div>
                ) : null}

                {/* Form fields */}
                <div className="wt-form-grid">
                  <div className="wt-field">
                    <label>{text.machineLabel}</label>
                    <input
                      list="worker-machine-suggestions"
                      value={draft.machineLabel}
                      onChange={(e) => setDraft((p) => ({ ...p, machineLabel: e.target.value }))}
                    />
                    <datalist id="worker-machine-suggestions">
                      {machineSuggestions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                  <div className="wt-field">
                    <label>{text.machineCounter}</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.machineCounter}
                      onChange={(e) => setDraft((p) => ({ ...p, machineCounter: e.target.value }))}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.electricityKwh}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.electricityKwh}
                      onChange={(e) => setDraft((p) => ({ ...p, electricityKwh: e.target.value }))}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.notes}</label>
                    <input
                      value={draft.notes}
                      onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.machineCounterImage}</label>
                    <PhotoUploadButton
                      label={"التقط صورة"}
                      selectedFileName={draft.machineCounterImage?.name ?? null}
                      onFileSelect={(file) => setDraft((p) => ({ ...p, machineCounterImage: file }))}
                    />
                  </div>
                  <div className="wt-field">
                    <label>{text.electricityImage}</label>
                    <PhotoUploadButton
                      label={"التقط صورة"}
                      selectedFileName={draft.electricityImage?.name ?? null}
                      onFileSelect={(file) => setDraft((p) => ({ ...p, electricityImage: file }))}
                    />
                  </div>
                </div>

                <div className="wt-form-actions">
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() =>
                      setDraft((p) => ({ ...p, machineLabel: latest?.machineLabel ?? p.machineLabel }))
                    }
                  >
                    {"استخدم آخر ماكينة"}
                  </button>
                  <button
                    type="button"
                    className="auth-button"
                    disabled={saving}
                    onClick={() => void handleSnapshotSubmit()}
                  >
                    {saving ? text.loading : editingSnapshotId !== null ? text.saveChanges : text.submit}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tool form */}
          {showTools ? (
            <div className="wt-card">
              <div
                className="wt-card__header"
                style={{
                  background: `linear-gradient(135deg, ${tabColors[activeTool]}12, ${tabColors[activeTool]}04)`,
                  borderBottom: `1.5px solid ${tabColors[activeTool]}25`,
                }}
              >
                <span
                  className="wt-card__header-icon"
                  style={{ background: `${tabColors[activeTool]}18`, color: tabColors[activeTool] }}
                >
                  {tabIcons[activeTool]}
                </span>
                <div>
                  <h2 className="wt-card__header-title">
                    {tabs.find((t) => t.id === activeTool)?.label}
                  </h2>
                  <p className="wt-card__header-sub">{toolDescriptions[activeTool]}</p>
                </div>
              </div>
              <div className="wt-card__body">
                {/* Stops */}
                {activeTool === "stops" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"الماكينة"}</label>
                      <input
                        value={stopForm.machineLabel}
                        onChange={(e) => setStopForm((p) => ({ ...p, machineLabel: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"الأولوية"}</label>
                      <select
                        value={stopForm.priority}
                        onChange={(e) => setStopForm((p) => ({ ...p, priority: e.target.value }))}
                      >
                        <option value="CRITICAL">🔴 CRITICAL</option>
                        <option value="HIGH">🟠 HIGH</option>
                        <option value="NORMAL">🟡 NORMAL</option>
                      </select>
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"السبب"}</label>
                      <input
                        value={stopForm.reason}
                        onChange={(e) => setStopForm((p) => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.stops }}
                        onClick={() => void submitStopAlert()}
                      >
                        🛑 {"إرسال البلاغ"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Checklist */}
                {activeTool === "checklist" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"مرحلة الشفت"}</label>
                      <select
                        value={checklistForm.shiftPhase}
                        onChange={(e) => setChecklistForm((p) => ({ ...p, shiftPhase: e.target.value }))}
                      >
                        <option value="START">🌅 START</option>
                        <option value="END">🌙 END</option>
                      </select>
                    </div>
                    <div className="wt-field">
                      <label>{"التوقيع الرقمي"}</label>
                      <input
                        value={checklistForm.digitalSignature}
                        onChange={(e) => setChecklistForm((p) => ({ ...p, digitalSignature: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"المهام (سطر لكل مهمة)"}</label>
                      <textarea
                        value={checklistForm.tasksText}
                        rows={5}
                        onChange={(e) => setChecklistForm((p) => ({ ...p, tasksText: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.checklist }}
                        onClick={() => void submitChecklist()}
                      >
                        ✅ {"حفظ القائمة"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Waste */}
                {activeTool === "waste" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"الماكينة"}</label>
                      <input
                        value={wasteForm.machineLabel}
                        onChange={(e) => setWasteForm((p) => ({ ...p, machineLabel: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"نوع الماكينة"}</label>
                      <input
                        value={wasteForm.machineType}
                        onChange={(e) => setWasteForm((p) => ({ ...p, machineType: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"نوع المادة"}</label>
                      <input
                        value={wasteForm.materialType}
                        onChange={(e) => setWasteForm((p) => ({ ...p, materialType: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"الكمية كغ"}</label>
                      <input
                        type="number"
                        value={wasteForm.wasteKg}
                        onChange={(e) => setWasteForm((p) => ({ ...p, wasteKg: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"سبب الهدر"}</label>
                      <input
                        value={wasteForm.reason}
                        onChange={(e) => setWasteForm((p) => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.waste }}
                        onClick={() => void submitWaste()}
                      >
                        🗑️ {"حفظ الهدر"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Target */}
                {activeTool === "target" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"التاريخ"}</label>
                      <input
                        type="date"
                        value={targetForm.targetDate}
                        onChange={(e) => setTargetForm((p) => ({ ...p, targetDate: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"ملاحظة"}</label>
                      <input
                        value={targetForm.note}
                        onChange={(e) => setTargetForm((p) => ({ ...p, note: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"الهدف"}</label>
                      <input
                        type="number"
                        value={targetForm.targetUnits}
                        onChange={(e) => setTargetForm((p) => ({ ...p, targetUnits: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"المنجز"}</label>
                      <input
                        type="number"
                        value={targetForm.actualUnits}
                        onChange={(e) => setTargetForm((p) => ({ ...p, actualUnits: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.target }}
                        onClick={() => void submitTarget()}
                      >
                        🎯 {"حفظ الإنجاز"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Kaizen */}
                {activeTool === "kaizen" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field wt-field--full">
                      <label>{"عنوان الاقتراح"}</label>
                      <input
                        value={kaizenForm.title}
                        onChange={(e) => setKaizenForm((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"تفاصيل"}</label>
                      <textarea
                        value={kaizenForm.details}
                        rows={4}
                        onChange={(e) => setKaizenForm((p) => ({ ...p, details: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"الأثر المتوقع"}</label>
                      <input
                        value={kaizenForm.estimatedImpact}
                        onChange={(e) => setKaizenForm((p) => ({ ...p, estimatedImpact: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.kaizen }}
                        onClick={() => void submitKaizen()}
                      >
                        💡 {"إرسال الاقتراح"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Quality */}
                {activeTool === "quality" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"رمز الدفعة"}</label>
                      <input
                        value={qualityForm.batchCode}
                        onChange={(e) => setQualityForm((p) => ({ ...p, batchCode: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"الماكينة"}</label>
                      <input
                        value={qualityForm.machineLabel}
                        onChange={(e) => setQualityForm((p) => ({ ...p, machineLabel: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"نوع المشكلة"}</label>
                      <input
                        value={qualityForm.issueType}
                        onChange={(e) => setQualityForm((p) => ({ ...p, issueType: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"تفاصيل"}</label>
                      <input
                        value={qualityForm.details}
                        onChange={(e) => setQualityForm((p) => ({ ...p, details: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"صورة المشكلة"}</label>
                      <PhotoUploadButton
                        label={"التقط صورة"}
                        selectedFileName={qualityForm.issueImage?.name ?? null}
                        onFileSelect={(file) => setQualityForm((p) => ({ ...p, issueImage: file }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.quality }}
                        onClick={() => void submitQualityIssue()}
                      >
                        🔍 {"رفع المشكلة"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Micro-stops */}
                {activeTool === "micro" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"الماكينة"}</label>
                      <input
                        value={microForm.machineLabel}
                        onChange={(e) => setMicroForm((p) => ({ ...p, machineLabel: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"المدة بالدقائق"}</label>
                      <input
                        type="number"
                        value={microForm.durationMinutes}
                        onChange={(e) => setMicroForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field wt-field--full">
                      <label>{"سبب التوقف"}</label>
                      <input
                        value={microForm.reason}
                        onChange={(e) => setMicroForm((p) => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.micro }}
                        onClick={() => void submitMicroStop()}
                      >
                        ⏱️ {"حفظ التوقف"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Anomaly */}
                {activeTool === "anomaly" ? (
                  <div className="wt-form-grid">
                    <div className="wt-field">
                      <label>{"الماكينة"}</label>
                      <input
                        value={anomalyForm.machineLabel}
                        onChange={(e) => setAnomalyForm((p) => ({ ...p, machineLabel: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"القراءة الحالية kWh"}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={anomalyForm.currentKwh}
                        onChange={(e) => setAnomalyForm((p) => ({ ...p, currentKwh: e.target.value }))}
                      />
                    </div>
                    <div className="wt-field">
                      <label>{"نسبة الحد"}</label>
                      <input
                        type="number"
                        step="0.05"
                        value={anomalyForm.thresholdRatio}
                        onChange={(e) => setAnomalyForm((p) => ({ ...p, thresholdRatio: e.target.value }))}
                      />
                    </div>
                    <div className="wt-form-actions">
                      <button
                        className="auth-button"
                        type="button"
                        style={{ background: tabColors.anomaly }}
                        onClick={() => void submitAnomaly()}
                      >
                        ⚡ {"فحص التنبيه"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* ─── RIGHT: Log Panel ─── */}
        <div>
          {/* Snapshots log */}
          {showSnapshots ? (
            <div className="wt-card">
              <div className="wt-card__header wt-card__header--gray">
                <span className="wt-card__header-icon">🕐</span>
                <div>
                  <h2 className="wt-card__header-title">
                    {"آخر القراءات"}
                  </h2>
                  <p className="wt-card__header-sub">
                    {visibleSummary.entries} {"سجل"}
                  </p>
                </div>
              </div>
              <div className="wt-card__body">
                {loading ? <TruckLoader /> : null}
                {!loading && visibleHistory.length === 0 ? (
                  <div className="wt-empty">
                    <span className="wt-empty__icon">📭</span>
                    <p>{text.noData}</p>
                  </div>
                ) : null}
                <div className="wt-log-cards">
                  {visibleHistory.slice(0, 20).map((item) => (
                    <div className="wt-log-card" key={item.id}>
                      <div className="wt-log-card__header">
                        <strong>{item.machineLabel}</strong>
                        <span className="wt-badge wt-badge--blue">
                          ⚡ {item.electricityKwh.toFixed(2)} kWh
                        </span>
                      </div>
                      <div className="wt-log-card__meta">
                        <span>
                          {"العداد"}:{" "}
                          <strong>{item.machineCounter}</strong>
                        </span>
                        {item.notes ? <span>📝 {item.notes}</span> : null}
                      </div>
                      {item.machineCounterImage || item.electricityImage ? (
                        <div className="worker-snapshot-history-images">
                          {item.machineCounterImage ? (
                            <img
                              src={normalizeSnapshotImagePath(item.machineCounterImage) ?? ""}
                              alt={text.machineCounterImage}
                            />
                          ) : null}
                          {item.electricityImage ? (
                            <img
                              src={normalizeSnapshotImagePath(item.electricityImage) ?? ""}
                              alt={text.electricityImage}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      <div className="wt-log-card__footer">
                        <small className="wt-log-card__date">
                          {new Date(item.createdAt).toLocaleString()}
                        </small>
                        <div className="wt-log-card__actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost"
                            onClick={() => beginSnapshotEdit(item)}
                          >
                            {text.edit}
                          </button>
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteSnapshot(item)}
                          >
                            {text.remove}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Tool log */}
          {showTools ? (
            <div className="wt-card">
              <div
                className="wt-card__header"
                style={{
                  background: `linear-gradient(135deg, ${tabColors[activeTool]}0e, transparent)`,
                  borderBottom: `1px solid ${tabColors[activeTool]}20`,
                }}
              >
                <span
                  className="wt-card__header-icon"
                  style={{ background: `${tabColors[activeTool]}15`, color: tabColors[activeTool] }}
                >
                  {tabIcons[activeTool]}
                </span>
                <div>
                  <h2 className="wt-card__header-title">
                    {"السجل"}
                  </h2>
                  <p className="wt-card__header-sub">
                    {tabs.find((t) => t.id === activeTool)?.label}
                  </p>
                </div>
              </div>
              <div className="wt-card__body">
                {/* Stops log */}
                {activeTool === "stops" ? (
                  stopLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">🛑</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {stopLogs.slice(0, 20).map((row, index) => {
                        const id = Number(row.id ?? 0);
                        const resolvedAt = row.resolved_at;
                        return (
                          <div className="wt-log-card" key={`stops-${index}`}>
                            <div className="wt-log-card__header">
                              <strong>{String(row.machine_label ?? "-")}</strong>
                              <span className={`wt-badge ${String(row.priority) === "CRITICAL" ? "wt-badge--red" : String(row.priority) === "HIGH" ? "wt-badge--orange" : "wt-badge--yellow"}`}>
                                {String(row.priority ?? "NORMAL")}
                              </span>
                            </div>
                            <div className="wt-log-card__meta">
                              <span>{String(row.reason ?? "-")}</span>
                              {row.response_minutes ? (
                                <span>⏱️ {Number(row.response_minutes).toFixed(1)} min</span>
                              ) : null}
                            </div>
                            <div className="wt-log-card__footer">
                              <span className={`wt-badge ${resolvedAt ? "wt-badge--green" : "wt-badge--red"}`}>
                                {resolvedAt
                                  ? "مغلق"
                                  : "مفتوح"}
                              </span>
                              <div className="wt-log-card__actions">
                                {!resolvedAt && id > 0 ? (
                                  <button
                                    type="button"
                                    className="auth-button auth-button--ghost"
                                    onClick={() => void resolveStopAlert(id)}
                                  >
                                    {"إغلاق"}
                                  </button>
                                ) : null}
                                {id > 0 ? (
                                  <button
                                    type="button"
                                    className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                    disabled={saving}
                                    onClick={() => void deleteToolLog(id)}
                                  >
                                    {text.removeEntry}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : null}

                {/* Checklist log */}
                {activeTool === "checklist" ? (
                  checklists.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">✅</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {checklists.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`checklist-${index}`}>
                          <div className="wt-log-card__header">
                            <span className={`wt-badge ${String(row.shift_phase) === "START" ? "wt-badge--green" : "wt-badge--blue"}`}>
                              {String(row.shift_phase ?? "-")}
                            </span>
                            <span className="wt-badge wt-badge--gray">
                              ✍️ {String(row.digital_signature ?? "-")}
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
                              {String(row.tasks_json ?? "-")}
                            </span>
                          </div>
                          <div className="wt-log-card__footer">
                            <small>{new Date(String(row.created_at)).toLocaleString()}</small>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {/* Waste log */}
                {activeTool === "waste" ? (
                  wasteLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">🗑️</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {wasteLogs.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`waste-${index}`}>
                          <div className="wt-log-card__header">
                            <strong>{String(row.machine_label ?? "-")}</strong>
                            <span className="wt-badge wt-badge--orange">
                              {Number(row.waste_kg ?? 0).toFixed(2)} kg
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span>{String(row.machine_type ?? "-")} · {String(row.material_type ?? "-")}</span>
                            <span>{String(row.reason ?? "-")}</span>
                          </div>
                          <div className="wt-log-card__footer">
                            <small />
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {/* Target log */}
                {activeTool === "target" ? (
                  targetLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">🎯</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {targetLogs.slice(0, 20).map((row, index) => {
                        const target = Number(row.target_units ?? 0);
                        const actual = Number(row.actual_units ?? 0);
                        const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
                        return (
                          <div className="wt-log-card" key={`target-${index}`}>
                            <div className="wt-log-card__header">
                              <strong>{String(row.target_date ?? "-")}</strong>
                              <span className={`wt-badge ${pct >= 100 ? "wt-badge--green" : pct >= 80 ? "wt-badge--blue" : "wt-badge--orange"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="wt-log-card__meta">
                              <span>{"الهدف"}: <strong>{target}</strong></span>
                              <span>{"المنجز"}: <strong>{actual}</strong></span>
                              <span>{"الفجوة"}: {target - actual}</span>
                            </div>
                            {row.note ? (
                              <div className="wt-log-card__meta">
                                <span>📝 {String(row.note)}</span>
                              </div>
                            ) : null}
                            <div className="wt-log-card__footer">
                              <small />
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : null}

                {/* Kaizen log */}
                {activeTool === "kaizen" ? (
                  kaizenLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">💡</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {kaizenLogs.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`kaizen-${index}`}>
                          <div className="wt-log-card__header">
                            <strong>{String(row.title ?? "-")}</strong>
                            <span className={`wt-badge ${String(row.review_status) === "APPROVED" ? "wt-badge--green" : String(row.review_status) === "REJECTED" ? "wt-badge--red" : "wt-badge--purple"}`}>
                              {String(row.review_status ?? "PENDING")}
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span>{String(row.details ?? "-")}</span>
                            {Number(row.reward_points) > 0 ? (
                              <span>🏆 {Number(row.reward_points)} pts</span>
                            ) : null}
                          </div>
                          <div className="wt-log-card__footer">
                            <small>{String(row.estimated_impact ?? "-")}</small>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {/* Quality log */}
                {activeTool === "quality" ? (
                  qualityLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">🔍</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {qualityLogs.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`quality-${index}`}>
                          <div className="wt-log-card__header">
                            <strong>{String(row.batch_code ?? "-")}</strong>
                            <span className="wt-badge wt-badge--orange">
                              {String(row.issue_type ?? "-")}
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span>🏭 {String(row.machine_label ?? "-")}</span>
                            <span>{String(row.details ?? "-")}</span>
                          </div>
                          <div className="wt-log-card__footer">
                            {row.issue_image ? (
                              <a
                                className="wt-badge wt-badge--blue"
                                href={normalizeSnapshotImagePath(String(row.issue_image)) ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none" }}
                              >
                                📷 {"عرض"}
                              </a>
                            ) : (
                              <small />
                            )}
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {/* Micro log */}
                {activeTool === "micro" ? (
                  microLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">⏱️</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {microLogs.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`micro-${index}`}>
                          <div className="wt-log-card__header">
                            <strong>{String(row.machine_label ?? "-")}</strong>
                            <span className="wt-badge wt-badge--teal">
                              {Number(row.duration_minutes ?? 0)} min
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span>{String(row.reason ?? "-")}</span>
                          </div>
                          <div className="wt-log-card__footer">
                            <small>{new Date(String(row.created_at)).toLocaleString()}</small>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}

                {/* Anomaly log */}
                {activeTool === "anomaly" ? (
                  anomalyLogs.length === 0 ? (
                    <div className="wt-empty"><span className="wt-empty__icon">⚡</span><p>{text.noData}</p></div>
                  ) : (
                    <div className="wt-log-cards">
                      {anomalyLogs.slice(0, 20).map((row, index) => (
                        <div className="wt-log-card" key={`anomaly-${index}`}>
                          <div className="wt-log-card__header">
                            <strong>{String(row.machine_label ?? "-")}</strong>
                            <span className={`wt-badge ${row.is_alert ? "wt-badge--red" : "wt-badge--green"}`}>
                              {row.is_alert
                                ? "⚠️ إنذار"
                                : "✅ طبيعي"}
                            </span>
                          </div>
                          <div className="wt-log-card__meta">
                            <span>
                              {Number(row.current_kwh ?? 0).toFixed(2)} kWh ·{" "}
                              {"النسبة"}:{" "}
                              {Number(row.threshold_ratio ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="wt-log-card__footer">
                            <small>{new Date(String(row.created_at)).toLocaleString()}</small>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ModulePageShell>
  );
}
