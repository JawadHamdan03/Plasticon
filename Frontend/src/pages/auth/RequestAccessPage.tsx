import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Phone, MessageSquare, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Factory } from "lucide-react";
import { API_BASE_URL, readApiError } from "../../lib/api";

export function RequestAccessPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/registration-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "2rem" }}>
          <div style={{ width: 38, height: 38, background: "var(--orange-500,#f97316)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(249,115,22,.3)" }}>
            <Factory size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>Plasticon</span>
        </div>

        <div style={{ textAlign: "center", padding: ".5rem 0 1rem" }}>
          <div style={{ width: 72, height: 72, background: "rgba(34,197,94,.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", border: "2px solid rgba(34,197,94,.2)" }}>
            <CheckCircle size={34} color="#22c55e" />
          </div>
          <h2 style={{ margin: "0 0 .6rem", fontSize: "1.55rem", fontWeight: 800 }}>Request Sent!</h2>
          <p style={{ margin: "0 0 .4rem", color: "var(--text-secondary)", lineHeight: 1.65, fontSize: ".9rem" }}>
            Your request has been sent to the admin.
          </p>
          <p style={{ margin: "0 0 1.75rem", fontWeight: 700, color: "var(--text-primary)", fontSize: ".92rem" }}>
            {form.email}
          </p>
          <p style={{ fontSize: ".82rem", color: "var(--text-secondary)", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
            The admin will review your request and send you an email with your account credentials once approved.
          </p>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", fontSize: ".85rem", color: "var(--orange-600,#ea580c)", fontWeight: 700, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "2rem" }}>
        <div style={{ width: 38, height: 38, background: "var(--orange-500,#f97316)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(249,115,22,.3)" }}>
          <Factory size={20} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>Plasticon</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ width: 52, height: 52, background: "rgba(249,115,22,.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", border: "1px solid rgba(249,115,22,.2)" }}>
          <User size={26} color="var(--orange-500,#f97316)" />
        </div>
        <h1 style={{ margin: "0 0 .4rem", fontSize: "1.55rem", fontWeight: 800, lineHeight: 1.2 }}>Request Access</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".9rem", lineHeight: 1.65 }}>
          Fill in your details and an admin will review your request and set up your account.
        </p>
      </div>

      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="form-group">
          <label className="auth-label" htmlFor="ra-name">Full Name *</label>
          <div className="auth-input-wrapper">
            <User size={16} className="auth-input-icon" />
            <input id="ra-name" type="text" className="auth-input" placeholder="Your full name" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required autoFocus />
          </div>
        </div>

        <div className="form-group">
          <label className="auth-label" htmlFor="ra-email">Email Address *</label>
          <div className="auth-input-wrapper">
            <Mail size={16} className="auth-input-icon" />
            <input id="ra-email" type="email" className="auth-input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          </div>
        </div>

        <div className="form-group">
          <label className="auth-label" htmlFor="ra-phone">Phone Number</label>
          <div className="auth-input-wrapper">
            <Phone size={16} className="auth-input-icon" />
            <input id="ra-phone" type="tel" className="auth-input" placeholder="+966..." value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="auth-label" htmlFor="ra-msg">Message (optional)</label>
          <div className="auth-input-wrapper" style={{ alignItems: "flex-start" }}>
            <MessageSquare size={16} className="auth-input-icon" style={{ marginTop: ".75rem" }} />
            <textarea id="ra-msg" className="auth-input" placeholder="Why do you need access?" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={3} style={{ resize: "vertical", paddingTop: ".6rem" }} />
          </div>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button type="submit" className="auth-btn" disabled={submitting || !form.fullName.trim() || !form.email.trim()} style={{ marginTop: ".25rem" }}>
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
              <span className="spinner" style={{ width: 16, height: 16, borderTopColor: "#fff" }} />
              Sending…
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
              Send Request <ArrowRight size={16} />
            </span>
          )}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: ".85rem", color: "var(--text-secondary)" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--orange-600,#ea580c)", fontWeight: 700, textDecoration: "none" }}>
          Sign In
        </Link>
      </p>
    </div>
  );
}
