import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Pencil, X, Check, UserPlus, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
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
  ADMIN:     "#f97316",
  WORKER:    "#3b82f6",
  ENGINEER:  "#8b5cf6",
  ACCOUNTANT:"#10b981",
  SALES_REP: "#ec4899",
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
  if (!shift) return <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>—</span>;
  const letter = shiftLetter(shift.name);
  const color = shiftColor[letter] ?? "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: ".25rem", padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      Shift {shift.name}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color = roleColor[role] ?? "#64748b";
  return (
    <span style={{ display: "inline-block", padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: `${color}15`, color }}>
      {role}
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

  // Create-user modal
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
      setError(e instanceof Error ? e.message : "Failed to load users");
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
      setSaveMsg("Saved successfully");
      setEditModal(null);
      await loadUsers();
    } catch (e) {
      setSaveTone("error");
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
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
      setCreateMsg("User created successfully");
      setCreateForm(BLANK_CREATE);
      setShowCreate(false);
      await loadUsers();
    } catch (e) {
      setCreateTone("error");
      setCreateMsg(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.fullName}"? This is a soft delete — the account will be deactivated.`)) return;
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
      alert(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  const needsShift = ROLES_WITH_SHIFT.includes(editRole);

  return (
    <ModulePageShell
      title="Users"
      subtitle="Manage user roles and shift assignments"
      actions={
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button type="button" className="auth-button" onClick={() => { setShowCreate(true); setCreateMsg(""); setCreateForm(BLANK_CREATE); }}>
            <UserPlus size={14} style={{ marginRight: ".35rem" }} /> Create User
          </button>
          <button type="button" className="auth-button auth-button--ghost" onClick={() => void loadUsers()}>
            <RefreshCw size={14} style={{ marginRight: ".35rem" }} /> Refresh
          </button>
        </div>
      }
    >
      {/* Save / create message banners */}
      {saveMsg && (
        <div style={{ padding: ".7rem 1rem", borderRadius: 8, marginBottom: "1rem", background: saveTone === "success" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${saveTone === "success" ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`, color: saveTone === "success" ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: ".85rem" }}>
          {saveMsg}
        </div>
      )}
      {createMsg && !showCreate && (
        <div style={{ padding: ".7rem 1rem", borderRadius: 8, marginBottom: "1rem", background: createTone === "success" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${createTone === "success" ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`, color: createTone === "success" ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: ".85rem" }}>
          {createMsg}
        </div>
      )}

      {/* Summary badges */}
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r).length;
          const color = roleColor[r];
          return (
            <span key={r} style={{ padding: ".3rem .9rem", borderRadius: 999, fontSize: ".78rem", fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}25` }}>
              {r}: {count}
            </span>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}><span className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>{error}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: "var(--text-muted)" }}>{u.id}</td>
                    <td style={{ fontWeight: 700 }}>{u.fullName}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>@{u.username}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>{u.email ?? "—"}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><ShiftBadge shift={u.shift} /></td>
                    <td>
                      <span style={{ fontSize: ".78rem", fontWeight: 600, color: u.isActive ? "#16a34a" : "#dc2626" }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                        <button type="button" onClick={() => openEdit(u)}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".3rem .65rem", borderRadius: 7, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".78rem", fontWeight: 600 }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button type="button" onClick={() => void handleDelete(u)}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".3rem .65rem", borderRadius: 7, border: "1px solid #ef444433", background: "#ef444408", color: "#ef4444", cursor: "pointer", fontSize: ".78rem", fontWeight: 600 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editModal && (
        <div role="dialog" aria-modal="true" onClick={() => setEditModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Edit User</h3>
                <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                  {editModal.fullName} · @{editModal.username}
                </p>
              </div>
              <button type="button" onClick={() => setEditModal(null)}
                style={{ width: 32, height: 32, border: "none", background: "var(--bg-subtle)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            {/* Role picker */}
            <div>
              <p style={{ margin: "0 0 .6rem", fontSize: ".83rem", fontWeight: 700 }}>Role</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: ".5rem" }}>
                {ROLES.map((r) => {
                  const color = roleColor[r];
                  const isSelected = editRole === r;
                  return (
                    <button key={r} type="button"
                      onClick={() => { setEditRole(r); if (!ROLES_WITH_SHIFT.includes(r)) setEditShiftId(""); }}
                      style={{ padding: ".65rem", borderRadius: 10, border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)", background: isSelected ? `${color}18` : "var(--bg-surface)", color: isSelected ? color : "var(--text-primary)", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", transition: "all .15s" }}>
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift picker — only for WORKER / ENGINEER */}
            {needsShift && (
              <div>
                <p style={{ margin: "0 0 .5rem", fontSize: ".83rem", fontWeight: 700 }}>
                  Shift Assignment
                  <span style={{ marginLeft: ".35rem", fontSize: ".75rem", fontWeight: 400, color: "var(--text-muted)" }}>(optional — leave unset to remove from shift)</span>
                </p>
                {shifts.length === 0 ? (
                  <p style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>No shifts found. Create shifts in the Shifts page first.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: ".5rem" }}>
                    {/* No-shift option */}
                    <button type="button"
                      onClick={() => setEditShiftId("")}
                      style={{ padding: ".7rem .5rem", borderRadius: 10, border: editShiftId === "" ? "2px solid #94a3b8" : "2px solid var(--border-default)", background: editShiftId === "" ? "rgba(148,163,184,.12)" : "var(--bg-surface)", color: editShiftId === "" ? "#64748b" : "var(--text-secondary)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", transition: "all .15s" }}>
                      None
                    </button>
                    {shifts.map((s) => {
                      const letter = shiftLetter(s.name);
                      const color = shiftColor[letter] ?? "#64748b";
                      const isSelected = editShiftId === String(s.id);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setEditShiftId(String(s.id))}
                          style={{ padding: ".7rem .5rem", borderRadius: 10, border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)", background: isSelected ? `${color}15` : "var(--bg-surface)", color: isSelected ? color : "var(--text-primary)", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: ".2rem" }}>
                          <span style={{ fontSize: "1.25rem", fontWeight: 900 }}>{letter}</span>
                          <span style={{ fontSize: ".7rem", fontWeight: 600, opacity: .8 }}>Shift {s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Current assignment summary */}
            <div style={{ padding: ".75rem 1rem", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <span><strong>Current:</strong> {editModal.role} · Shift {editModal.shift?.name ?? "none"}</span>
              <span><strong>New:</strong> {editRole} · Shift {needsShift && editShiftId ? (shifts.find((s) => String(s.id) === editShiftId)?.name ?? "?") : "none"}</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditModal(null)}
                style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".5rem 1.5rem", borderRadius: 8, background: "var(--brand-primary,#f97316)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: saving ? .6 : 1 }}>
                <Check size={15} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Create user modal ── */}
      {showCreate && (
        <div role="dialog" aria-modal="true" onClick={() => setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Create New User</h3>
                <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>Fill in all required fields to create the account</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ width: 32, height: 32, border: "none", background: "var(--bg-subtle)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { void handleCreate(e); }} style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
              {/* Role selector */}
              <div>
                <p style={{ margin: "0 0 .5rem", fontSize: ".83rem", fontWeight: 700 }}>Role</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: ".4rem" }}>
                  {ROLES.map((r) => {
                    const color = roleColor[r];
                    const isSelected = createForm.role === r;
                    return (
                      <button key={r} type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, role: r }))}
                        style={{ padding: ".55rem", borderRadius: 10, border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)", background: isSelected ? `${color}18` : "var(--bg-surface)", color: isSelected ? color : "var(--text-primary)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Two-column fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                  Full Name *
                  <input required value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="e.g. Ahmad Ali" style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                  Username *
                  <input required value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. ahmad_ali" style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                  Email *
                  <input required type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com" style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                  National ID * <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: ".75rem" }}>(9 digits)</span>
                  <input required value={createForm.nationalId} onChange={(e) => setCreateForm((f) => ({ ...f, nationalId: e.target.value }))}
                    placeholder="123456789" maxLength={9} style={inputStyle} />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                Password * <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: ".75rem" }}>(min 8 characters)</span>
                <input required type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" minLength={8} style={inputStyle} />
              </label>

              {createMsg && (
                <div style={{ padding: ".6rem .9rem", borderRadius: 7, background: createTone === "success" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", color: createTone === "success" ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: ".83rem" }}>
                  {createMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".5rem 1.5rem", borderRadius: 8, background: "var(--brand-primary,#f97316)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: creating ? .6 : 1 }}>
                  <UserPlus size={15} /> {creating ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </ModulePageShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: ".45rem .7rem",
  borderRadius: 8,
  border: "1px solid var(--border-default)",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  fontSize: ".85rem",
  width: "100%",
  boxSizing: "border-box",
};
