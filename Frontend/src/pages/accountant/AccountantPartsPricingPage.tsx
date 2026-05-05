import { useState, useCallback, useEffect } from "react";
import {
  DollarSign, Package, ChevronDown, ChevronUp,
  CheckCircle, Clock, Image, AlertCircle, X, Filter,
} from "lucide-react";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

type InventoryItem = {
  id: number;
  partName: string;
  quantity: number;
  imagePath: string | null;
  unitPrice: number | null;
  pricedBy: { id: number; fullName: string } | null;
  pricedAt: string | null;
};

type Inventory = {
  id: number;
  month: number;
  year: number;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED";
  notes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  engineer: { id: number; fullName: string; role: string };
  items: InventoryItem[];
};

async function api<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((json as any).message ?? "Error");
  return json;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_META = {
  SUBMITTED: { label: "Submitted",       color: "#d97706", bg: "#fef3c7" },
  REVIEWED:  { label: "Reviewed",        color: "#059669", bg: "#d1fae5" },
  DRAFT:     { label: "Draft",           color: "#6b7280", bg: "#f3f4f6" },
};

export function AccountantPartsPricingPage() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"ALL" | "SUBMITTED" | "REVIEWED">("SUBMITTED");
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [savingItem, setSavingItem] = useState<number | null>(null);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<Inventory[]>("GET", "/engineer-inventory/all");
      setInventories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = inventories.filter((inv) => filter === "ALL" ? true : inv.status === filter);

  const handleSetPrice = async (itemId: number) => {
    const raw = priceInputs[itemId];
    const price = Number(raw);
    if (!raw || isNaN(price) || price < 0) { setError(nav("Please enter a valid price (0 or more)", "يرجى إدخال سعر صحيح (0 أو أكثر)")); return; }
    setSavingItem(itemId);
    try {
      await api("PATCH", `/engineer-inventory/items/${itemId}/price`, { unitPrice: price });
      setSavedItems((s) => new Set([...s, itemId]));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save price");
    } finally {
      setSavingItem(null);
    }
  };

  const handleReview = async (inventoryId: number) => {
    const inv = inventories.find((i) => i.id === inventoryId);
    if (!inv) return;
    if (!(await confirmDialog(`Mark inventory for ${MONTHS[inv.month - 1]} ${inv.year} as Reviewed?`))) return;
    setReviewingId(inventoryId);
    try {
      await api("PATCH", `/engineer-inventory/${inventoryId}/review`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark as reviewed");
    } finally {
      setReviewingId(null);
    }
  };

  const totalValue = (items: InventoryItem[]) => items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);
  const allPriced = (items: InventoryItem[]) => items.length > 0 && items.every((i) => i.unitPrice !== null);

  const submittedCount = inventories.filter((i) => i.status === "SUBMITTED").length;
  const reviewedCount = inventories.filter((i) => i.status === "REVIEWED").length;
  const pendingPricing = inventories.filter((i) => i.status === "SUBMITTED" && !allPriced(i.items)).length;

  return (
    <ModulePageShell
      title={nav("Parts Pricing", "تسعير القطع")}
      subtitle={nav("Review engineer inventory reports and set unit prices", "مراجعة تقارير مخزون المهندسين وتحديد أسعار الوحدات")}
      icon={<DollarSign size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Awaiting Pricing", "في انتظار التسعير"), value: submittedCount, icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Reviewed", "تمت المراجعة"), value: reviewedCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Incomplete Pricing", "تسعير غير مكتمل"), value: pendingPricing, icon: "⚠️", color: "#dc2626", bg: "#fee2e2" },
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

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-[var(--text-secondary)]" />
        {(["SUBMITTED", "REVIEWED", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${filter === f ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent)]"}`}
          >
            {f === "ALL" ? nav("All", "الكل") : f === "SUBMITTED" ? nav("Awaiting Pricing", "في انتظار التسعير") : nav("Reviewed", "تمت المراجعة")}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={15} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")}><X size={15} /></button>
        </div>
      )}

      {/* Inventory List */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filter === "SUBMITTED" ? nav("No reports awaiting pricing", "لا توجد تقارير في انتظار التسعير") : nav("No reports found", "لا توجد تقارير")}
          </p>
          <p className="text-sm mt-1">
            {filter === "SUBMITTED" ? nav("Engineers haven't submitted any inventory reports yet.", "لم يقدم المهندسون أي تقارير مخزون بعد.") : nav("Try changing the filter above.", "جرب تغيير الفلتر أعلاه.")}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((inv) => {
            const isExpanded = expandedId === inv.id;
            const total = totalValue(inv.items);
            const done = allPriced(inv.items);
            const statusMeta = STATUS_META[inv.status] ?? STATUS_META.DRAFT;

            return (
              <Card key={inv.id} className="p-0 overflow-hidden">
                {/* Card Header (clickable) */}
                <div
                  className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--bg-surface-2,#f8fafc)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: statusMeta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={18} style={{ color: statusMeta.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-[var(--text-primary)]">{MONTHS[inv.month - 1]} {inv.year}</p>
                        <span style={{ background: statusMeta.bg, color: statusMeta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>
                          {statusMeta.label}
                        </span>
                        {done && inv.status !== "REVIEWED" && (
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>
                            {nav("All Priced", "مسعّر بالكامل")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {nav("By", "بواسطة")} {inv.engineer.fullName} · {inv.items.length} {nav("parts", "قطعة")}
                        {inv.submittedAt ? ` · ${nav("Submitted", "قُدِّم")} ${new Date(inv.submittedAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {total > 0 && (
                      <span className="text-sm font-bold text-green-600 hidden sm:block">
                        {nav("Total", "الإجمالي")}: ${total.toFixed(2)}
                      </span>
                    )}
                    {inv.status === "SUBMITTED" && done && (
                      <button
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
                        onClick={(e) => { e.stopPropagation(); void handleReview(inv.id); }}
                        disabled={reviewingId === inv.id}
                      >
                        <CheckCircle size={12} />
                        {reviewingId === inv.id ? nav("Reviewing…", "جارٍ المراجعة...") : nav("Mark Reviewed", "تأشير كمراجع")}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-[var(--text-secondary)]" /> : <ChevronDown size={18} className="text-[var(--text-secondary)]" />}
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-default)] p-4">
                    {inv.notes && (
                      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
                        <strong>{nav("Note:", "ملاحظة:")}</strong> {inv.notes}
                      </div>
                    )}

                    {inv.items.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)] text-center py-6">{nav("No parts in this inventory.", "لا توجد قطع في هذا المخزون.")}</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--bg-surface-2,#f8fafc)] border-b border-[var(--border-default)]">
                            <tr>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">#</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Part Name", "اسم القطعة")}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Qty", "الكمية")}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Photo", "صورة")}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Unit Price ($)", "سعر الوحدة ($)")}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Total", "الإجمالي")}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">{nav("Status", "الحالة")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-default)]">
                            {inv.items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-[var(--bg-surface-2,#f8fafc)] transition-colors">
                                <td className="py-2.5 px-3 text-xs text-[var(--text-secondary)]">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{item.partName}</td>
                                <td className="py-2.5 px-3">
                                  <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.imagePath ? (
                                    <a
                                      href={`${API_BASE_URL.replace("/api", "")}/pictures/${item.imagePath.split("/").pop()}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[var(--text-secondary)] hover:text-blue-600 p-1 inline-flex"
                                      title={nav("View photo", "عرض الصورة")}
                                    >
                                      <Image size={15} />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-[var(--text-secondary)] opacity-40">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {inv.status === "SUBMITTED" ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="input"
                                        style={{ width: 90, padding: ".3rem .5rem", fontSize: ".82rem" }}
                                        placeholder={item.unitPrice !== null ? String(item.unitPrice) : "0.00"}
                                        value={priceInputs[item.id] ?? (item.unitPrice !== null ? String(item.unitPrice) : "")}
                                        onChange={(e) => setPriceInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                                      />
                                      <button
                                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                                        onClick={() => void handleSetPrice(item.id)}
                                        disabled={savingItem === item.id}
                                      >
                                        {savingItem === item.id ? "…" : savedItems.has(item.id) ? "✓" : nav("Set", "تعيين")}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-green-600">
                                      {item.unitPrice !== null ? `₪${item.unitPrice.toFixed(2)}` : "—"}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                                  {item.unitPrice !== null ? `₪${(item.unitPrice * item.quantity).toFixed(2)}` : <span className="text-[var(--text-secondary)] opacity-40">—</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.unitPrice !== null ? (
                                    <span style={{ background: "#d1fae5", color: "#059669", borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>{nav("Priced", "مسعّر")}</span>
                                  ) : (
                                    <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>{nav("Pending", "معلق")}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Footer banners */}
                    {inv.status === "REVIEWED" && inv.reviewedAt && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
                        <CheckCircle size={15} />
                        {nav("Reviewed on", "تمت المراجعة في")} {new Date(inv.reviewedAt).toLocaleDateString()} · {nav("Total value", "القيمة الإجمالية")}: <strong>${total.toFixed(2)}</strong>
                      </div>
                    )}
                    {inv.status === "SUBMITTED" && !done && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100 text-sm text-orange-700">
                        <Clock size={15} />
                        {nav(`Set prices for all ${inv.items.filter((i) => i.unitPrice === null).length} remaining part(s) to complete pricing.`,
                          `قم بتعيين أسعار لجميع القطع المتبقية (${inv.items.filter((i) => i.unitPrice === null).length}) لإكمال التسعير.`)}
                      </div>
                    )}
                    {total > 0 && (
                      <div className="mt-3 flex justify-end">
                        <span className="text-sm font-bold text-green-600">{nav("Total", "الإجمالي")}: ${total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
