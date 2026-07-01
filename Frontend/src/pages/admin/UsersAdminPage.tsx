import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Pencil, UserPlus, Trash2, Check } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Badge, RoleBadge } from "../../components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "../../components/ui/dialog";
import { LoadingCenter } from "../../components/ui/spinner";
import { API_BASE_URL, readApiError } from "../../lib/api";

type Shift = { id: number; name: string };

type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER" | "SALES_REP";
  isActive: boolean;
  deletedAt?: string | null;
  shiftId: number | null;
  shift: Shift | null;
};

const ROLES = ["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN", "SALES_REP"] as const;
const ROLES_WITH_SHIFT = ["WORKER", "ENGINEER"];

const roleColor: Record<string, string> = {
  ADMIN:      "#f97316",
  WORKER:     "#3b82f6",
  ENGINEER:   "#8b5cf6",
  ACCOUNTANT: "#10b981",
  SALES_REP:  "#ec4899",
};

const shiftColor: Record<string, string> = {
  A: "#3b82f6",
  B: "#f97316",
  C: "#8b5cf6",
};

function shiftLetter(name: string) {
  return name.replace(/[^A-Ca-c]/g, "").toUpperCase() || name[0]?.toUpperCase() || "?";
}

function ShiftBadge({ shift }: { shift: Shift | null }) {
  if (!shift) return <span className="text-xs text-(--text-secondary)">—</span>;
  const letter = shiftLetter(shift.name);
  const color = shiftColor[letter] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border"
      style={{ color, background: `${color}18`, borderColor: `${color}30` }}
    >
      وردية {shift.name}
    </span>
  );
}

const BLANK_CREATE = {
  fullName:   "",
  email:      "",
  password:   "",
  username:   "",
  nationalId: "",
  role:       "SALES_REP" as string,
};

export function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editShiftId, setEditShiftId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(BLANK_CREATE);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createTone, setCreateTone] = useState<"success" | "error">("success");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/all`, { credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res));
      setUsers((await res.json()) as AdminUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    fetch(`${API_BASE_URL}/shifts`, { credentials: "include" })
      .then(async (r) => { if (r.ok) setShifts((await r.json()) as Shift[]); })
      .catch(() => {});
  }, [loadUsers]);

  const openEdit = (u: AdminUser) => {
    setEditModal(u);
    setEditRole(u.role);
    setEditShiftId(u.shiftId ? String(u.shiftId) : "");
    setSaveMsg("");
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body: Record<string, unknown> = { role: editRole };
      if (ROLES_WITH_SHIFT.includes(editRole)) {
        body.shiftId = editShiftId ? Number(editShiftId) : null;
      } else {
        body.shiftId = null;
      }
      const res = await fetch(`${API_BASE_URL}/users/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSaveTone("success");
      setSaveMsg("تم الحفظ بنجاح");
      setEditModal(null);
      await loadUsers();
    } catch (e) {
      setSaveTone("error");
      setSaveMsg(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      const token = localStorage.getItem("plasticon_token");
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          fullName:   createForm.fullName.trim(),
          email:      createForm.email.trim().toLowerCase(),
          password:   createForm.password,
          username:   createForm.username.trim(),
          nationalId: createForm.nationalId.trim(),
          role:       createForm.role,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setCreateTone("success");
      setCreateMsg("تم إنشاء المستخدم بنجاح");
      setCreateForm(BLANK_CREATE);
      setShowCreate(false);
      await loadUsers();
    } catch (e) {
      setCreateTone("error");
      setCreateMsg(e instanceof Error ? e.message : "فشل إنشاء المستخدم");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`حذف المستخدم "${u.fullName}"؟ سيتم تعطيل الحساب.`)) return;
    try {
      const token = localStorage.getItem("plasticon_token");
      const res = await fetch(`${API_BASE_URL}/users/${u.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await loadUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل حذف المستخدم");
    }
  };

  const needsShift = ROLES_WITH_SHIFT.includes(editRole);

  return (
    <ModulePageShell
      title="المستخدمون"
      subtitle="إدارة أدوار المستخدمين وتعيين الورديات"
      actions={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setShowCreate(true); setCreateMsg(""); setCreateForm(BLANK_CREATE); }}>
            <UserPlus size={14} /> إنشاء مستخدم
          </Button>
          <Button size="sm" variant="outline" onClick={() => void loadUsers()}>
            <RefreshCw size={14} /> تحديث
          </Button>
        </div>
      }
    >
      {/* Status banners */}
      {saveMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${saveTone === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {saveMsg}
        </div>
      )}
      {createMsg && !showCreate && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${createTone === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {createMsg}
        </div>
      )}

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r).length;
          const color = roleColor[r];
          return (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
              style={{ color, background: `${color}14`, borderColor: `${color}28` }}
            >
              <RoleBadge role={r} className="border-0 bg-transparent p-0 text-inherit font-bold" />
              <span className="text-(--text-tertiary) font-normal">({count})</span>
            </span>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-(--border-default) bg-(--bg-card) overflow-hidden">
        {loading ? (
          <LoadingCenter />
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-600 font-medium">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>اسم المستخدم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الوردية</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="text-xs font-bold text-(--text-tertiary)">{u.id}</td>
                    <td className="font-semibold">{u.fullName}</td>
                    <td className="text-xs text-(--text-secondary)">@{u.username}</td>
                    <td className="text-xs text-(--text-secondary)">{u.email ?? "—"}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><ShiftBadge shift={u.shift} /></td>
                    <td>
                      <Badge tone={u.isActive ? "green" : "red"} dot>
                        {u.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          <Pencil size={12} /> تعديل
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void handleDelete(u)}>
                          <Trash2 size={12} /> حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit user dialog ── */}
      <Dialog open={!!editModal} onClose={() => setEditModal(null)} size="sm">
        <DialogHeader onClose={() => setEditModal(null)}>
          <DialogTitle>تعديل المستخدم</DialogTitle>
          <p className="text-xs text-(--text-secondary) mt-0.5 m-0">
            {editModal?.fullName} · @{editModal?.username}
          </p>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          {/* Role picker */}
          <div>
            <p className="m-0 mb-2 text-sm font-bold text-(--text-primary)">الدور</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
              {ROLES.map((r) => {
                const color = roleColor[r];
                const isSelected = editRole === r;
                return (
                  <button
                    key={r} type="button"
                    onClick={() => { setEditRole(r); if (!ROLES_WITH_SHIFT.includes(r)) setEditShiftId(""); }}
                    className="rounded-xl py-2.5 text-sm font-bold cursor-pointer transition-all"
                    style={{
                      border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)",
                      background: isSelected ? `${color}18` : "var(--bg-app)",
                      color: isSelected ? color : "var(--text-primary)",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shift picker */}
          {needsShift && (
            <div>
              <p className="m-0 mb-2 text-sm font-bold text-(--text-primary)">
                الوردية
                <span className="ms-1 text-xs font-normal text-(--text-tertiary)">(اختياري)</span>
              </p>
              {shifts.length === 0 ? (
                <p className="text-sm text-(--text-secondary) m-0">لا توجد ورديات. أنشئ الورديات أولاً.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2">
                  <button type="button"
                    onClick={() => setEditShiftId("")}
                    className="rounded-xl py-2.5 text-xs font-bold cursor-pointer transition-all"
                    style={{
                      border: editShiftId === "" ? "2px solid #94a3b8" : "2px solid var(--border-default)",
                      background: editShiftId === "" ? "rgba(148,163,184,.12)" : "var(--bg-app)",
                      color: editShiftId === "" ? "#64748b" : "var(--text-secondary)",
                    }}
                  >
                    بلا وردية
                  </button>
                  {shifts.map((s) => {
                    const letter = shiftLetter(s.name);
                    const color = shiftColor[letter] ?? "#64748b";
                    const isSelected = editShiftId === String(s.id);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setEditShiftId(String(s.id))}
                        className="flex flex-col items-center gap-0.5 rounded-xl py-2.5 cursor-pointer transition-all"
                        style={{
                          border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)",
                          background: isSelected ? `${color}15` : "var(--bg-app)",
                          color: isSelected ? color : "var(--text-primary)",
                        }}
                      >
                        <span className="text-lg font-black leading-none">{letter}</span>
                        <span className="text-[10px] font-semibold opacity-75">وردية {s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Current → new summary */}
          <div className="rounded-xl border border-(--border-default) bg-(--bg-app) px-4 py-3 text-xs text-(--text-secondary) flex flex-col gap-1">
            <span><strong className="text-(--text-primary)">الحالي:</strong> {editModal?.role} · شفت {editModal?.shift?.name ?? "بدون"}</span>
            <span><strong className="text-(--text-primary)">الجديد:</strong> {editRole} · شفت {needsShift && editShiftId ? (shifts.find((s) => String(s.id) === editShiftId)?.name ?? "?") : "بدون"}</span>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditModal(null)}>إلغاء</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Check size={15} /> {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Create user dialog ── */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader onClose={() => setShowCreate(false)}>
          <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
          <p className="text-xs text-(--text-secondary) mt-0.5 m-0">أدخل جميع الحقول المطلوبة لإنشاء الحساب</p>
        </DialogHeader>
        <form onSubmit={(e) => { void handleCreate(e); }}>
          <DialogBody className="flex flex-col gap-4">
            {/* Role selector */}
            <div>
              <p className="m-0 mb-2 text-sm font-bold text-(--text-primary)">الدور</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
                {ROLES.map((r) => {
                  const color = roleColor[r];
                  const isSelected = createForm.role === r;
                  return (
                    <button key={r} type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, role: r }))}
                      className="rounded-xl py-2.5 text-xs font-bold cursor-pointer transition-all"
                      style={{
                        border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)",
                        background: isSelected ? `${color}18` : "var(--bg-app)",
                        color: isSelected ? color : "var(--text-primary)",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field grid */}
            <div className="form-grid-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--text-primary)">
                الاسم الكامل *
                <input required value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="مثال: أحمد علي" className="form-input" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--text-primary)">
                اسم المستخدم *
                <input required value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="مثال: ahmad_ali" className="form-input" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--text-primary)">
                البريد الإلكتروني *
                <input required type="email" value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com" className="form-input" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--text-primary)">
                رقم الهوية *
                <input required value={createForm.nationalId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nationalId: e.target.value }))}
                  placeholder="123456789" maxLength={9} className="form-input" />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--text-primary)">
              كلمة المرور * <span className="font-normal text-(--text-tertiary)">(8 أحرف على الأقل)</span>
              <input required type="password" value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" minLength={8} className="form-input" />
            </label>

            {createMsg && (
              <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${createTone === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {createMsg}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button type="submit" disabled={creating}>
              <UserPlus size={15} /> {creating ? "جارٍ الإنشاء..." : "إنشاء حساب"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

    </ModulePageShell>
  );
}
