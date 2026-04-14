import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  userId?: number | null;
  user?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
};

type NotificationListResponse = {
  items: NotificationItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export function NotificationsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    type: "SYSTEM_MESSAGE",
    targetType: "USER" as "USER" | "SHIFT" | "ALL",
    title: "",
    message: "",
    userId: "",
    shiftId: "",
  });

  const loadNotifications = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [itemsResponse, countResponse] = await Promise.all([
        fetchWithAuth("/notifications"),
        fetchWithAuth("/notifications/unread-count"),
      ]);

      if (!itemsResponse.ok) {
        throw new Error(await readApiError(itemsResponse));
      }
      if (!countResponse.ok) {
        throw new Error(await readApiError(countResponse));
      }

      const itemsData =
        (await itemsResponse.json()) as NotificationListResponse;
      setNotifications(itemsData.items ?? []);
      const countData = (await countResponse.json()) as {
        unreadCount?: number;
        count?: number;
      };
      setUnreadCount(countData.unreadCount ?? countData.count ?? 0);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    setErrorMessage("");
    try {
      const response = await fetchWithAuth(`/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadNotifications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update notification",
      );
    }
  };

  const markAllAsRead = async () => {
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/notifications/read-all", {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadNotifications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to mark notifications as read",
      );
    }
  };

  const handleCreateNotification = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        type: form.type,
        targetType: form.targetType,
        title: form.title,
        message: form.message,
        ...(form.targetType === "USER" && form.userId
          ? { userId: Number(form.userId) }
          : {}),
        ...(form.targetType === "SHIFT" && form.shiftId
          ? { shiftId: Number(form.shiftId) }
          : {}),
      };

      const response = await fetchWithAuth("/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setSuccessMessage(copy.notifications.success);
      setForm({
        type: "SYSTEM_MESSAGE",
        targetType: "USER",
        title: "",
        message: "",
        userId: "",
        shiftId: "",
      });
      await loadNotifications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create notification",
      );
    }
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <ModulePageShell
      title={copy.notifications.title}
      subtitle={copy.notifications.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            void loadNotifications();
          }}
        >
          {copy.refresh}
        </button>
      }
    >
      <div className="module-summary-bar">
        <span>{copy.notifications.summaryLabel}</span>
        <strong>{unreadCount}</strong>
        <span>{copy.notifications.totalNotifications}</span>
        <strong>{notifications.length}</strong>
      </div>

      <section className="module-grid">
        <article className="module-panel">
          <h2>{copy.notifications.inbox}</h2>
          <div className="module-summary-bar">
            <span>{copy.notifications.unread}</span>
            <strong>{unreadCount}</strong>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                void markAllAsRead();
              }}
            >
              {copy.notifications.markAllRead}
            </button>
          </div>
          {loading ? <p>{copy.notifications.loading}</p> : null}
          <div className="module-list">
            {notifications.map((notification) => (
              <div className="module-row" key={notification.id}>
                <strong>{notification.title}</strong>
                <span>
                  {notification.type} •{" "}
                  {notification.isRead
                    ? copy.notifications.read
                    : copy.notifications.unreadStatus}
                </span>
                <small>{notification.message}</small>
                {!notification.isRead ? (
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() => {
                      void markAsRead(notification.id);
                    }}
                  >
                    {copy.notifications.markRead}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        {isAdmin ? (
          <article className="module-panel">
            <h2>{copy.notifications.createNotification}</h2>
            <form className="module-form" onSubmit={handleCreateNotification}>
              <label>
                {copy.notifications.targetType}
                <select
                  value={form.targetType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      targetType: event.target.value as
                        | "USER"
                        | "SHIFT"
                        | "ALL",
                    }))
                  }
                >
                  <option value="USER">{copy.notifications.targetUser}</option>
                  <option value="SHIFT">
                    {copy.notifications.targetShift}
                  </option>
                  <option value="ALL">{copy.notifications.targetAll}</option>
                </select>
              </label>

              <label>
                {copy.notifications.type}
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <option value="SYSTEM_MESSAGE">SYSTEM_MESSAGE</option>
                  <option value="CHAT_MESSAGE">CHAT_MESSAGE</option>
                  <option value="PRODUCTION_ALERT">PRODUCTION_ALERT</option>
                  <option value="MAINTENANCE_URGENT">MAINTENANCE_URGENT</option>
                  <option value="QUALITY_ISSUE">QUALITY_ISSUE</option>
                  <option value="PAYROLL_READY">PAYROLL_READY</option>
                  <option value="INVENTORY_LOW">INVENTORY_LOW</option>
                </select>
              </label>

              <label>
                {copy.notifications.titleLabel}
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                {copy.notifications.messageLabel}
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {form.targetType === "USER" ? (
                <label>
                  {copy.notifications.targetUserId}
                  <input
                    type="number"
                    min={1}
                    value={form.userId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        userId: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              ) : null}

              {form.targetType === "SHIFT" ? (
                <label>
                  {copy.notifications.targetShiftId}
                  <input
                    type="number"
                    min={1}
                    value={form.shiftId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        shiftId: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              ) : null}

              <button type="submit" className="auth-button">
                {copy.notifications.createButton}
              </button>
            </form>
            {successMessage ? (
              <div className="auth-alert">{successMessage}</div>
            ) : null}
            {errorMessage ? (
              <div className="auth-alert auth-alert--error">{errorMessage}</div>
            ) : null}
          </article>
        ) : null}
      </section>

      {!isAdmin && errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}
