import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Package,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Box,
  Layers,
} from "lucide-react";

type RawMaterial = {
  id: number;
  name: string;
  currentQuantity: number;
  unit: string;
  minQuantity?: number | null;
};

type ProductionRecord = {
  id: number;
  cartonsCount: number;
  totalPieces?: number;
  piecesPerCarton?: number;
  machine?: { id: number; type?: string | null };
};

type SaleItem = { machineType: string; quantity: number };
type SaleRecord = { id: number; items: SaleItem[] };

type FinishedBucket = { boxes: number; pieces: number; piecesPerCarton: number };

const HDPE_KG_PER_BAG = 25;
const LDPE_KG_PER_BAG = 25;
const PET_KG_PER_BAG_AVG = 25;
const PREFORM_PIECES_PER_CARTON = 7200;
const CAPS_PIECES_PER_CARTON = 6000;

function classifyProductType(value?: string | null): "PREFORM" | "CAPS" | "OTHER" {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "PREFORM" || v.includes("PREFORM") || v.includes("PET")) return "PREFORM";
  if (v === "CAPS" || v.includes("CAP")) return "CAPS";
  return "OTHER";
}

function classifyMaterial(name: string): "PET" | "HDPE" | "LDPE" | "UV" | "COLOR" | "FINISHED" | "OTHER" {
  const n = name.trim().toUpperCase();
  // Finished goods — check before raw material keywords to avoid false matches
  if (n.includes("PREFORM") || n === "CAPS") return "FINISHED";
  if (n.includes("PET")) return "PET";
  if (n.includes("HDPE")) return "HDPE";
  if (n.includes("LDPE")) return "LDPE";
  if (n.includes("UV")) return "UV";
  if (n.includes("COLOR") || n.includes("COLOUR") || n.includes("MASTERBATCH")) return "COLOR";
  return "OTHER";
}

const MATERIAL_COLORS: Record<string, string> = {
  PET: "#3b82f6",
  HDPE: "#10b981",
  LDPE: "#f59e0b",
  UV: "#8b5cf6",
  COLOR: "#ec4899",
  FINISHED: "#f97316",
  OTHER: "#6b7280",
};

export function WarehousePage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const loc = (en: string, ar: string) => (isAr ? ar : en);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [matRes, prodRes, salesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/materials`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/production/all`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/sales/all`, { credentials: "include" }),
      ]);

      if (matRes.ok) setMaterials(await matRes.json() as RawMaterial[]);
      if (prodRes.ok) setProductions(await prodRes.json() as ProductionRecord[]);
      if (salesRes.ok) setSales(await salesRes.json() as SaleRecord[]);

      if (!matRes.ok && !prodRes.ok) {
        setError(loc("Failed to load warehouse data.", "فشل تحميل بيانات المستودع."));
      }
      setLastRefresh(new Date());
    } catch {
      setError(loc("Network error.", "خطأ في الشبكة."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Finished goods calculation
  const finishedGoods = useMemo<{ preform: FinishedBucket; caps: FinishedBucket }>(() => {
    const produced = { preform: 0, caps: 0 };
    const sold = { preform: 0, caps: 0 };
    const ppcMap: Record<"PREFORM" | "CAPS", number> = {
      PREFORM: PREFORM_PIECES_PER_CARTON,
      CAPS: CAPS_PIECES_PER_CARTON,
    };

    for (const rec of productions) {
      const type = classifyProductType(rec.machine?.type);
      const cartons = Number(rec.cartonsCount ?? 0);
      if (!Number.isFinite(cartons) || cartons <= 0) continue;
      if (type === "PREFORM") produced.preform += cartons;
      else if (type === "CAPS") produced.caps += cartons;

      const ppc = Number(rec.piecesPerCarton ?? 0);
      if ((type === "PREFORM" || type === "CAPS") && ppc > 0) ppcMap[type] = ppc;
    }

    for (const sale of sales) {
      for (const item of sale.items ?? []) {
        const qty = Number(item.quantity ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        const type = classifyProductType(item.machineType);
        if (type === "PREFORM") sold.preform += qty;
        else if (type === "CAPS") sold.caps += qty;
      }
    }

    const preformBoxes = Math.max(produced.preform - sold.preform, 0);
    const capsBoxes = Math.max(produced.caps - sold.caps, 0);

    return {
      preform: {
        boxes: preformBoxes,
        piecesPerCarton: ppcMap.PREFORM,
        pieces: preformBoxes * ppcMap.PREFORM,
      },
      caps: {
        boxes: capsBoxes,
        piecesPerCarton: ppcMap.CAPS,
        pieces: capsBoxes * ppcMap.CAPS,
      },
    };
  }, [productions, sales]);

  // Augment materials with bag counts and type classification
  const enrichedMaterials = useMemo(() => {
    return materials.map((m) => {
      const type = classifyMaterial(m.name);
      const kg = Number(m.currentQuantity ?? 0);
      let bags: number | null = null;
      let bagNote: string | null = null;

      if (type === "HDPE") {
        bags = Math.floor(kg / HDPE_KG_PER_BAG);
        bagNote = `${HDPE_KG_PER_BAG} kg/bag`;
      } else if (type === "LDPE") {
        bags = Math.floor(kg / LDPE_KG_PER_BAG);
        bagNote = `${LDPE_KG_PER_BAG} kg/bag`;
      } else if (type === "PET") {
        bags = Math.floor(kg / PET_KG_PER_BAG_AVG);
        bagNote = loc("22–30 kg/bag (variable)", "22–30 كغ/كيس (متغير)");
      }

      const min = Number(m.minQuantity ?? 0);
      const isLow = min > 0 && kg <= min * 1.2;
      const isCritical = min > 0 && kg <= min;

      return { ...m, type, kg, bags, bagNote, isLow, isCritical, color: MATERIAL_COLORS[type] };
    });
  }, [materials, isAr]);

  const stockSummary = useMemo(() => ({
    totalKg: enrichedMaterials.reduce((s, m) => s + m.kg, 0),
    lowCount: enrichedMaterials.filter((m) => m.isLow).length,
    criticalCount: enrichedMaterials.filter((m) => m.isCritical).length,
    finishedBoxes: finishedGoods.preform.boxes + finishedGoods.caps.boxes,
    finishedPieces: finishedGoods.preform.pieces + finishedGoods.caps.pieces,
  }), [enrichedMaterials, finishedGoods]);

  return (
    <ModulePageShell
      title={loc("Warehouse", "المستودع")}
      subtitle={loc(
        "Real-time raw materials stock and finished goods inventory.",
        "مخزون المواد الخام والمنتجات الجاهزة في الوقت الفعلي.",
      )}
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loc("Refresh", "تحديث")}
        </Button>
      }
    >
      {error ? <div className="auth-alert auth-alert--error mb-4">{error}</div> : null}
      {lastRefresh ? (
        <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {loc("Last updated:", "آخر تحديث:")} {lastRefresh.toLocaleTimeString()}
        </p>
      ) : null}

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          {
            label: loc("Total Raw Materials", "إجمالي المواد الخام"),
            value: `${stockSummary.totalKg.toLocaleString()} kg`,
            gradient: "bg-linear-to-br from-blue-500 to-blue-700",
            icon: <Package size={20} />,
          },
          {
            label: loc("Low Stock Alerts", "تنبيهات المخزون المنخفض"),
            value: stockSummary.lowCount.toString(),
            gradient: stockSummary.lowCount > 0 ? "bg-linear-to-br from-amber-500 to-orange-600" : "bg-linear-to-br from-green-500 to-emerald-700",
            icon: <AlertTriangle size={20} />,
          },
          {
            label: loc("Finished Goods (boxes)", "البضاعة الجاهزة (صناديق)"),
            value: stockSummary.finishedBoxes.toLocaleString(),
            gradient: "bg-linear-to-br from-purple-500 to-purple-700",
            icon: <Box size={20} />,
          },
          {
            label: loc("Finished Goods (pieces)", "البضاعة الجاهزة (قطع)"),
            value: stockSummary.finishedPieces.toLocaleString(),
            gradient: "bg-linear-to-br from-orange-500 to-orange-700",
            icon: <Layers size={20} />,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className={`${kpi.gradient} p-4 text-white`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
              <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, opacity: .85 }}>{kpi.label}</p>
              <span style={{ opacity: .7 }}>{kpi.icon}</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-.03em" }}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Finished Goods */}
      <Card className="p-5 mb-5">
        <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}>
            <CheckCircle size={18} color="#22c55e" />
            {loc("Finished Goods Stock", "مخزون البضاعة الجاهزة")}
          </h2>
          <p style={{ margin: ".25rem 0 0", fontSize: ".825rem", color: "var(--text-secondary)" }}>
            {loc("Calculated: total production − total sales", "محسوب: إجمالي الإنتاج − إجمالي المبيعات")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
          {[
            { label: loc("Preform (PET)", "بريفورم (PET)"), data: finishedGoods.preform, color: "#3b82f6" },
            { label: loc("Caps (HDPE/LDPE)", "أغطية (HDPE/LDPE)"), data: finishedGoods.caps, color: "#f97316" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-lg)",
                border: `2px solid ${item.color}22`,
                background: `${item.color}08`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".75rem" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: item.color }} />
                <strong style={{ fontSize: ".95rem" }}>{item.label}</strong>
              </div>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: item.color }}>
                {item.data.boxes.toLocaleString()}
                <span style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--text-secondary)", marginLeft: ".35rem" }}>
                  {loc("boxes", "صندوق")}
                </span>
              </p>
              <p style={{ margin: ".3rem 0 0", fontSize: ".85rem", color: "var(--text-secondary)" }}>
                {item.data.piecesPerCarton.toLocaleString()} {loc("pcs/box", "قطعة/صندوق")}
                {" · "}
                <strong>{item.data.pieces.toLocaleString()}</strong> {loc("total pieces", "قطعة إجمالي")}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Raw Materials */}
      <Card className="p-5 mb-5">
        <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}>
            <Package size={18} color="#3b82f6" />
            {loc("Raw Materials Stock", "مخزون المواد الخام")}
          </h2>
        </div>

        {loading && materials.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>{loc("Loading…", "جارٍ التحميل…")}</p>
        ) : null}

        {!loading && materials.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>
            {loc("No raw materials found.", "لا توجد مواد خام.")}
          </p>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: ".75rem" }}>
          {enrichedMaterials.map((mat) => {
            const statusColor = mat.isCritical ? "#ef4444" : mat.isLow ? "#f59e0b" : "#22c55e";
            const statusLabel = mat.isCritical
              ? loc("Critical", "حرج")
              : mat.isLow
              ? loc("Low", "منخفض")
              : loc("OK", "جيد");

            return (
              <div
                key={mat.id}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${mat.isCritical ? "#ef444433" : mat.isLow ? "#f59e0b33" : "var(--border-default)"}`,
                  background: mat.isCritical ? "#ef44440a" : mat.isLow ? "#f59e0b0a" : "var(--bg-card)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: mat.color }} />
                    <strong style={{ fontSize: ".9rem" }}>{mat.name}</strong>
                  </div>
                  <span style={{
                    padding: ".15rem .5rem",
                    borderRadius: 999,
                    fontSize: ".72rem",
                    fontWeight: 700,
                    background: `${statusColor}20`,
                    color: statusColor,
                  }}>
                    {mat.isLow ? <TrendingDown size={11} style={{ display: "inline", marginRight: 3 }} /> : null}
                    {statusLabel}
                  </span>
                </div>

                {/* Quantity in kg */}
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
                  {mat.kg.toLocaleString()}
                  <span style={{ fontSize: ".8rem", fontWeight: 500, color: "var(--text-secondary)", marginLeft: ".25rem" }}>
                    {mat.unit}
                  </span>
                </p>

                {/* Bag estimation */}
                {mat.bags !== null ? (
                  <p style={{ margin: ".3rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                    ≈ {mat.bags.toLocaleString()} {loc("bags", "أكياس")}
                    {mat.bagNote ? ` · ${mat.bagNote}` : ""}
                  </p>
                ) : null}

                {/* Min quantity indicator */}
                {mat.minQuantity && mat.minQuantity > 0 ? (
                  <p style={{ margin: ".2rem 0 0", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    {loc("Min:", "الحد الأدنى:")} {Number(mat.minQuantity).toLocaleString()} {mat.unit}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Material breakdown by type */}
      {enrichedMaterials.length > 0 ? (
        <Card className="p-5">
          <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem", marginBottom: "1.25rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              {loc("Stock by Type", "المخزون حسب النوع")}
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{loc("Material", "المادة")}</th>
                  <th>{loc("Type", "النوع")}</th>
                  <th>{loc("Qty (kg)", "الكمية (كغ)")}</th>
                  <th>{loc("Est. Bags", "أكياس تقديرية")}</th>
                  <th>{loc("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {enrichedMaterials.map((mat) => {
                  const statusColor = mat.isCritical ? "#ef4444" : mat.isLow ? "#f59e0b" : "#22c55e";
                  const statusLabel = mat.isCritical
                    ? loc("Critical", "حرج")
                    : mat.isLow
                    ? loc("Low", "منخفض")
                    : loc("OK", "جيد");
                  return (
                    <tr key={mat.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: mat.color, flexShrink: 0 }} />
                          {mat.name}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>{mat.type}</td>
                      <td><strong>{mat.kg.toLocaleString()}</strong> {mat.unit}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {mat.bags !== null ? `~${mat.bags}` : "—"}
                      </td>
                      <td>
                        <span style={{
                          padding: ".2rem .6rem",
                          borderRadius: 999,
                          fontSize: ".78rem",
                          fontWeight: 700,
                          background: `${statusColor}20`,
                          color: statusColor,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </ModulePageShell>
  );
}
