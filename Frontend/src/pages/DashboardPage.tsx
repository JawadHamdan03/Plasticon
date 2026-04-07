import { useNavigate } from "react-router-dom";
import { authCopy } from "../content/authCopy";
import { appCopy } from "../content/appCopy";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import logo from "../assets/plasticon.png";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { locale } = useLocale();
  const authText = authCopy[locale];
  const copy = appCopy[locale];

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <main className="dashboard-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="dashboard-card dashboard-card--expanded">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <img
              className="dashboard-brand__logo"
              src={logo}
              alt="Plasticon logo"
            />
            <div>
              <h1 className="dashboard-brand__name">{copy.appName}</h1>
              <span className="dashboard-brand__tag">
                {copy.commandCenterLabel}
              </span>
            </div>
          </div>
          <div className="dashboard-topbar__actions">
            <DateTimeBadge tone="dark" />
            <LocaleSwitch variant="dark" />
            <button
              type="button"
              className="auth-button dashboard-topbar-btn dashboard-topbar-btn--signout"
              onClick={handleSignOut}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <div className="dashboard-layout">
          <section className="dashboard-hero-card">
            <div>
              <p className="auth-eyebrow">{copy.dashboard.title}</p>
              <h1>{copy.dashboard.title}</h1>
              <p>{copy.dashboard.subtitle}</p>
            </div>

            <div className="dashboard-card__meta">
              <span>{user?.name ?? authText.dashboardUserFallback}</span>
              <span>{user?.email ?? authText.dashboardEmailFallback}</span>
              <span>{user?.role ?? authText.dashboardRoleFallback}</span>
            </div>

            <div className="dashboard-stat-grid">
              <article className="dashboard-stat-card">
                <span>{copy.dashboard.activityLabel}</span>
                <strong>{copy.dashboard.activityValue}</strong>
              </article>
              <article className="dashboard-stat-card">
                <span>{copy.dashboard.workspaceStatusLabel}</span>
                <strong>{copy.dashboard.workspaceStatusValue}</strong>
              </article>
              <article className="dashboard-stat-card">
                <span>{copy.dashboard.kpiQualityLabel}</span>
                <strong>{copy.dashboard.kpiQualityValue}</strong>
              </article>
              <article className="dashboard-stat-card">
                <span>{copy.dashboard.kpiThroughputLabel}</span>
                <strong>{copy.dashboard.kpiThroughputValue}</strong>
              </article>
            </div>

            <div className="dashboard-links">
              <button
                type="button"
                className="auth-button dashboard-action-btn dashboard-action-btn--inventory"
                onClick={() => navigate("/inventory")}
              >
                {copy.dashboard.inventory}
              </button>
              <button
                type="button"
                className="auth-button dashboard-action-btn dashboard-action-btn--production"
                onClick={() => navigate("/production")}
              >
                {copy.dashboard.production}
              </button>
              <button
                type="button"
                className="auth-button dashboard-action-btn dashboard-action-btn--reports"
                onClick={() => navigate("/reports")}
              >
                {copy.dashboard.reports}
              </button>
              <button
                type="button"
                className="auth-button dashboard-action-btn dashboard-action-btn--notifications"
                onClick={() => navigate("/notifications")}
              >
                {copy.dashboard.notifications}
              </button>
            </div>
          </section>

          <aside className="dashboard-sidecard">
            <div className="dashboard-sidecard__summary">
              <p>{copy.dashboard.workspaceStatusLabel}</p>
              <strong>{copy.dashboard.workspaceStatusValue}</strong>
            </div>

            {user?.role === "ADMIN" ? (
              <div className="dashboard-admin-shortcuts">
                <p className="dashboard-admin-shortcuts__eyebrow">
                  {copy.dashboard.adminShortcutsTitle}
                </p>
                <h2>{copy.dashboard.adminShortcutsTitle}</h2>
                <p>{copy.dashboard.adminShortcutsSubtitle}</p>

                <div className="dashboard-shortcut-grid">
                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--users"
                    onClick={() => navigate("/admin/users")}
                  >
                    {copy.admin.usersTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--settings"
                    onClick={() => navigate("/admin/settings")}
                  >
                    {copy.dashboard.settingsShortcut}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--attendance"
                    onClick={() => navigate("/admin/attendance")}
                  >
                    {copy.admin.attendanceTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--payroll"
                    onClick={() => navigate("/admin/payroll")}
                  >
                    {copy.admin.payrollTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--users"
                    onClick={() => navigate("/admin/shifts")}
                  >
                    {copy.admin.shiftsTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--users"
                    onClick={() => navigate("/admin/machines")}
                  >
                    {copy.admin.machinesTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--settings"
                    onClick={() => navigate("/admin/audit-logs")}
                  >
                    {copy.admin.auditLogsTab}
                  </button>

                  <button
                    type="button"
                    className="auth-button dashboard-side-btn dashboard-side-btn--settings"
                    onClick={() => navigate("/admin/dashboard-analytics")}
                  >
                    {copy.admin.dashboardTab}
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="auth-button dashboard-side-btn dashboard-side-btn--reports"
              onClick={() => navigate("/chat")}
            >
              {locale === "ar" ? "الدردشة" : "Chat"}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
