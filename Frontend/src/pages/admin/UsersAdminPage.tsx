import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";

type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  isActive: boolean;
  deletedAt?: string | null;
};

const tokenKey = "plasticon_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

export function UsersAdminPage() {
  useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/users/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as AdminUser[];
      setUsers(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const getRoleLabel = (role: AdminUser["role"]) =>
    copy.admin.roleLabels[role] ?? role;

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{copy.admin.usersTitle}</h1>
          </div>
          <div className="admin-header__actions">
            <button
              type="button"
              className="btn btn--outline-gray btn--sm"
              onClick={() => void loadUsers()}
            >
              {copy.refresh ?? (locale === "ar" ? "تحديث" : "Refresh")}
            </button>
          </div>
        </header>

        <section className="admin-section">
          {loading ? (
            <p className="admin-muted">{copy.admin.loadingUsers}</p>
          ) : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.admin.id}</th>
                  <th>{copy.admin.name}</th>
                  <th>{copy.admin.username}</th>
                  <th>{copy.admin.email}</th>
                  <th>{copy.admin.role}</th>
                  <th>{copy.admin.status}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.fullName}</td>
                    <td>{item.username}</td>
                    <td>{item.email ?? "-"}</td>
                    <td>{getRoleLabel(item.role)}</td>
                    <td>
                      {item.deletedAt
                        ? copy.admin.deleted
                        : item.isActive
                          ? copy.admin.active
                          : copy.admin.inactive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
