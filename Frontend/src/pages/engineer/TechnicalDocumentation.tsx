import { useState } from "react";
import { FileText, Download, Clock } from "lucide-react";
import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

const DOCS = [
  { id: 1, title: "Machine A - User Manual",        category: "Manual",      updated: "2026-03-15", downloads: 24 },
  { id: 2, title: "Machine B - Maintenance Guide",  category: "Maintenance", updated: "2026-02-20", downloads: 18 },
  { id: 3, title: "Safety Procedures Overview",     category: "Safety",      updated: "2026-01-10", downloads: 42 },
  { id: 4, title: "Calibration Standards",          category: "Reference",   updated: "2026-03-01", downloads: 12 },
  { id: 5, title: "Troubleshooting Guide",          category: "Support",     updated: "2026-02-28", downloads: 35 },
];

const CATEGORIES = ["All", "Manual", "Maintenance", "Safety", "Reference", "Support"];

const CAT_META: Record<string, { color: string; bg: string }> = {
  Manual:      { color: "#1d4ed8", bg: "#dbeafe" },
  Maintenance: { color: "#d97706", bg: "#fef3c7" },
  Safety:      { color: "#dc2626", bg: "#fee2e2" },
  Reference:   { color: "#7c3aed", bg: "#ede9fe" },
  Support:     { color: "#059669", bg: "#d1fae5" },
};

export default function TechnicalDocumentation() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [activeCat, setActiveCat] = useState("All");

  const recentCount = DOCS.filter(d => new Date(d.updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  const totalDownloads = DOCS.reduce((s, d) => s + d.downloads, 0);
  const filtered = activeCat === "All" ? DOCS : DOCS.filter(d => d.category === activeCat);

  return (
    <ModulePageShell
      title={nav("Technical Documentation", "التوثيق التقني")}
      subtitle={nav("Access and manage technical resources and manuals", "الوصول وإدارة الموارد التقنية والكتيبات")}
      icon={<FileText size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Documents", "إجمالي الوثائق"), value: DOCS.length, icon: "📄", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Recently Updated", "محدث مؤخراً"), value: recentCount, icon: "🕐", color: "#059669", bg: "#d1fae5" },
          { label: nav("Total Downloads", "إجمالي التنزيلات"), value: totalDownloads, icon: "⬇️", color: "#d97706", bg: "#fef3c7" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-all"
            style={{
              background: activeCat === cat ? "#f97316" : "var(--surface-2)",
              color: activeCat === cat ? "#fff" : "var(--text-secondary)",
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(doc => {
          const meta = CAT_META[doc.category] ?? { color: "#6b7280", bg: "#f3f4f6" };
          return (
            <Card key={doc.id} className="p-0 overflow-hidden flex flex-col">
              <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                className="flex items-center gap-2">
                <FileText size={18} style={{ color: meta.color, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[var(--text-primary)] truncate">{doc.title}</p>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: meta.color + "20", color: meta.color }}>{doc.category}</span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock size={12} />
                  <span>{nav("Updated", "تحديث")}: {new Date(doc.updated).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Download size={12} />
                  <span>{doc.downloads} {nav("downloads", "تنزيل")}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ModulePageShell>
  );
}
