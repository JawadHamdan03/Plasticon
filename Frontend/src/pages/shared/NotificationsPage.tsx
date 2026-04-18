import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { Bell, CheckCheck, RefreshCw, Send, AlertTriangle, CheckCircle } from "lucide-react";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

const TYPE_COLORS: Record<string, string> = {
  MAINTENANCE_URGENT: "var(--red-600)",
  PRODUCTION_ALERT:   "var(--orange-700)",
  QUALITY_ISSUE:      "var(--yellow-600)",
  PAYROLL_READY:      "var(--green-600)",
  INVENTORY_LOW:      "var(--orange-500)",
  CHAT_MESSAGE:       "var(--blue-600)",
  SYSTEM_MESSAGE:     "var(--text-secondary)",
  ENGINEER_INVENTORY: "var(--blue-700)",
};

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(d));
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const [form, setForm] = useState({
    type: "SYSTEM_MESSAGE",
    targetType: "USER" as "USER" | "SHIFT" | "ALL",
    title: "",
    message: "",
    userId: "",
    shiftId: "",
  });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [r1, r2] = await Promise.all([
        fetchWithAuth("/notifications"),
        fetchWithAuth("/notifications/unread-count"),
      ]);
      if (!r1.ok) throw new Error(await readApiError(r1));
      const d = await r1.json() as { items?: NotificationItem[] } | NotificationItem[];
      setItems(Array.isArray(d) ? d : (d.items ?? []));
      if (r2.ok) {
        const c = await r2.json() as { unreadCount?: number; count?: number };
        setUnread(c.unreadCount ?? c.count ?? 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const markRead = async (id: number) => {
    await fetchWithAuth(`/notifications/${id}/read`, { method: "PATCH" });
    void load();
  };

  const markAllRead = async () => {
    await fetchWithAuth("/notifications/read-all", { method: "PATCH" });
    void load();
  };

  const createNotif = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const res = await fetchWithAuth("/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          targetType: form.targetType,
          title: form.title,
          message: form.message,
          ...(form.targetType === "USER" && form.userId ? { userId: Number(form.userId) } : {}),
          ...(form.targetType === "SHIFT" && form.shiftId ? { shiftId: Number(form.shiftId) } : {}),
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(locale === "ar" ? "تم إرسال الإشعار بنجاح" : "Notification sent successfully");
      setForm({ type: "SYSTEM_MESSAGE", targetType: "USER", title: "", message: "", userId: "", shiftId: "" });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create notification");
    }
  };

  const displayed = filterUnread ? items.filter(n => !n.isRead) : items;

  const t = {
    title:    locale === "ar" ? "الإشعارات" : "Notifications",
    subtitle: locale === "ar" ? "كل إشعاراتك في مكان واحد" : "All your notifications in one place",
    inbox:    locale === "ar" ? "صندوق الوارد" : "Inbox",
    send:     locale === "ar" ? "إرسال إشعار" : "Send Notification",
    markAll:  locale === "ar" ? "تعليم الكل كمقروء" : "Mark all read",
    all:      locale === "ar" ? "الكل" : "All",
    unread:   locale === "ar" ? "غير مقروء" : "Unread",
    empty:    locale === "ar" ? "لا توجد إشعارات" : "No notifications",
    read:     locale === "ar" ? "تعليم كمقروء" : "Mark read",
    type:     locale === "ar" ? "النوع" : "Type",
    target:   locale === "ar" ? "المستهدف" : "Target",
    titleL:   locale === "ar" ? "العنوان" : "Title",
    msg:      locale === "ar" ? "الرسالة" : "Message",
    userId:   locale === "ar" ? "معرّف المستخدم" : "User ID",
    shiftId:  locale === "ar" ? "معرّف الوردية" : "Shift ID",
    submit:   locale === "ar" ? "إرسال" : "Send",
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-secondary)" }}>
            {locale === "ar" ? "بلاستيكون" : "Plasticon"}
          </p>
          <h1 style={{ margin: ".3rem 0 .25rem", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <Bell size={22} style={{ color: "var(--brand-primary)" }} />
            {t.title}
          </h1>
          <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)" }}>{t.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: ".625rem", flexWrap: "wrap", alignItems: "center" }}>
          {unread > 0 && (
            <button className="auth-button auth-button--ghost" type="button" onClick={() => void markAllRead()}>
              <CheckCheck size={14} />{t.markAll}
            </button>
          )}
          <button className="auth-button auth-button--ghost" type="button" onClick={() => void load()}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".875rem 1.125rem", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", flexWrap: "wrap", boxShadow: "var(--shadow-card)" }}>
        <Bell size={16} style={{ color: "var(--brand-primary)" }} />
        <span style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
          {locale === "ar" ? "إجمالي" : "Total"}:
        </span>
        <strong style={{ fontSize: ".875rem", color: "var(--text-primary)" }}>{items.length}</strong>
        <span style={{ fontSize: ".875rem", color: "var(--text-secondary)", marginLeft: ".5rem" }}>
          {locale === "ar" ? "غير مقروء" : "Unread"}:
        </span>
        <strong style={{ fontSize: ".875rem", color: unread > 0 ? "var(--brand-primary)" : "var(--text-primary)" }}>{unread}</strong>

        <div style={{ marginLeft: "auto", display: "flex", gap: ".375rem" }}>
          <button
            type="button"
            onClick={() => setFilterUnread(false)}
            style={{
              padding: ".3rem .75rem", borderRadius: "999px", border: "1px solid var(--border-default)",
              background: !filterUnread ? "var(--brand-primary)" : "transparent",
              color: !filterUnread ? "#fff" : "var(--text-secondary)",
              font: "inherit", fontSize: ".78rem", fontWeight: 600, cursor: "pointer",
            }}
          >{t.all}</button>
          <button
            type="button"
            onClick={() => setFilterUnread(true)}
            style={{
              padding: ".3rem .75rem", borderRadius: "999px", border: "1px solid var(--border-default)",
              background: filterUnread ? "var(--brand-primary)" : "transparent",
              color: filterUnread ? "#fff" : "var(--text-secondary)",
              font: "inherit", fontSize: ".78rem", fontWeight: 600, cursor: "pointer",
            }}
          >{t.unread}</button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--red-50)", border: "1px solid var(--red-100)", color: "var(--red-700)", fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <AlertTriangle size={15} />{error}
        </div>
      )}
      {success && (
        <div style={{ padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--green-50)", border: "1px solid var(--green-100)", color: "var(--green-700)", fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <CheckCircle size={15} />{success}
        </div>
      )}

      <div className="module-grid" style={{ gridTemplateColumns: isAdmin ? undefined : "1fr" }}>
        {/* Inbox */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <p style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
              {t.inbox}
            </p>
            {unread > 0 && (
              <span style={{ background: "var(--brand-primary)", color: "#fff", fontSize: ".7rem", fontWeight: 700, borderRadius: "999px", padding: ".15rem .5rem" }}>
                {unread}
              </span>
            )}
          </div>
          <div style={{ padding: "1rem", display: "grid", gap: ".625rem" }}>
            {loading ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <Bell size={36} style={{ color: "var(--gray-300)", margin: "0 auto .75rem", display: "block" }} />
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".9rem" }}>{t.empty}</p>
              </div>
            ) : displayed.map(n => (
              <button
                key={n.id}
                type="button"
                className={`notif-page-item${!n.isRead ? " notif-page-item--unread" : ""}`}
                onClick={() => { if (!n.isRead) void markRead(n.id); }}
              >
                <span className={`notif-page-dot${n.isRead ? " notif-page-dot--read" : ""}`} />
                <div style={{ minWidth: 0 }}>
                  <p className="notif-page-item__title">{n.title}</p>
                  <p className="notif-page-item__msg">{n.message}</p>
                  <p className="notif-page-item__meta">{fmtDate(n.createdAt)}</p>
                </div>
                <span className="notif-type-badge" style={{ color: TYPE_COLORS[n.type] ?? "var(--text-secondary)" }}>
                  {n.type.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Send notification (admin only) */}
        {isAdmin && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Send size={15} style={{ color: "var(--brand-primary)" }} />
              <p style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.send}</p>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <form className="module-form" onSubmit={(e) => void createNotif(e)}>
                <label>
                  {t.target}
                  <select value={form.targetType} onChange={e => setForm(p => ({ ...p, targetType: e.target.value as "USER" | "SHIFT" | "ALL" }))}>
                    <option value="USER">{locale === "ar" ? "مستخدم محدد" : "Specific User"}</option>
                    <option value="SHIFT">{locale === "ar" ? "وردية" : "Shift"}</option>
                    <option value="ALL">{locale === "ar" ? "الجميع" : "Everyone"}</option>
                  </select>
                </label>
                <label>
                  {t.type}
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {["SYSTEM_MESSAGE","PRODUCTION_ALERT","MAINTENANCE_URGENT","QUALITY_ISSUE","PAYROLL_READY","INVENTORY_LOW","CHAT_MESSAGE"].map(v => (
                      <option key={v} value={v}>{v.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.titleL}
                  <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder={locale === "ar" ? "عنوان الإشعار..." : "Notification title..."} />
                </label>
                <label>
                  {t.msg}
                  <textarea rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required placeholder={locale === "ar" ? "محتوى الإشعار..." : "Notification message..."} />
                </label>
                {form.targetType === "USER" && (
                  <label>{t.userId}<input type="number" min={1} value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} required /></label>
                )}
                {form.targetType === "SHIFT" && (
                  <label>{t.shiftId}<input type="number" min={1} value={form.shiftId} onChange={e => setForm(p => ({ ...p, shiftId: e.target.value }))} required /></label>
                )}
                <button type="submit" className="auth-button" style={{ width: "100%", justifyContent: "center" }}>
                  <Send size={14} />{t.submit}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
