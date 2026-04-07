import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type AuditLog = {
  id: number;
  userId: number | null;
  entityType: string;
  entityId: number | null;
  action: string;
  createdAt: string;
  user?: { fullName: string; username: string } | null;
};

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function AuditLogsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageText = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "سجل التدقيق",
            loading: "جارٍ تحميل سجل التدقيق...",
            noData: "لا توجد سجلات تدقيق",
          }
        : {
            title: "Audit Logs",
            loading: "Loading audit logs...",
            noData: "No audit logs available",
          },
    [locale],
  );

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/audit/logs?limit=50");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const payload = (await response.json()) as
        | AuditLog[]
        | { logs?: AuditLog[] };
      setAuditLogs(Array.isArray(payload) ? payload : (payload.logs ?? []));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : pageText.loading,
      );
    } finally {
      setLoading(false);
    }
  }, [pageText.loading]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{pageText.title}</h1>
          </div>
          <div className="admin-header__actions">
            <DateTimeBadge />
            <LocaleSwitch />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/admin")}
            >
              {locale === "ar" ? "لوحة الإدارة" : "Admin"}
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2>{pageText.title}</h2>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadAuditLogs()}
            >
              {copy.refresh}
            </button>
          </div>

          {loading ? <p>{pageText.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}
          {!loading && auditLogs.length === 0 ? (
            <p className="admin-muted">{pageText.noData}</p>
          ) : null}

          {auditLogs.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{copy.admin.id}</th>
                    <th>{copy.admin.name}</th>
                    <th>{copy.admin.auditEntity}</th>
                    <th>{copy.admin.auditAction}</th>
                    <th>{copy.admin.calculatedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        {item.user
                          ? `${item.user.fullName} (@${item.user.username})`
                          : "-"}
                      </td>
                      <td>{item.entityType}</td>
                      <td>{item.action}</td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
