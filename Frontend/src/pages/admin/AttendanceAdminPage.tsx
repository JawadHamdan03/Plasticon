import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock3,
  Edit2,
  Fingerprint,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────
type AttendanceRecord = {
  id: number;
  userId: number;
  checkIn: string;
  checkOut?: string | null;
  lateMinutes?: number;
  overtimeMinutes?: number;
  notes?: string | null;
  user?: { fullName: string; username: string; role: string };
  shift?: { id: number; name: string } | null;
};

type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
  deletedAt?: string | null;
};

type AttendanceSetting = { lateGraceMinutes: number; overtimeGraceMinutes: number };
type ViewTab = "monthly" | "settings";
type DayStatus = "present" | "late" | "open" | "absent" | "weekend" | "future" | "friday_ot";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_NAMES = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

const STATUS_CFG: Record<DayStatus, { bg: string; text: string; border: string; label: string }> = {
  present:    { bg: "var(--green-50)",  text: "var(--green-700)", border: "var(--green-100)",   label: "حاضر"        },
  late:       { bg: "var(--yellow-50)", text: "#a16207",           border: "var(--yellow-100)",  label: "متأخر"       },
  open:       { bg: "var(--blue-50)",   text: "var(--blue-700)",   border: "var(--blue-100)",    label: "مفتوح"       },
  absent:     { bg: "var(--red-50)",    text: "var(--red-700)",    border: "var(--red-100)",     label: "غائب"        },
  weekend:    { bg: "var(--gray-50)",   text: "var(--gray-500)",   border: "var(--gray-200)",    label: "إجازة"       },
  future:     { bg: "transparent",      text: "var(--gray-400)",   border: "transparent",        label: "—"           },
  friday_ot:  { bg: "#fff7ed",          text: "#c2410c",           border: "#fed7aa",            label: "إضافي جمعة" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function auth(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth(), ...(init?.headers ?? {}) },
    credentials: "include",
  });
}
function toLocalDT(v?: string | null) {
  if (!v) return "";
  const d = new Date(v), p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v), p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
function durMin(ci: string, co?: string | null) {
  if (!co) return 0;
  return Math.max(0, Math.floor((new Date(co).getTime() - new Date(ci).getTime()) / 60000));
}
function fmtDur(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function dayStatus(rec: AttendanceRecord | undefined, isPast: boolean, isFriday: boolean): DayStatus {
  if (isFriday) return rec ? "friday_ot" : "weekend";
  if (!isPast) return "future";
  if (!rec) return "absent";
  if (rec.checkOut) return (rec.lateMinutes ?? 0) > 0 ? "late" : "present";
  return "open";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, gradient }: {
  label: string; value: string | number; icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-white flex flex-col gap-2"
      style={{ background: gradient, boxShadow: "0 4px 16px rgba(0,0,0,.10)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-85">{label}</p>
        <div className="opacity-75">{icon}</div>
      </div>
      <p className="text-3xl font-extrabold tracking-tight leading-none">{value}</p>
      <div className="absolute -bottom-3 -inset-e-3 size-20 rounded-full opacity-[.08]" style={{ background: "#fff" }} />
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DayStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 9px",
      borderRadius: 99, fontSize: ".71rem", fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AttendanceAdminPage() {
  const { user } = useAuth();
  /* locale removed — UI is Arabic-only */

  const today = useMemo(() => new Date(), []);

  const [activeTab, setActiveTab] = useState<ViewTab>("monthly");
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedYear, setSelectedYear]     = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth]   = useState(today.getMonth() + 1);
  const [records, setRecords]   = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm]   = useState({ checkIn: "", checkOut: "", notes: "" });

  // inline add (fingerprint)
  const [addingDay, setAddingDay]   = useState<number | null>(null);
  const [addForm, setAddForm]       = useState({ checkIn: "", checkOut: "", notes: "" });
  const [addLoading, setAddLoading] = useState(false);

  // settings
  const [settings, setSettings]         = useState<AttendanceSetting>({ lateGraceMinutes: 30, overtimeGraceMinutes: 30 });
  const [settingsForm, setSettingsForm]  = useState<AttendanceSetting>({ lateGraceMinutes: 30, overtimeGraceMinutes: 30 });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── API ──────────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch("/users/all");
      if (res.ok) {
        const data = (await res.json()) as AdminUser[];
        setUsers(data.filter((u) => !u.deletedAt && u.isActive));
      }
    } catch { /* ignore */ }
  }, []);

  const loadRecords = useCallback(async (silent = false) => {
    if (!selectedUserId) { setRecords([]); return; }
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const dim = new Date(selectedYear, selectedMonth, 0).getDate();
      const p = (n: number) => String(n).padStart(2, "0");
      const from = `${selectedYear}-${p(selectedMonth)}-01`;
      const to   = `${selectedYear}-${p(selectedMonth)}-${p(dim)}`;
      const res = await apiFetch(`/attendance/all?userId=${selectedUserId}&fromDate=${from}&toDate=${to}`);
      if (res.ok) setRecords((await res.json()) as AttendanceRecord[]);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedUserId, selectedYear, selectedMonth]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/attendance/settings");
      if (res.ok) { const d = (await res.json()) as AttendanceSetting; setSettings(d); setSettingsForm(d); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadUsers(); void loadSettings(); }, [loadUsers, loadSettings]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);
  useEffect(() => {
    if (users.length > 0 && selectedUserId === "") setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedYear, selectedMonth]);

  const recordsByDay = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    for (const r of records) {
      const d = new Date(r.checkIn);
      if (d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth) {
        const k = d.getDate(); if (!map.has(k)) map.set(k, r);
      }
    }
    return map;
  }, [records, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, totalOT = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(selectedYear, selectedMonth - 1, d);
      const dow = dt.getDay();
      if (dt > today) continue;
      const r = recordsByDay.get(d);
      if (dow === 5) {
        // Friday = day off; only count OT if employee worked
        if (r) totalOT += r.overtimeMinutes ?? 0;
        continue;
      }
      if (!r) { absent++; continue; }
      present++;
      if ((r.lateMinutes ?? 0) > 0) late++;
      totalOT += r.overtimeMinutes ?? 0;
    }
    return { present, absent, late, totalOT };
  }, [daysInMonth, recordsByDay, selectedYear, selectedMonth, today]);

  // ── Edit handlers ────────────────────────────────────────────────────────
  const startEdit = (r: AttendanceRecord) => {
    setEditingId(r.id);
    setEditForm({ checkIn: toLocalDT(r.checkIn), checkOut: toLocalDT(r.checkOut), notes: r.notes ?? "" });
    setAddingDay(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({ checkIn: "", checkOut: "", notes: "" }); };
  const saveEdit = async (id: number) => {
    try {
      const res = await apiFetch(`/attendance/${id}`, {
        method: "PUT",
        body: JSON.stringify({ checkIn: editForm.checkIn || undefined, checkOut: editForm.checkOut || null, notes: editForm.notes || null }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      cancelEdit(); await loadRecords(true);
      toast.success("تم التحديث");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
  };

  // ── Add handlers ─────────────────────────────────────────────────────────
  const startAdd = (day: number) => {
    const p = (n: number) => String(n).padStart(2, "0");
    const ds = `${selectedYear}-${p(selectedMonth)}-${p(day)}`;
    setAddingDay(day);
    setAddForm({ checkIn: `${ds}T08:00`, checkOut: `${ds}T17:00`, notes: "" });
    setEditingId(null);
  };
  const cancelAdd = () => { setAddingDay(null); setAddForm({ checkIn: "", checkOut: "", notes: "" }); };
  const submitAdd = async () => {
    if (!selectedUserId) return;
    setAddLoading(true);
    try {
      const res = await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({ userId: Number(selectedUserId), checkIn: addForm.checkIn, checkOut: addForm.checkOut || null, notes: addForm.notes || null }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      cancelAdd(); await loadRecords(true);
      toast.success("تم تسجيل الحضور");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
    finally { setAddLoading(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteRecord = async (id: number) => {
    const ok = await confirmDialog(
      "هل أنت متأكد من حذف سجل الحضور؟",
      { danger: true, confirmText: "حذف" },
    );
    if (!ok) return;
    try {
      const res = await apiFetch(`/attendance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
      await loadRecords(true);
      toast.success("تم الحذف");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
  };

  // ── Settings save ────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await apiFetch("/attendance/settings", { method: "PUT", body: JSON.stringify(settingsForm) });
      if (!res.ok) throw new Error(await readApiError(res));
      const d = (await res.json()) as AttendanceSetting;
      setSettings(d); setSettingsForm(d);
      toast.success("تم حفظ الإعدادات");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
    finally { setSettingsSaving(false); }
  };

  const years      = useMemo(() => Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i), [today]);
  const monthNames = MONTH_NAMES;
  const dayNames   = DAY_NAMES;
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);

  // ── Inline input helper ───────────────────────────────────────────────────
  const iStyle: React.CSSProperties = {
    fontSize: ".8rem", padding: "4px 8px", borderRadius: 6,
    border: "1.5px solid var(--border-input)", background: "var(--bg-input)",
    color: "var(--text-primary)",
  };

  return (
    <ModulePageShell
      title={"الحضور والغياب"}
      subtitle={"تقويم الحضور الشهري لكل موظف — عرض وتعديل وإدارة السجلات"}
      icon={<UserCheck size={22} className="text-(--orange-500)" />}
      actions={
        <Button size="sm" variant="outline" onClick={() => void loadRecords(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {"تحديث"}
        </Button>
      }
    >

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {(["monthly", "settings"] as ViewTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                background: active ? "var(--orange-500)" : "var(--gray-100)",
                color: active ? "#fff" : "var(--text-secondary)",
                border: "none", cursor: "pointer",
                boxShadow: active ? "0 4px 12px rgba(249,115,22,.28)" : "none",
              }}
            >
              {tab === "monthly" ? <CalendarDays size={15} /> : <Settings size={15} />}
              {tab === "monthly" ? "العرض الشهري" : "الإعدادات"}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════ MONTHLY VIEW ═══════ */}
      {activeTab === "monthly" && (
        <div className="flex flex-col gap-5">

          {/* Controls */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div style={{ flex: "1 1 200px" }}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Users size={12} className="inline me-1" />{"الموظف"}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => { setSelectedUserId(Number(e.target.value)); cancelEdit(); cancelAdd(); }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                >
                  <option value="">{"— اختر موظفاً —"}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName || u.username} · {u.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <CalendarDays size={12} className="inline me-1" />{"الشهر"}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => { setSelectedMonth(Number(e.target.value)); cancelEdit(); cancelAdd(); }}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                >
                  {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  {"السنة"}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(Number(e.target.value)); cancelEdit(); cancelAdd(); }}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {selectedUser && (
                <div className="px-3 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--orange-50)", color: "var(--orange-700)", border: "1px solid var(--orange-200)" }}>
                  {selectedUser.fullName || selectedUser.username}
                  <span className="ms-2 font-normal opacity-60">{monthNames[selectedMonth - 1]} {selectedYear}</span>
                </div>
              )}
            </div>
          </Card>

          {/* KPI cards */}
          {selectedUserId && (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              <KpiCard label={"أيام الحضور"}   value={stats.present}          icon={<CheckCircle size={20} />} gradient="linear-gradient(135deg,#10b981,#059669)" />
              <KpiCard label={"أيام الغياب"}    value={stats.absent}           icon={<XCircle size={20} />}     gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
              <KpiCard label={"أيام التأخير"}     value={stats.late}             icon={<AlertCircle size={20} />} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
              <KpiCard label={"إجمالي الإضافي"} value={fmtDur(stats.totalOT)} icon={<Clock3 size={20} />}      gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" />
            </div>
          )}

          {/* Calendar table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: "var(--text-secondary)" }}>
                <RefreshCw size={26} className="animate-spin opacity-30" />
                <p className="text-sm">{"جارٍ التحميل…"}</p>
              </div>
            ) : !selectedUserId ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: "var(--text-secondary)" }}>
                <Users size={38} className="opacity-20" />
                <p className="text-sm font-medium">{"اختر موظفاً لعرض تقويمه الشهري"}</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".81rem" }}>
                  <thead>
                    <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--border-default)" }}>
                      {["#", "اليوم", "التاريخ", "الحالة",
                        "الدخول", "الخروج",
                        "المدة", "تأخير", "إضافي",
                        "ملاحظات", "إجراءات",
                      ].map((h, i) => (
                        <th key={i} style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: ".71rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const date  = new Date(selectedYear, selectedMonth - 1, day);
                      const dow   = date.getDay();
                      const isWE  = dow === 5; // only Friday is the weekly day off
                      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
                      const isPast = date <= todayEnd;
                      const rec    = recordsByDay.get(day);
                      const status = dayStatus(rec, isPast, isWE);
                      const isEdit = !!rec && editingId === rec.id;
                      const isAdd  = !rec && addingDay === day;
                      const dur    = rec ? durMin(rec.checkIn, rec.checkOut) : 0;
                      const p = (n: number) => String(n).padStart(2, "0");
                      const dateStr = `${selectedYear}-${p(selectedMonth)}-${p(day)}`;
                      const isToday = date.toDateString() === today.toDateString();

                      return (
                        <tr
                          key={day}
                          style={{
                            borderBottom: "1px solid var(--border-default)",
                            background: isEdit ? "rgba(59,130,246,.04)"
                              : isAdd  ? "rgba(34,197,94,.04)"
                              : isToday ? "rgba(249,115,22,.04)"
                              : isWE ? "var(--gray-50)" : undefined,
                            opacity: status === "future" ? .4 : 1,
                            transition: "background .1s",
                          }}
                        >
                          {/* # */}
                          <td style={{ padding: "7px 10px", width: 36 }}>
                            {isToday ? (
                              <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,borderRadius:"50%",background:"var(--orange-500)",color:"#fff",fontSize:".72rem",fontWeight:800 }}>{day}</span>
                            ) : (
                              <span style={{ fontWeight:600, color: isWE ? "var(--gray-400)" : "var(--text-secondary)", fontSize:".78rem" }}>{day}</span>
                            )}
                          </td>

                          {/* Day name */}
                          <td style={{ padding:"7px 10px", color: isWE ? "var(--gray-400)" : "var(--text-secondary)", fontSize:".76rem", whiteSpace:"nowrap" }}>
                            {dayNames[dow]}
                          </td>

                          {/* Date */}
                          <td style={{ padding:"7px 10px", fontWeight:500, whiteSpace:"nowrap", fontSize:".79rem" }}>{dateStr}</td>

                          {/* Status */}
                          <td style={{ padding:"7px 10px" }}><StatusBadge status={status} /></td>

                          {/* Check-in */}
                          <td style={{ padding:"7px 6px" }}>
                            {isEdit ? (
                              <input type="datetime-local" value={editForm.checkIn} onChange={(e) => setEditForm(p => ({ ...p, checkIn: e.target.value }))} style={{ ...iStyle, width: "min(158px, 100%)" }} />
                            ) : isAdd ? (
                              <input type="datetime-local" value={addForm.checkIn} onChange={(e) => setAddForm(p => ({ ...p, checkIn: e.target.value }))} style={{ ...iStyle, width: "min(158px, 100%)" }} />
                            ) : (
                              <span style={{ fontFamily:"monospace", fontSize:".82rem", fontWeight:600 }}>{rec ? fmtTime(rec.checkIn) : "—"}</span>
                            )}
                          </td>

                          {/* Check-out */}
                          <td style={{ padding:"7px 6px" }}>
                            {isEdit ? (
                              <input type="datetime-local" value={editForm.checkOut} onChange={(e) => setEditForm(p => ({ ...p, checkOut: e.target.value }))} style={{ ...iStyle, width: "min(158px, 100%)" }} />
                            ) : isAdd ? (
                              <input type="datetime-local" value={addForm.checkOut} onChange={(e) => setAddForm(p => ({ ...p, checkOut: e.target.value }))} style={{ ...iStyle, width: "min(158px, 100%)" }} />
                            ) : (
                              <span style={{ fontFamily:"monospace", fontSize:".82rem", fontWeight:600 }}>{rec?.checkOut ? fmtTime(rec.checkOut) : "—"}</span>
                            )}
                          </td>

                          {/* Duration */}
                          <td style={{ padding:"7px 10px", color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{rec ? fmtDur(dur) : "—"}</td>

                          {/* Late */}
                          <td style={{ padding:"7px 10px" }}>
                            {rec && (rec.lateMinutes ?? 0) > 0
                              ? <span style={{ color:"#a16207", fontWeight:700, fontSize:".78rem" }}>+{fmtDur(rec.lateMinutes ?? 0)}</span>
                              : <span style={{ color:"var(--gray-400)" }}>—</span>}
                          </td>

                          {/* OT */}
                          <td style={{ padding:"7px 10px" }}>
                            {rec && (rec.overtimeMinutes ?? 0) > 0
                              ? <span style={{ color:"#7c3aed", fontWeight:700, fontSize:".78rem" }}>+{fmtDur(rec.overtimeMinutes ?? 0)}</span>
                              : <span style={{ color:"var(--gray-400)" }}>—</span>}
                          </td>

                          {/* Notes */}
                          <td style={{ padding:"7px 6px", maxWidth:140 }}>
                            {isEdit ? (
                              <input value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder={"ملاحظة…"} style={{ ...iStyle, width:120 }} />
                            ) : isAdd ? (
                              <input value={addForm.notes} onChange={(e) => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder={"ملاحظة…"} style={{ ...iStyle, width:120 }} />
                            ) : rec?.notes ? (
                              <span style={{ color:"var(--text-secondary)", fontSize:".78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", maxWidth:130 }} title={rec.notes}>{rec.notes}</span>
                            ) : <span style={{ color:"var(--gray-400)" }}>—</span>}
                          </td>

                          {/* Actions */}
                          <td style={{ padding:"7px 10px" }}>
                            <div className="flex gap-1.5 items-center flex-wrap">
                              {isEdit ? (
                                <>
                                  <Button size="sm" onClick={() => void saveEdit(rec!.id)} style={{ padding:"4px 10px", minHeight:"unset", fontSize:".73rem" }}>
                                    <Save size={11} />{"حفظ"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit} style={{ padding:"4px 8px", minHeight:"unset" }}>
                                    <X size={12} />
                                  </Button>
                                </>
                              ) : isAdd ? (
                                <>
                                  <Button size="sm" onClick={() => void submitAdd()} disabled={addLoading}
                                    style={{ padding:"4px 10px", minHeight:"unset", fontSize:".73rem", background:"#16a34a", borderColor:"#16a34a" }}>
                                    <Save size={11} />{addLoading ? "…" : "تأكيد"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelAdd} style={{ padding:"4px 8px", minHeight:"unset" }}>
                                    <X size={12} />
                                  </Button>
                                </>
                              ) : rec ? (
                                <>
                                  <button type="button" onClick={() => startEdit(rec)}
                                    style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:7,border:"1px solid var(--border-default)",background:"var(--bg-card)",color:"var(--text-secondary)",fontSize:".73rem",fontWeight:600,cursor:"pointer" }}>
                                    <Edit2 size={11} />{"تعديل"}
                                  </button>
                                  <button type="button" onClick={() => void deleteRecord(rec.id)}
                                    style={{ display:"inline-flex",alignItems:"center",padding:"4px 7px",borderRadius:7,border:"1px solid var(--red-100)",background:"var(--red-50)",color:"var(--red-700)",cursor:"pointer" }}>
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              ) : isPast ? (
                                <button type="button" onClick={() => startAdd(day)}
                                  style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:7,border:"1px solid var(--green-100)",background:"var(--green-50)",color:"var(--green-700)",fontSize:".73rem",fontWeight:600,cursor:"pointer" }}>
                                  <Fingerprint size={11} />{"بصمة"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════ SETTINGS TAB ═══════ */}
      {activeTab === "settings" && (
        <div style={{ maxWidth: 520 }}>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-xl p-2.5" style={{ background: "var(--orange-50)", color: "var(--orange-500)" }}>
                <Settings size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                  {"فترات السماح للحضور"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {"الحضور ضمن نافذة السماح لا يُحسب تأخيراً. المغادرة ضمن نافذة الإضافي لا تُحسب عملاً إضافياً."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Late grace */}
              <div className="rounded-xl p-4" style={{ background: "var(--yellow-50)", border: "1px solid var(--yellow-100)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} style={{ color: "#a16207" }} />
                  <span className="text-sm font-semibold" style={{ color: "#a16207" }}>{"فترة السماح للتأخير"}</span>
                  <span className="ms-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#fef9c3", color: "#a16207" }}>
                    {"محفوظ"}: {settings.lateGraceMinutes}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={120} value={settingsForm.lateGraceMinutes}
                    onChange={(e) => setSettingsForm(p => ({ ...p, lateGraceMinutes: Math.max(0, Number(e.target.value)) }))}
                    style={{ width:100, padding:"7px 10px", borderRadius:8, border:"1.5px solid #fde68a", background:"#fff", color:"var(--text-primary)", fontSize:".9rem", fontWeight:700 }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{"دقيقة"}</span>
                </div>
              </div>

              {/* OT grace */}
              <div className="rounded-xl p-4" style={{ background: "rgba(139,92,246,.05)", border: "1px solid rgba(139,92,246,.18)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 size={15} style={{ color: "#7c3aed" }} />
                  <span className="text-sm font-semibold" style={{ color: "#7c3aed" }}>{"فترة السماح للعمل الإضافي"}</span>
                  <span className="ms-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,.12)", color: "#7c3aed" }}>
                    {"محفوظ"}: {settings.overtimeGraceMinutes}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={120} value={settingsForm.overtimeGraceMinutes}
                    onChange={(e) => setSettingsForm(p => ({ ...p, overtimeGraceMinutes: Math.max(0, Number(e.target.value)) }))}
                    style={{ width:100, padding:"7px 10px", borderRadius:8, border:"1.5px solid rgba(139,92,246,.3)", background:"#fff", color:"var(--text-primary)", fontSize:".9rem", fontWeight:700 }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{"دقيقة"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button onClick={() => void saveSettings()} disabled={settingsSaving}>
                  <Save size={14} />
                  {settingsSaving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
                </Button>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {"التغييرات تسري على الحضور الجديد فقط"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

    </ModulePageShell>
  );
}
