import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type FeatureKey = "stops" | "checklist" | "waste" | "target" | "kaizen" | "quality" | "micro" | "anomaly";

type OverviewItem = {
  feature: FeatureKey;
  id: number;
  user_id: number;
  worker_name: string;
  created_at: string;
  title: string;
  details: string;
};

type OverviewSummary = Record<FeatureKey, number> & { total: number };

type Overview = {
  summary: OverviewSummary;
  items: OverviewItem[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fmtDateTime(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(d));
}

const TAB_META: Record<FeatureKey, { en: string; ar: string; icon: string; color: string }> = {
  stops:     { en: "Machine Stops",      ar: "توقف الماكينات",   icon: "🛑", color: "#ef4444" },
  checklist: { en: "Daily Checklist",    ar: "قائمة اليوم",      icon: "✅", color: "#10b981" },
  waste:     { en: "Material Waste",     ar: "هدر المواد",       icon: "🗑️", color: "#f59e0b" },
  target:    { en: "Daily Targets",      ar: "الأهداف اليومية",  icon: "🎯", color: "#3b82f6" },
  kaizen:    { en: "Kaizen Ideas",       ar: "أفكار كايزن",      icon: "💡", color: "#8b5cf6" },
  quality:   { en: "Quality Issues",     ar: "مشاكل الجودة",     icon: "🔍", color: "#ec4899" },
  micro:     { en: "Micro Stops",        ar: "توقفات مايكرو",    icon: "⏱️", color: "#6366f1" },
  anomaly:   { en: "Electricity Alerts", ar: "تنبيهات الكهرباء", icon: "⚡", color: "#f97316" },
};

const TAB_ORDER: FeatureKey[] = ["stops", "checklist", "waste", "target", "kaizen", "quality", "micro", "anomaly"];

// ─── Components ─────────────────────────────────────────────────────────────

function RecordCard({ item, isAr }: { item: OverviewItem; isAr: boolean }) {
  const meta = TAB_META[item.feature];
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: ".85rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: ".4rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: ".4rem" }}>
        <span style={{ fontWeight: 700, fontSize: ".9rem" }}>
          {meta.icon} {item.title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{
            fontSize: ".72rem", background: "var(--bg-surface-2, var(--bg-surface))",
            border: "1px solid var(--border-default)", borderRadius: "20px",
            padding: "1px 8px", color: "var(--text-secondary)", fontWeight: 600,
          }}>
            👤 {item.worker_name}
          </span>
          <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>
            {fmtDateTime(item.created_at)}
          </span>
        </div>
      </div>
      {item.details && (
        <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>{item.details}</p>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>{icon}</div>
      <p style={{ margin: 0, fontSize: ".9rem" }}>{message}</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminWorkerRecordsPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FeatureKey>("stops");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/worker-tools/admin/overview?limit=500`, {
        credentials: "include",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setOverview((await res.json()) as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const itemsByTab = useMemo<Record<FeatureKey, OverviewItem[]>>(() => {
    const map = {} as Record<FeatureKey, OverviewItem[]>;
    for (const key of TAB_ORDER) map[key] = [];
    if (overview) {
      for (const item of overview.items) {
        map[item.feature]?.push(item);
      }
    }
    return map;
  }, [overview]);

  const summary = overview?.summary;

  return (
    <ModulePageShell
      title={"سجلات العمال"}
      subtitle={"جميع السجلات المقدمة من العمال مصنفة حسب النوع"}
      actions={
        <button className="btn btn--ghost btn--sm" onClick={() => void loadOverview()}>
          <RefreshCw size={14} /> {"تحديث"}
        </button>
      }
    >
      {/* Summary bar */}
      {summary && (
        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", background: "#3b82f614", border: "1px solid #3b82f633", borderRadius: "var(--radius-lg)", padding: ".45rem .9rem" }}>
            <Users size={14} style={{ color: "#3b82f6" }} />
            <span style={{ fontWeight: 800, color: "#3b82f6" }}>{summary.total}</span>
            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{"إجمالي السجلات"}</span>
          </div>
          {TAB_ORDER.map((key) => {
            const meta = TAB_META[key];
            const count = summary[key] ?? 0;
            if (!count) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: ".3rem", background: meta.color + "14", border: `1px solid ${meta.color}33`, borderRadius: "var(--radius-lg)", padding: ".45rem .8rem", cursor: "pointer" }}
                onClick={() => setActiveTab(key)}>
                <span>{meta.icon}</span>
                <span style={{ fontWeight: 700, color: meta.color }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1.25rem", borderBottom: "2px solid var(--border-default)", paddingBottom: "1rem" }}>
        {TAB_ORDER.map((key) => {
          const meta = TAB_META[key];
          const count = summary?.[key] ?? 0;
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: ".35rem",
                padding: ".45rem .9rem", borderRadius: "var(--radius-lg)",
                border: active ? `2px solid ${meta.color}` : "2px solid transparent",
                background: active ? `${meta.color}14` : "var(--bg-surface)",
                color: active ? meta.color : "var(--text-secondary)",
                fontWeight: active ? 700 : 500, fontSize: ".83rem", cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <span>{meta.icon}</span>
              {meta.ar}
              {count > 0 && (
                <span style={{ background: active ? meta.color : "var(--border-default)", color: active ? "#fff" : "var(--text-secondary)", borderRadius: "20px", padding: "0 6px", fontSize: ".72rem", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : (
        <>
          {itemsByTab[activeTab].length === 0 ? (
            <EmptyState
              icon={TAB_META[activeTab].icon}
              message="لا توجد سجلات لهذه الفئة"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {itemsByTab[activeTab].map((item) => (
                <RecordCard key={`${item.feature}-${item.id}`} item={item} isAr={isAr} />
              ))}
            </div>
          )}
        </>
      )}
    </ModulePageShell>
  );
}
