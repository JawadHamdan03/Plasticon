import { useCallback, useEffect, useState } from "react";
import { UserPlus, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { API_BASE_URL, readApiError } from "../../lib/api";

type RegistrationRequest = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number; fullName: string } | null;
  createdAt: string;
};

type Shift = { id: number; name: string };

const ROLES = ["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"];

const ROLES_WITH_SHIFT = ["WORKER", "ENGINEER"];

const roleGradient: Record<string, string> = {
  ADMIN: "linear-gradient(135deg,#f97316,#ea580c)",
  WORKER: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  ENGINEER: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  ACCOUNTANT: "linear-gradient(135deg,#10b981,#059669)",
};

const shiftColor: Record<string, string> = {
  A: "#3b82f6",
  B: "#f97316",
  C: "#8b5cf6",
};

function shiftBadge(shiftName: string) {
  const letter = shiftName.replace(/[^A-Ca-c]/g, "").toUpperCase() || shiftName[0]?.toUpperCase();
  const color = shiftColor[letter] ?? "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: ".25rem", padding: ".2rem .65rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      Shift {shiftName}
    </span>
  );
}

export function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [approveModal, setApproveModal] = useState<RegistrationRequest | null>(null);
  const [selectedRole, setSelectedRole] = useState("WORKER");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionTone, setActionTone] = useState<"success" | "error" | "">("");
  const [setPasswordUrl, setSetPasswordUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_BASE_URL}/registration-requests${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res));
      setRequests((await res.json()) as RegistrationRequest[]);
    } catch (err) {
      setActionTone("error");
      setActionMsg(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Load shifts once
  useEffect(() => {
    fetch(`${API_BASE_URL}/shifts`, { credentials: "include" })
      .then(async (r) => { if (r.ok) setShifts((await r.json()) as Shift[]); })
      .catch(() => {});
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openApproveModal = (r: RegistrationRequest) => {
    setApproveModal(r);
    setSelectedRole("WORKER");
    setSelectedShiftId("");
    setReviewNote("");
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setSaving(true);
    setActionMsg("");
    try {
      const body: Record<string, unknown> = { role: selectedRole, reviewNote };
      if (ROLES_WITH_SHIFT.includes(selectedRole) && selectedShiftId) {
        body.shiftId = Number(selectedShiftId);
      }
      const res = await fetch(`${API_BASE_URL}/registration-requests/${approveModal.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as { message: string; setPasswordUrl?: string };
      setApproveModal(null);
      setActionTone("success");
      setActionMsg(`✓ Approved! Account created for ${approveModal.fullName}.`);
      if (data.setPasswordUrl) setSetPasswordUrl(data.setPasswordUrl);
      await load();
    } catch (err) {
      setActionTone("error");
      setActionMsg(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (id: number, note?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/registration-requests/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewNote: note || "" }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setActionTone("success");
      setActionMsg("Request rejected.");
      await load();
    } catch (err) {
      setActionTone("error");
      setActionMsg(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const pending = requests.filter((r) => r.status === "PENDING").length;

  const statusBadge = (status: string) => {
    const cfg = {
      PENDING: { bg: "rgba(249,115,22,.1)", color: "#ea580c", icon: <Clock size={12} /> },
      APPROVED: { bg: "rgba(34,197,94,.1)", color: "#16a34a", icon: <CheckCircle size={12} /> },
      REJECTED: { bg: "rgba(239,68,68,.1)", color: "#dc2626", icon: <XCircle size={12} /> },
    }[status] ?? { bg: "transparent", color: "inherit", icon: null };
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".2rem .65rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: cfg.bg, color: cfg.color }}>
        {cfg.icon} {status}
      </span>
    );
  };

  const needsShift = ROLES_WITH_SHIFT.includes(selectedRole);

  return (
    <ModulePageShell
      title="Registration Requests"
      subtitle="Review and approve new user access requests"
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={() => void load()}>
          <RefreshCw size={14} style={{ marginRight: ".35rem" }} /> Refresh
        </button>
      }
    >
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Total", value: requests.length, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: "Pending", value: pending, gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
          { label: "Approved", value: requests.filter((r) => r.status === "APPROVED").length, gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: "Rejected", value: requests.filter((r) => r.status === "REJECTED").length, gradient: "linear-gradient(135deg,#94a3b8,#64748b)" },
        ].map((k) => (
          <div key={k.label} style={{ background: k.gradient, borderRadius: 12, padding: "1rem 1.25rem", color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,.1)" }}>
            <p style={{ margin: "0 0 .25rem", fontSize: ".72rem", opacity: .85, fontWeight: 600, textTransform: "uppercase" }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ padding: ".7rem 1rem", borderRadius: 8, marginBottom: "1rem", background: actionTone === "success" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${actionTone === "success" ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`, color: actionTone === "success" ? "#16a34a" : "#dc2626", fontWeight: 600, fontSize: ".85rem" }}>
          {actionMsg}
        </div>
      )}

      {/* Dev set-password link */}
      {setPasswordUrl && (
        <div style={{ padding: ".75rem 1rem", borderRadius: 8, marginBottom: "1rem", background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.2)", fontSize: ".82rem" }}>
          <strong>Set Password Link (dev):</strong>{" "}
          <a href={setPasswordUrl} target="_blank" rel="noreferrer" style={{ color: "var(--orange-600,#ea580c)", wordBreak: "break-all" }}>{setPasswordUrl}</a>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} style={{ padding: ".4rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: statusFilter === s ? "var(--orange-500,#f97316)" : "var(--bg-surface)", color: statusFilter === s ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
            {s} {s === "PENDING" && pending > 0 ? `(${pending})` : ""}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}><span className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <UserPlus size={40} style={{ opacity: .3, marginBottom: ".75rem" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No requests found</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Role Assigned</th>
                  <th>Submitted</th>
                  <th>Reviewed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.fullName}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>{r.email}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>{r.phone ?? "—"}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-secondary)", maxWidth: 200 }}>
                      {r.message ? <span title={r.message}>{r.message.slice(0, 60)}{r.message.length > 60 ? "…" : ""}</span> : "—"}
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      {r.role ? (
                        <span style={{ padding: ".2rem .65rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: "rgba(0,0,0,.07)" }}>{r.role}</span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: ".8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{r.reviewedBy?.fullName ?? "—"}</td>
                    <td>
                      {r.status === "PENDING" ? (
                        <div style={{ display: "flex", gap: ".4rem" }}>
                          <button type="button" onClick={() => openApproveModal(r)} style={{ padding: ".3rem .75rem", borderRadius: 7, border: "1px solid rgba(34,197,94,.3)", background: "rgba(34,197,94,.08)", color: "#16a34a", cursor: "pointer", fontWeight: 700, fontSize: ".78rem" }}>
                            ✓ Approve
                          </button>
                          <button type="button" onClick={() => void handleReject(r.id)} style={{ padding: ".3rem .75rem", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: ".78rem" }}>
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
                          {r.reviewNote ? `"${r.reviewNote}"` : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Approve modal ── */}
      {approveModal && (
        <div role="dialog" aria-modal="true" onClick={() => setApproveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={22} color="#16a34a" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Approve Request</h3>
                <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>{approveModal.fullName} · {approveModal.email}</p>
              </div>
            </div>

            {/* Role selector */}
            <div>
              <p style={{ margin: "0 0 .6rem", fontSize: ".83rem", fontWeight: 700 }}>Select Role</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: ".5rem" }}>
                {ROLES.map((role) => (
                  <button key={role} type="button"
                    onClick={() => { setSelectedRole(role); setSelectedShiftId(""); }}
                    style={{ padding: ".65rem", borderRadius: 10, border: selectedRole === role ? "2px solid transparent" : "2px solid var(--border-default)", background: selectedRole === role ? roleGradient[role] : "var(--bg-surface)", color: selectedRole === role ? "#fff" : "var(--text-primary)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", transition: "all .15s" }}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift selector — only for WORKER and ENGINEER */}
            {needsShift && (
              <div>
                <p style={{ margin: "0 0 .5rem", fontSize: ".83rem", fontWeight: 700 }}>
                  Assign Shift <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(required for {selectedRole})</span>
                </p>
                {shifts.length === 0 ? (
                  <p style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>No shifts configured. Go to Shifts page to create shifts first.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: ".5rem" }}>
                    {shifts.map((s) => {
                      const letter = s.name.replace(/[^A-Ca-c]/g, "").toUpperCase() || s.name[0]?.toUpperCase();
                      const color = shiftColor[letter] ?? "#64748b";
                      const isSelected = selectedShiftId === String(s.id);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setSelectedShiftId(String(s.id))}
                          style={{ padding: ".7rem .5rem", borderRadius: 10, border: isSelected ? `2px solid ${color}` : "2px solid var(--border-default)", background: isSelected ? `${color}15` : "var(--bg-surface)", color: isSelected ? color : "var(--text-primary)", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: ".2rem" }}>
                          <span style={{ fontSize: "1.3rem", fontWeight: 900 }}>{letter}</span>
                          <span style={{ fontSize: ".7rem", fontWeight: 600, opacity: .8 }}>Shift {s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Review note */}
            <div>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                Review Note (optional)
                <textarea className="auth-input" style={{ paddingLeft: "1rem", resize: "vertical" }} rows={2}
                  value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Assigned to morning shift" />
              </label>
            </div>

            <div style={{ padding: ".75rem 1rem", borderRadius: 8, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.15)", fontSize: ".8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              ✉️ An email will be sent to <strong>{approveModal.email}</strong> with a link to set their password.
            </div>

            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setApproveModal(null)} style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleApprove()} disabled={saving || (needsShift && shifts.length > 0 && !selectedShiftId)}
                style={{ padding: ".5rem 1.5rem", borderRadius: 8, background: "rgba(34,197,94,1)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: (saving || (needsShift && shifts.length > 0 && !selectedShiftId)) ? .5 : 1 }}>
                {saving ? "Approving…" : "Approve & Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
