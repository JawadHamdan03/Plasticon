import { useState, useEffect } from "react";
import { ClipboardList, Factory, Clock, Zap, Users, AlertTriangle } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { AIPageHeader, StatCard, ReportCard, AIButton, AIEmptyState, FormField, inputCss, AIKeyframes } from "./_shared";

type Shift = { id: number; name: string };

type HandoverResult = {
  handover: string;
  stats: { totalPieces: number; totalDowntime: number; totalKwh: number; staffCount: number; machinesWithIssues: number };
  date: string; shift: string; generatedAt: string;
};

export function ShiftHandoverPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [shiftId, setShiftId] = useState("");
  const [shifts, setShifts]   = useState<Shift[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<HandoverResult | null>(null);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/shifts`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { data?: Shift[] })?.data ?? [];
        setShifts(arr as Shift[]);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const body: Record<string, unknown> = { date };
      if (shiftId) body.shiftId = Number(shiftId);
      const res = await fetch(`${API_BASE_URL}/ai/shift-handover`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((e as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as HandoverResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <AIKeyframes />

      <AIPageHeader
        icon={ClipboardList}
        gradient={["#7c3aed", "#6366f1"]}
        title={"ملخص تسليم الشفت"}
        subtitle={"يولّد الذكاء الاصطناعي ملاحظة تسليم شاملة للشفت القادم بناءً على بيانات الإنتاج الحية"}
        badge="GPT-4o"
      />

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", padding: "1.1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
        <FormField label={"التاريخ"}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputCss, width: "auto", minWidth: 160 }} />
        </FormField>

        <FormField label={"الشفت (اختياري)"}>
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            style={{ ...inputCss, width: "auto", minWidth: 180, cursor: "pointer", appearance: "none" }}
          >
            <option value="">{"كل الشفتات"}</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <AIButton gradient={["#7c3aed", "#6366f1"]} onClick={() => void generate()} loading={loading} loadingText={"جارٍ التوليد…"} icon={ClipboardList}>
            {"توليد ملاحظة التسليم"}
          </AIButton>
        </div>
      </div>

      {error && (
        <div style={{ padding: ".85rem 1rem", background: "#fee2e2", borderRadius: 10, color: "#dc2626", fontSize: ".85rem", marginBottom: "1.25rem", border: "1px solid #fecaca", animation: "ai-fadein .25s" }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "ai-fadein .3s" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <StatCard label={"القطع المنتجة"} value={result.stats.totalPieces.toLocaleString()} color="#6366f1" icon={Factory} />
            <StatCard label={"وقت التوقف"} value={`${result.stats.totalDowntime} min`} color={result.stats.totalDowntime > 120 ? "#dc2626" : "#d97706"} icon={Clock} />
            <StatCard label={"الكهرباء (kWh)"} value={result.stats.totalKwh.toFixed(1)} color="#0ea5e9" icon={Zap} />
            <StatCard label={"الموظفون"} value={result.stats.staffCount} color="#10b981" icon={Users} />
            <StatCard
              label={"ماكينات بمشاكل"}
              value={result.stats.machinesWithIssues}
              color={result.stats.machinesWithIssues > 0 ? "#dc2626" : "#16a34a"}
              icon={AlertTriangle}
              subtext={result.stats.machinesWithIssues === 0 ? ("جميعها سليمة") : undefined}
            />
          </div>

          {/* Handover note */}
          <ReportCard
            title={"ملاحظة تسليم الشفت"}
            subtitle={`${result.date} — ${result.shift}`}
            report={result.handover}
            onRegenerate={() => void generate()}
            loading={loading}
            accentColor="#7c3aed"
          />
        </div>
      )}

      {!result && !loading && (
        <AIEmptyState
          icon={ClipboardList}
          color="#7c3aed"
          title={"اختر التاريخ والشفت لتوليد التسليم"}
          description={"يجمع النظام بيانات الإنتاج، الصيانة، الحضور، والكهرباء ليولّد ملاحظة تسليم شاملة."}
        />
      )}
    </div>
  );
}
