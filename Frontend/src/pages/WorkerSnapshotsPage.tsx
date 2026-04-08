import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ModulePageShell } from "../components/ModulePageShell";
import { TruckLoader } from "../components/TruckLoader";
import { PhotoUploadButton } from "../components/PhotoUploadButton";
import { API_BASE_URL, readApiError } from "../lib/api";
import { createUserSocket } from "../lib/socket";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../context/AuthContext";

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

async function fetchWithWorkerAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  return `${API_BASE_URL}/${value.replace(/^prisma\/?pictures\//, "pictures/")}`;
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
    () =>
      locale === "ar"
        ? {
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
          }
        : {
            title: "Worker Operations Hub",
            subtitle:
              "All worker tools in one place: readings, stoppage alerts, quality, waste, shift tasks, and improvement actions.",
            machineLabel: "Machine name/code",
            machineCounter: "Machine counter reading",
            electricityKwh: "Electricity reading (kWh)",
            notes: "Shift notes",
            machineCounterImage: "Machine counter image",
            electricityImage: "Electric meter image",
            submit: "Save reading",
            refresh: "Refresh",
            clearFilters: "Clear filters",
            searchSnapshots: "Search readings",
            fromDate: "From date",
            toDate: "To date",
            edit: "Edit",
            remove: "Delete",
            removeEntry: "Delete entry",
            cancel: "Cancel",
            saveChanges: "Save changes",
            loading: "Loading...",
            noData: "No data yet.",
            invalid: "Please enter valid values.",
            saved: "Saved successfully.",
            updated: "Updated successfully.",
            deleted: "Deleted successfully.",
            deleteConfirm: "Delete this entry?",
            profileTitle: "Worker Card",
            progressLabel: "Today progress",
            summariesTitle: "Reading summary",
            entriesLabel: "Visible records",
            totalElectricityLabel: "Total electricity",
            averageElectricityLabel: "Average electricity",
            counterDeltaLabel: "Counter delta",
            machinesLabel: "Visible machines",
            editHint:
              "Edit or delete submitted readings directly from the list.",
            toolsTitle: "Worker Tools",
          },
    [locale],
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
      socket.disconnect();
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
    const confirmed = window.confirm(
      locale === "ar"
        ? `حذف قراءة ${item.machineLabel}؟`
        : `Delete the reading for ${item.machineLabel}?`,
    );

    if (!confirmed) {
      return;
    }

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

    const confirmed = window.confirm(text.deleteConfirm);
    if (!confirmed) {
      return;
    }

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
    { id: "stops", label: locale === "ar" ? "توقف فوري" : "Stop Alerts" },
    {
      id: "checklist",
      label: locale === "ar" ? "مهام الشفت" : "Shift Checklist",
    },
    { id: "waste", label: locale === "ar" ? "هدر المواد" : "Material Waste" },
    { id: "target", label: locale === "ar" ? "الهدف اليومي" : "Daily Target" },
    { id: "kaizen", label: locale === "ar" ? "Kaizen" : "Kaizen" },
    {
      id: "quality",
      label: locale === "ar" ? "مشاكل الجودة" : "Quality Issues",
    },
    { id: "micro", label: locale === "ar" ? "Micro-stops" : "Micro-stops" },
    {
      id: "anomaly",
      label: locale === "ar" ? "تنبيه كهرباء" : "Electricity Anomaly",
    },
  ];

  return (
    <ModulePageShell
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            if (showSnapshots) {
              void loadHistory();
            }
            if (showTools) {
              void loadWorkerTools();
            }
          }}
        >
          {text.refresh}
        </button>
      }
    >
      <section className="worker-profile-strip">
        <div className="worker-profile-chip">
          <div className="worker-profile-chip__avatar">{profileInitial}</div>
          <div>
            <p className="worker-profile-chip__eyebrow">{text.profileTitle}</p>
            <strong>{user?.name ?? "-"}</strong>
            <small>
              {user?.email ?? "-"} {user?.role ? `• ${user.role}` : ""}
            </small>
          </div>
        </div>
        <div className="worker-progress-box">
          <p>
            {text.progressLabel}: {todayStats.entries}/{targetEntries}
          </p>
          <div className="worker-progress-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      {showSnapshots ? (
        <section className="worker-snapshot-kpi-grid">
          <article className="worker-snapshot-kpi">
            <p>{text.entriesLabel}</p>
            <strong>{visibleSummary.entries}</strong>
            <small>
              {locale === "ar" ? "آخر تحديث" : "Last sync"}:{" "}
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "-"}
            </small>
          </article>
          <article className="worker-snapshot-kpi">
            <p>{text.totalElectricityLabel}</p>
            <strong>{visibleSummary.totalElectricity.toFixed(2)} kWh</strong>
            <small>
              {locale === "ar" ? "اليوم" : "Today"}:{" "}
              {todayStats.totalElectricity.toFixed(2)} kWh
            </small>
          </article>
          <article className="worker-snapshot-kpi">
            <p>{text.averageElectricityLabel}</p>
            <strong>{visibleSummary.averageElectricity.toFixed(2)} kWh</strong>
            <small>
              {text.counterDeltaLabel}:{" "}
              {counterDelta === null
                ? "-"
                : `${counterDelta > 0 ? "+" : ""}${counterDelta}`}
            </small>
          </article>
          <article className="worker-snapshot-kpi">
            <p>{text.machinesLabel}</p>
            <strong>{visibleSummary.uniqueMachines}</strong>
            <small>
              {locale === "ar" ? "آخر قراءة" : "Latest"}:{" "}
              {latest ? new Date(latest.createdAt).toLocaleString() : "-"}
            </small>
          </article>
        </section>
      ) : null}

      <section className="module-grid">
        <article className="module-panel worker-snapshot-form-panel">
          {showSnapshots ? (
            <>
              <div className="worker-snapshot-panel-head">
                <div>
                  <h2>{locale === "ar" ? "تسجيل قراءة" : "Add Snapshot"}</h2>
                  <p className="worker-snapshot-panel-hint">{text.editHint}</p>
                </div>
                {editingSnapshotId !== null ? (
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={cancelSnapshotEdit}
                  >
                    {text.cancel}
                  </button>
                ) : null}
              </div>
              <div className="worker-snapshot-filter-grid">
                <label>
                  {text.searchSnapshots}
                  <input
                    value={snapshotSearch}
                    onChange={(event) => setSnapshotSearch(event.target.value)}
                    placeholder={
                      locale === "ar"
                        ? "ابحث باسم الماكينة أو الملاحظات"
                        : "Search by machine or note"
                    }
                  />
                </label>
                <label>
                  {text.fromDate}
                  <input
                    type="date"
                    value={snapshotFrom}
                    onChange={(event) => setSnapshotFrom(event.target.value)}
                  />
                </label>
                <label>
                  {text.toDate}
                  <input
                    type="date"
                    value={snapshotTo}
                    onChange={(event) => setSnapshotTo(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={() => {
                    setSnapshotSearch("");
                    setSnapshotFrom("");
                    setSnapshotTo("");
                  }}
                >
                  {text.clearFilters}
                </button>
              </div>
              <h3 className="worker-snapshot-summary-title">
                {text.summariesTitle}
              </h3>
              <div className="worker-snapshot-summary-strip">
                <article className="worker-snapshot-summary-card">
                  <span>{text.entriesLabel}</span>
                  <strong>{visibleSummary.entries}</strong>
                </article>
                <article className="worker-snapshot-summary-card">
                  <span>{text.totalElectricityLabel}</span>
                  <strong>
                    {visibleSummary.totalElectricity.toFixed(2)} kWh
                  </strong>
                </article>
                <article className="worker-snapshot-summary-card">
                  <span>{text.averageElectricityLabel}</span>
                  <strong>
                    {visibleSummary.averageElectricity.toFixed(2)} kWh
                  </strong>
                </article>
                <article className="worker-snapshot-summary-card">
                  <span>{text.machinesLabel}</span>
                  <strong>{visibleSummary.uniqueMachines}</strong>
                </article>
              </div>
              {editingSnapshotId !== null ? (
                <div className="worker-snapshot-edit-banner">
                  {locale === "ar"
                    ? "أنت الآن تعدل سجلًا محفوظًا. عند الحفظ سيتم تحديثه مباشرة."
                    : "You are editing a saved record. Saving will update it immediately."}
                </div>
              ) : null}
              <div className="worker-snapshot-form-grid">
                <label>
                  {text.machineLabel}
                  <input
                    list="worker-machine-suggestions"
                    value={draft.machineLabel}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        machineLabel: event.target.value,
                      }))
                    }
                  />
                  <datalist id="worker-machine-suggestions">
                    {machineSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  {text.machineCounter}
                  <input
                    type="number"
                    min={0}
                    value={draft.machineCounter}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        machineCounter: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {text.electricityKwh}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.electricityKwh}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        electricityKwh: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {text.notes}
                  <input
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {text.machineCounterImage}
                  <PhotoUploadButton
                    label={locale === "ar" ? "التقط صورة" : "Take a Photo"}
                    selectedFileName={draft.machineCounterImage?.name ?? null}
                    onFileSelect={(file) =>
                      setDraft((prev) => ({
                        ...prev,
                        machineCounterImage: file,
                      }))
                    }
                  />
                </label>
                <label>
                  {text.electricityImage}
                  <PhotoUploadButton
                    label={locale === "ar" ? "التقط صورة" : "Take a Photo"}
                    selectedFileName={draft.electricityImage?.name ?? null}
                    onFileSelect={(file) =>
                      setDraft((prev) => ({
                        ...prev,
                        electricityImage: file,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="admin-section__actions admin-section__actions--inline">
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      machineLabel: latest?.machineLabel ?? prev.machineLabel,
                    }))
                  }
                >
                  {locale === "ar" ? "استخدم آخر ماكينة" : "Use last machine"}
                </button>
                <button
                  type="button"
                  className="auth-button"
                  disabled={saving}
                  onClick={() => void handleSnapshotSubmit()}
                >
                  {saving
                    ? text.loading
                    : editingSnapshotId !== null
                      ? text.saveChanges
                      : text.submit}
                </button>
              </div>

              {message ? (
                <div
                  className={`auth-alert ${
                    messageTone === "error"
                      ? "auth-alert--error"
                      : "auth-alert--success"
                  }`}
                >
                  {message}
                </div>
              ) : null}
            </>
          ) : null}

          {showTools ? (
            <>
              <h3>
                {tabs.find((tab) => tab.id === activeTool)?.label ??
                  text.toolsTitle}
              </h3>

              {showTools && activeTool === "stops" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "الماكينة" : "Machine"}
                    <input
                      value={stopForm.machineLabel}
                      onChange={(event) =>
                        setStopForm((prev) => ({
                          ...prev,
                          machineLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "الأولوية" : "Priority"}
                    <select
                      value={stopForm.priority}
                      onChange={(event) =>
                        setStopForm((prev) => ({
                          ...prev,
                          priority: event.target.value,
                        }))
                      }
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="NORMAL">NORMAL</option>
                    </select>
                  </label>
                  <label>
                    {locale === "ar" ? "السبب" : "Reason"}
                    <input
                      value={stopForm.reason}
                      onChange={(event) =>
                        setStopForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitStopAlert()}
                  >
                    {locale === "ar" ? "إرسال البلاغ" : "Submit Alert"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "checklist" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "مرحلة الشفت" : "Shift Phase"}
                    <select
                      value={checklistForm.shiftPhase}
                      onChange={(event) =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          shiftPhase: event.target.value,
                        }))
                      }
                    >
                      <option value="START">START</option>
                      <option value="END">END</option>
                    </select>
                  </label>
                  <label>
                    {locale === "ar"
                      ? "المهام (سطر لكل مهمة)"
                      : "Tasks (one per line)"}
                    <textarea
                      value={checklistForm.tasksText}
                      onChange={(event) =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          tasksText: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "التوقيع الرقمي" : "Digital Signature"}
                    <input
                      value={checklistForm.digitalSignature}
                      onChange={(event) =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          digitalSignature: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitChecklist()}
                  >
                    {locale === "ar" ? "حفظ القائمة" : "Save Checklist"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "waste" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "الماكينة" : "Machine"}
                    <input
                      value={wasteForm.machineLabel}
                      onChange={(event) =>
                        setWasteForm((p) => ({
                          ...p,
                          machineLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "نوع الماكينة" : "Machine Type"}
                    <input
                      value={wasteForm.machineType}
                      onChange={(event) =>
                        setWasteForm((p) => ({
                          ...p,
                          machineType: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "نوع المادة" : "Material"}
                    <input
                      value={wasteForm.materialType}
                      onChange={(event) =>
                        setWasteForm((p) => ({
                          ...p,
                          materialType: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "الكمية كغ" : "Waste Kg"}
                    <input
                      type="number"
                      value={wasteForm.wasteKg}
                      onChange={(event) =>
                        setWasteForm((p) => ({
                          ...p,
                          wasteKg: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "سبب الهدر" : "Reason"}
                    <input
                      value={wasteForm.reason}
                      onChange={(event) =>
                        setWasteForm((p) => ({
                          ...p,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitWaste()}
                  >
                    {locale === "ar" ? "حفظ الهدر" : "Save Waste"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "target" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "التاريخ" : "Date"}
                    <input
                      type="date"
                      value={targetForm.targetDate}
                      onChange={(event) =>
                        setTargetForm((p) => ({
                          ...p,
                          targetDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "الهدف" : "Target"}
                    <input
                      type="number"
                      value={targetForm.targetUnits}
                      onChange={(event) =>
                        setTargetForm((p) => ({
                          ...p,
                          targetUnits: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "المنجز" : "Actual"}
                    <input
                      type="number"
                      value={targetForm.actualUnits}
                      onChange={(event) =>
                        setTargetForm((p) => ({
                          ...p,
                          actualUnits: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "ملاحظة" : "Note"}
                    <input
                      value={targetForm.note}
                      onChange={(event) =>
                        setTargetForm((p) => ({
                          ...p,
                          note: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitTarget()}
                  >
                    {locale === "ar" ? "حفظ الإنجاز" : "Save Progress"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "kaizen" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "عنوان الاقتراح" : "Suggestion Title"}
                    <input
                      value={kaizenForm.title}
                      onChange={(event) =>
                        setKaizenForm((p) => ({
                          ...p,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "تفاصيل" : "Details"}
                    <textarea
                      value={kaizenForm.details}
                      onChange={(event) =>
                        setKaizenForm((p) => ({
                          ...p,
                          details: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "الأثر المتوقع" : "Estimated Impact"}
                    <input
                      value={kaizenForm.estimatedImpact}
                      onChange={(event) =>
                        setKaizenForm((p) => ({
                          ...p,
                          estimatedImpact: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitKaizen()}
                  >
                    {locale === "ar" ? "إرسال الاقتراح" : "Submit Suggestion"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "quality" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "رمز الدفعة" : "Batch Code"}
                    <input
                      value={qualityForm.batchCode}
                      onChange={(event) =>
                        setQualityForm((p) => ({
                          ...p,
                          batchCode: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "الماكينة" : "Machine"}
                    <input
                      value={qualityForm.machineLabel}
                      onChange={(event) =>
                        setQualityForm((p) => ({
                          ...p,
                          machineLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "نوع المشكلة" : "Issue Type"}
                    <input
                      value={qualityForm.issueType}
                      onChange={(event) =>
                        setQualityForm((p) => ({
                          ...p,
                          issueType: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "تفاصيل" : "Details"}
                    <input
                      value={qualityForm.details}
                      onChange={(event) =>
                        setQualityForm((p) => ({
                          ...p,
                          details: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "صورة المشكلة" : "Issue Image"}
                    <PhotoUploadButton
                      label={locale === "ar" ? "التقط صورة" : "Take a Photo"}
                      selectedFileName={qualityForm.issueImage?.name ?? null}
                      onFileSelect={(file) =>
                        setQualityForm((p) => ({
                          ...p,
                          issueImage: file,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitQualityIssue()}
                  >
                    {locale === "ar" ? "رفع المشكلة" : "Report Issue"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "micro" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "الماكينة" : "Machine"}
                    <input
                      value={microForm.machineLabel}
                      onChange={(event) =>
                        setMicroForm((p) => ({
                          ...p,
                          machineLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "سبب التوقف" : "Stop Reason"}
                    <input
                      value={microForm.reason}
                      onChange={(event) =>
                        setMicroForm((p) => ({
                          ...p,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "المدة بالدقائق" : "Duration (min)"}
                    <input
                      type="number"
                      value={microForm.durationMinutes}
                      onChange={(event) =>
                        setMicroForm((p) => ({
                          ...p,
                          durationMinutes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitMicroStop()}
                  >
                    {locale === "ar" ? "حفظ التوقف" : "Save Micro-stop"}
                  </button>
                </div>
              ) : null}

              {showTools && activeTool === "anomaly" ? (
                <div className="worker-snapshot-form-grid">
                  <label>
                    {locale === "ar" ? "الماكينة" : "Machine"}
                    <input
                      value={anomalyForm.machineLabel}
                      onChange={(event) =>
                        setAnomalyForm((p) => ({
                          ...p,
                          machineLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "القراءة الحالية kWh" : "Current kWh"}
                    <input
                      type="number"
                      step="0.01"
                      value={anomalyForm.currentKwh}
                      onChange={(event) =>
                        setAnomalyForm((p) => ({
                          ...p,
                          currentKwh: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    {locale === "ar" ? "نسبة الحد" : "Threshold Ratio"}
                    <input
                      type="number"
                      step="0.05"
                      value={anomalyForm.thresholdRatio}
                      onChange={(event) =>
                        setAnomalyForm((p) => ({
                          ...p,
                          thresholdRatio: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="auth-button"
                    type="button"
                    onClick={() => void submitAnomaly()}
                  >
                    {locale === "ar" ? "فحص التنبيه" : "Check Alert"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </article>

        <article className="module-panel">
          {showSnapshots ? (
            <>
              <h2>{locale === "ar" ? "آخر القراءات" : "Latest snapshots"}</h2>
              {loading ? <TruckLoader /> : null}
              {!loading && visibleHistory.length === 0 ? (
                <p>{text.noData}</p>
              ) : null}
              <div className="module-list">
                {visibleHistory.slice(0, 20).map((item) => (
                  <div className="module-row" key={item.id}>
                    <strong>{item.machineLabel}</strong>
                    <span>
                      {text.machineCounter}: {item.machineCounter} |{" "}
                      {text.electricityKwh}: {item.electricityKwh.toFixed(2)}
                    </span>
                    {item.notes ? <small>{item.notes}</small> : null}
                    <div className="worker-snapshot-history-images">
                      {item.machineCounterImage ? (
                        <img
                          src={
                            normalizeSnapshotImagePath(
                              item.machineCounterImage,
                            ) ?? ""
                          }
                          alt={text.machineCounterImage}
                        />
                      ) : null}
                      {item.electricityImage ? (
                        <img
                          src={
                            normalizeSnapshotImagePath(item.electricityImage) ??
                            ""
                          }
                          alt={text.electricityImage}
                        />
                      ) : null}
                    </div>
                    <div className="worker-snapshot-row-actions">
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
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {showTools ? (
            <>
              <h3>
                {locale === "ar" ? "سجل الأداة الحالية" : "Current tool log"}
              </h3>
              <div className="admin-table-wrap worker-tools-table-wrap">
                <table className="admin-table">
                  <thead>
                    {activeTool === "stops" ? (
                      <tr>
                        <th>{locale === "ar" ? "الماكينة" : "Machine"}</th>
                        <th>{locale === "ar" ? "الأولوية" : "Priority"}</th>
                        <th>{locale === "ar" ? "السبب" : "Reason"}</th>
                        <th>{locale === "ar" ? "الاستجابة" : "Response"}</th>
                        <th>{locale === "ar" ? "الحالة" : "Status"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "checklist" ? (
                      <tr>
                        <th>{locale === "ar" ? "المرحلة" : "Phase"}</th>
                        <th>{locale === "ar" ? "التوقيع" : "Signature"}</th>
                        <th>{locale === "ar" ? "المهام" : "Tasks"}</th>
                        <th>{locale === "ar" ? "التاريخ" : "Created"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "waste" ? (
                      <tr>
                        <th>{locale === "ar" ? "الماكينة" : "Machine"}</th>
                        <th>{locale === "ar" ? "النوع" : "Machine type"}</th>
                        <th>{locale === "ar" ? "المادة" : "Material"}</th>
                        <th>{locale === "ar" ? "الهدر كغ" : "Waste Kg"}</th>
                        <th>{locale === "ar" ? "السبب" : "Reason"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "target" ? (
                      <tr>
                        <th>{locale === "ar" ? "التاريخ" : "Date"}</th>
                        <th>{locale === "ar" ? "الهدف" : "Target"}</th>
                        <th>{locale === "ar" ? "المنجز" : "Actual"}</th>
                        <th>{locale === "ar" ? "الفجوة" : "Gap"}</th>
                        <th>{locale === "ar" ? "ملاحظة" : "Note"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "kaizen" ? (
                      <tr>
                        <th>{locale === "ar" ? "العنوان" : "Title"}</th>
                        <th>{locale === "ar" ? "التفاصيل" : "Details"}</th>
                        <th>{locale === "ar" ? "الأثر" : "Impact"}</th>
                        <th>{locale === "ar" ? "الحالة" : "Status"}</th>
                        <th>{locale === "ar" ? "النقاط" : "Reward"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "quality" ? (
                      <tr>
                        <th>{locale === "ar" ? "الدفعة" : "Batch"}</th>
                        <th>{locale === "ar" ? "الماكينة" : "Machine"}</th>
                        <th>{locale === "ar" ? "النوع" : "Issue type"}</th>
                        <th>{locale === "ar" ? "التفاصيل" : "Details"}</th>
                        <th>{locale === "ar" ? "صورة" : "Image"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "micro" ? (
                      <tr>
                        <th>{locale === "ar" ? "الماكينة" : "Machine"}</th>
                        <th>{locale === "ar" ? "السبب" : "Reason"}</th>
                        <th>{locale === "ar" ? "المدة" : "Duration"}</th>
                        <th>{locale === "ar" ? "التاريخ" : "Created"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                    {activeTool === "anomaly" ? (
                      <tr>
                        <th>{locale === "ar" ? "الماكينة" : "Machine"}</th>
                        <th>{locale === "ar" ? "القراءة" : "Current kWh"}</th>
                        <th>{locale === "ar" ? "النسبة" : "Ratio"}</th>
                        <th>{locale === "ar" ? "الإنذار" : "Alert"}</th>
                        <th>{locale === "ar" ? "التاريخ" : "Created"}</th>
                        <th>{locale === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    ) : null}
                  </thead>
                  <tbody>
                    {activeTool === "stops"
                      ? stopLogs.slice(0, 20).map((row, index) => {
                          const id = Number(row.id ?? 0);
                          const resolvedAt = row.resolved_at;
                          return (
                            <tr key={`${activeTool}-${index}`}>
                              <td>{String(row.machine_label ?? "-")}</td>
                              <td>{String(row.priority ?? "NORMAL")}</td>
                              <td>{String(row.reason ?? "-")}</td>
                              <td>
                                {row.response_minutes
                                  ? `${Number(row.response_minutes).toFixed(1)} min`
                                  : "-"}
                              </td>
                              <td>{resolvedAt ? "RESOLVED" : "OPEN"}</td>
                              <td>
                                <div className="worker-snapshot-row-actions">
                                  {!resolvedAt && id > 0 ? (
                                    <button
                                      type="button"
                                      className="auth-button auth-button--ghost"
                                      onClick={() => void resolveStopAlert(id)}
                                    >
                                      {locale === "ar" ? "إغلاق" : "Resolve"}
                                    </button>
                                  ) : (
                                    <span className="admin-muted">-</span>
                                  )}
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
                              </td>
                            </tr>
                          );
                        })
                      : null}
                    {activeTool === "checklist"
                      ? checklists.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.shift_phase ?? "-")}</td>
                            <td>{String(row.digital_signature ?? "-")}</td>
                            <td>{String(row.tasks_json ?? "-")}</td>
                            <td>
                              {new Date(
                                String(row.created_at),
                              ).toLocaleString()}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {activeTool === "waste"
                      ? wasteLogs.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.machine_label ?? "-")}</td>
                            <td>{String(row.machine_type ?? "-")}</td>
                            <td>{String(row.material_type ?? "-")}</td>
                            <td>{Number(row.waste_kg ?? 0).toFixed(2)}</td>
                            <td>{String(row.reason ?? "-")}</td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {activeTool === "target"
                      ? targetLogs.slice(0, 20).map((row, index) => {
                          const target = Number(row.target_units ?? 0);
                          const actual = Number(row.actual_units ?? 0);
                          return (
                            <tr key={`${activeTool}-${index}`}>
                              <td>{String(row.target_date ?? "-")}</td>
                              <td>{target}</td>
                              <td>{actual}</td>
                              <td>{target - actual}</td>
                              <td>{String(row.note ?? "-")}</td>
                              <td>
                                <button
                                  type="button"
                                  className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                  disabled={saving}
                                  onClick={() => void deleteToolLog(row.id)}
                                >
                                  {text.removeEntry}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      : null}
                    {activeTool === "kaizen"
                      ? kaizenLogs.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.title ?? "-")}</td>
                            <td>{String(row.details ?? "-")}</td>
                            <td>{String(row.estimated_impact ?? "-")}</td>
                            <td>{String(row.review_status ?? "PENDING")}</td>
                            <td>{Number(row.reward_points ?? 0)}</td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {activeTool === "quality"
                      ? qualityLogs.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.batch_code ?? "-")}</td>
                            <td>{String(row.machine_label ?? "-")}</td>
                            <td>{String(row.issue_type ?? "-")}</td>
                            <td>{String(row.details ?? "-")}</td>
                            <td>
                              {row.issue_image ? (
                                <a
                                  href={
                                    normalizeSnapshotImagePath(
                                      String(row.issue_image),
                                    ) ?? "#"
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {locale === "ar" ? "عرض" : "View"}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {activeTool === "micro"
                      ? microLogs.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.machine_label ?? "-")}</td>
                            <td>{String(row.reason ?? "-")}</td>
                            <td>{Number(row.duration_minutes ?? 0)} min</td>
                            <td>
                              {new Date(
                                String(row.created_at),
                              ).toLocaleString()}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {activeTool === "anomaly"
                      ? anomalyLogs.slice(0, 20).map((row, index) => (
                          <tr key={`${activeTool}-${index}`}>
                            <td>{String(row.machine_label ?? "-")}</td>
                            <td>{Number(row.current_kwh ?? 0).toFixed(2)}</td>
                            <td>
                              {Number(row.threshold_ratio ?? 0).toFixed(2)}
                            </td>
                            <td>
                              {row.is_alert
                                ? locale === "ar"
                                  ? "نعم"
                                  : "Yes"
                                : locale === "ar"
                                  ? "لا"
                                  : "No"}
                            </td>
                            <td>
                              {new Date(
                                String(row.created_at),
                              ).toLocaleString()}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                                disabled={saving}
                                onClick={() => void deleteToolLog(row.id)}
                              >
                                {text.removeEntry}
                              </button>
                            </td>
                          </tr>
                        ))
                      : null}
                    {!stopLogs.length && activeTool === "stops" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!checklists.length && activeTool === "checklist" ? (
                      <tr>
                        <td colSpan={5}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!wasteLogs.length && activeTool === "waste" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!targetLogs.length && activeTool === "target" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!kaizenLogs.length && activeTool === "kaizen" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!qualityLogs.length && activeTool === "quality" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!microLogs.length && activeTool === "micro" ? (
                      <tr>
                        <td colSpan={5}>{text.noData}</td>
                      </tr>
                    ) : null}
                    {!anomalyLogs.length && activeTool === "anomaly" ? (
                      <tr>
                        <td colSpan={6}>{text.noData}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="worker-tools-mobile-list">
                {activeTool === "stops"
                  ? stopLogs.slice(0, 20).map((row, index) => {
                      const id = Number(row.id ?? 0);
                      const resolvedAt = row.resolved_at;
                      return (
                        <article
                          className="worker-tools-mobile-card"
                          key={`mobile-${activeTool}-${index}`}
                        >
                          <strong>{String(row.machine_label ?? "-")}</strong>
                          <span>{String(row.priority ?? "NORMAL")}</span>
                          <small>{String(row.reason ?? "-")}</small>
                          <small>
                            {resolvedAt ? "RESOLVED" : "OPEN"} •{" "}
                            {new Date(String(row.created_at)).toLocaleString()}
                          </small>
                          <div className="worker-snapshot-row-actions">
                            {!resolvedAt && id > 0 ? (
                              <button
                                type="button"
                                className="auth-button auth-button--ghost"
                                onClick={() => void resolveStopAlert(id)}
                              >
                                {locale === "ar" ? "إغلاق" : "Resolve"}
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
                        </article>
                      );
                    })
                  : null}

                {activeTool === "checklist"
                  ? checklists.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.shift_phase ?? "-")}</strong>
                        <span>{String(row.digital_signature ?? "-")}</span>
                        <small>{String(row.tasks_json ?? "-")}</small>
                        <small>
                          {new Date(String(row.created_at)).toLocaleString()}
                        </small>
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {activeTool === "waste"
                  ? wasteLogs.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.machine_label ?? "-")}</strong>
                        <span>{String(row.machine_type ?? "-")}</span>
                        <small>
                          {String(row.material_type ?? "-")} •{" "}
                          {Number(row.waste_kg ?? 0).toFixed(2)} kg
                        </small>
                        <small>{String(row.reason ?? "-")}</small>
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {activeTool === "target"
                  ? targetLogs.slice(0, 20).map((row, index) => {
                      const target = Number(row.target_units ?? 0);
                      const actual = Number(row.actual_units ?? 0);
                      return (
                        <article
                          className="worker-tools-mobile-card"
                          key={`mobile-${activeTool}-${index}`}
                        >
                          <strong>{String(row.target_date ?? "-")}</strong>
                          <span>
                            {locale === "ar" ? "الهدف" : "Target"}: {target}
                          </span>
                          <small>
                            {locale === "ar" ? "المنجز" : "Actual"}: {actual} •{" "}
                            {locale === "ar" ? "الفجوة" : "Gap"}:{" "}
                            {target - actual}
                          </small>
                          <small>{String(row.note ?? "-")}</small>
                          <div className="worker-snapshot-row-actions">
                            <button
                              type="button"
                              className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                              disabled={saving}
                              onClick={() => void deleteToolLog(row.id)}
                            >
                              {text.removeEntry}
                            </button>
                          </div>
                        </article>
                      );
                    })
                  : null}

                {activeTool === "kaizen"
                  ? kaizenLogs.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.title ?? "-")}</strong>
                        <span>{String(row.review_status ?? "PENDING")}</span>
                        <small>{String(row.details ?? "-")}</small>
                        <small>
                          {locale === "ar" ? "النقاط" : "Points"}:{" "}
                          {Number(row.reward_points ?? 0)}
                        </small>
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {activeTool === "quality"
                  ? qualityLogs.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.batch_code ?? "-")}</strong>
                        <span>{String(row.machine_label ?? "-")}</span>
                        <small>{String(row.issue_type ?? "-")}</small>
                        <small>{String(row.details ?? "-")}</small>
                        {row.issue_image ? (
                          <a
                            href={
                              normalizeSnapshotImagePath(
                                String(row.issue_image),
                              ) ?? "#"
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {locale === "ar" ? "عرض الصورة" : "View image"}
                          </a>
                        ) : null}
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {activeTool === "micro"
                  ? microLogs.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.machine_label ?? "-")}</strong>
                        <span>{String(row.reason ?? "-")}</span>
                        <small>{Number(row.duration_minutes ?? 0)} min</small>
                        <small>
                          {new Date(String(row.created_at)).toLocaleString()}
                        </small>
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {activeTool === "anomaly"
                  ? anomalyLogs.slice(0, 20).map((row, index) => (
                      <article
                        className="worker-tools-mobile-card"
                        key={`mobile-${activeTool}-${index}`}
                      >
                        <strong>{String(row.machine_label ?? "-")}</strong>
                        <span>
                          {Number(row.current_kwh ?? 0).toFixed(2)} kWh
                        </span>
                        <small>
                          {locale === "ar" ? "النسبة" : "Ratio"}:{" "}
                          {Number(row.threshold_ratio ?? 0).toFixed(2)}
                        </small>
                        <small>
                          {new Date(String(row.created_at)).toLocaleString()}
                        </small>
                        <div className="worker-snapshot-row-actions">
                          <button
                            type="button"
                            className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                            disabled={saving}
                            onClick={() => void deleteToolLog(row.id)}
                          >
                            {text.removeEntry}
                          </button>
                        </div>
                      </article>
                    ))
                  : null}

                {(activeTool === "stops" && !stopLogs.length) ||
                (activeTool === "checklist" && !checklists.length) ||
                (activeTool === "waste" && !wasteLogs.length) ||
                (activeTool === "target" && !targetLogs.length) ||
                (activeTool === "kaizen" && !kaizenLogs.length) ||
                (activeTool === "quality" && !qualityLogs.length) ||
                (activeTool === "micro" && !microLogs.length) ||
                (activeTool === "anomaly" && !anomalyLogs.length) ? (
                  <p>{text.noData}</p>
                ) : null}
              </div>
            </>
          ) : null}
        </article>
      </section>
    </ModulePageShell>
  );
}
