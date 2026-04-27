import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatarBadge } from "../../components/UserAvatarBadge";
import { API_BASE_URL, readApiError } from "../../lib/api";

type OpsSnapshot = {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
  machineCounterImage: string | null;
  electricityImage: string | null;
  createdById: number | null;
  createdByName: string | null;
};

type SnapshotImagePreview = {
  src: string;
  alt: string;
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

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...authHeader(),
    },
    credentials: "include",
  });
}

export function AdminSnapshotsPage() {
  const { locale } = useLocale();

  const [snapshots, setSnapshots] = useState<OpsSnapshot[]>([]);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [snapshotFromDate, setSnapshotFromDate] = useState("");
  const [snapshotToDate, setSnapshotToDate] = useState("");
  const [previewImage, setPreviewImage] = useState<SnapshotImagePreview | null>(
    null,
  );

  const text = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "لقطات التشغيل",
            subtitle:
              "صفحة مستقلة لمراقبة لقطات التشغيل وقراءات العدادات والكهرباء.",
            loading: "جارٍ التحميل...",
            latestSnapshots: "آخر اللقطات",
            machineCounter: "قراءة عداد الماكينة",
            electricityKwh: "قراءة الكهرباء (kWh)",
            machineCounterImage: "صورة عداد الماكينة",
            electricityImage: "صورة العداد الكهربائي",
            noSnapshots: "لا توجد لقطات بعد.",
            fromDate: "من تاريخ",
            toDate: "إلى تاريخ",
            applyFilter: "تطبيق الفلترة",
            clearFilter: "مسح الفلترة",
            exportLatest: "تصدير أحدث لقطة",
            exportReadingsCsv: "تصدير CSV للقراءات",
            closePreview: "إغلاق المعاينة",
            deltaFromPrevious: "الفرق عن السابقة",
          }
        : {
            title: "Operational Snapshots",
            subtitle:
              "Standalone page for monitoring operational snapshots and meter readings.",
            loading: "Loading...",
            latestSnapshots: "Latest snapshots",
            machineCounter: "Machine counter",
            electricityKwh: "Electricity (kWh)",
            machineCounterImage: "Machine counter image",
            electricityImage: "Electric meter image",
            noSnapshots: "No snapshots yet.",
            fromDate: "From date",
            toDate: "To date",
            applyFilter: "Apply filter",
            clearFilter: "Clear filter",
            exportLatest: "Export latest snapshot",
            exportReadingsCsv: "Export readings CSV",
            closePreview: "Close preview",
            deltaFromPrevious: "Delta from previous",
          },
    [locale],
  );

  const normalizeSnapshotImagePath = (value: string | null) => {
    if (!value) {
      return null;
    }

    if (value.startsWith("http")) {
      return value;
    }

    return `${API_BASE_URL}/${value.replace(/^prisma\/?pictures\//, "pictures/")}`;
  };

  const formatDateTime = (value: string | undefined) => {
    if (!value) {
      return locale === "ar" ? "غير متوفر" : "Not available";
    }

    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const loadSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    setSnapshotMessage("");

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
        loadError instanceof Error ? loadError.message : text.loading,
      );
    } finally {
      setLoadingSnapshots(false);
    }
  }, [snapshotFromDate, snapshotToDate, text.loading]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

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

  const applySnapshotFilter = () => {
    void loadSnapshots();
  };

  const clearSnapshotFilter = () => {
    setSnapshotFromDate("");
    setSnapshotToDate("");
  };

  const exportLatestSnapshot = () => {
    if (!latestSnapshot) {
      return;
    }

    const rows = [
      ["id", String(latestSnapshot.id)],
      ["createdAt", latestSnapshot.createdAt],
      ["machineLabel", latestSnapshot.machineLabel],
      ["machineCounter", String(latestSnapshot.machineCounter)],
      ["electricityKwh", latestSnapshot.electricityKwh.toFixed(2)],
      ["notes", latestSnapshot.notes ?? ""],
    ];

    downloadCsv(`snapshot-${latestSnapshot.id}.csv`, ["field", "value"], rows);
  };

  const exportReadingsCsv = () => {
    if (!snapshots.length) {
      return;
    }

    const rows = snapshots.map((snapshot) => [
      String(snapshot.id),
      snapshot.createdAt,
      snapshot.machineLabel,
      String(snapshot.machineCounter),
      snapshot.electricityKwh.toFixed(2),
      snapshot.notes ?? "",
    ]);

    downloadCsv(
      `snapshots-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "id",
        "createdAt",
        "machineLabel",
        "machineCounter",
        "electricityKwh",
        "notes",
      ],
      rows,
    );
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="admin-header__actions">
            <UserAvatarBadge size="sm" />
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <div>
              <h2>{text.latestSnapshots}</h2>
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
            ) : null}
            {snapshotMessage ? (
              <p className="admin-muted">{snapshotMessage}</p>
            ) : null}
            {!loadingSnapshots && !snapshots.length ? (
              <p className="admin-muted">{text.noSnapshots}</p>
            ) : null}

            {snapshots.map((item) => (
              <article className="settings-snapshot-item" key={item.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: ".25rem" }}>
                  <strong>{item.machineLabel}</strong>
                  {item.createdByName && (
                    <span style={{ fontSize: ".78rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "20px", padding: "2px 10px", color: "var(--text-secondary)", fontWeight: 600 }}>
                      👤 {item.createdByName}
                    </span>
                  )}
                </div>
                <p>
                  {text.machineCounter}: {item.machineCounter}
                </p>
                <p>
                  {text.electricityKwh}: {item.electricityKwh.toFixed(2)}
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
                          normalizeSnapshotImagePath(item.electricityImage) ??
                          ""
                        }
                        alt={text.electricityImage}
                      />
                    </button>
                  ) : null}
                </div>
                <small>{formatDateTime(item.createdAt)}</small>
              </article>
            ))}
          </div>
        </section>
      </section>

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
    </main>
  );
}
