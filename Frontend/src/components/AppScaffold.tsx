import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { GlobalCommandSearch } from "./GlobalCommandSearch";
import { DateTimeBadge } from "./DateTimeBadge";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatarBadge } from "./UserAvatarBadge";
import { Button } from "./ui/button";
import { API_BASE_URL } from "../lib/api";
import logo from "../assets/plasticon.png";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationListResponse = {
  items: NotificationItem[];
};

type NavItem = {
  to: string;
  labelAr: string;
  labelEn: string;
};

type AppScaffoldProps = {
  children: ReactNode;
};

export function AppScaffold({ children }: AppScaffoldProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<
    NotificationItem[]
  >([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const isRtl = locale === "ar";

  const role = String(user?.role ?? "").toUpperCase();

  const fetchNotifications = async () => {
    setNotificationsLoading(true);

    try {
      const token = window.localStorage.getItem("plasticon_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [itemsResponse, countResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/notifications?limit=10&page=1`, {
          credentials: "include",
          headers,
        }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, {
          credentials: "include",
          headers,
        }),
      ]);

      if (itemsResponse.ok) {
        const itemsData =
          (await itemsResponse.json()) as NotificationListResponse;
        setRecentNotifications(itemsData.items ?? []);
      }

      if (countResponse.ok) {
        const countData = (await countResponse.json()) as {
          unreadCount?: number;
          count?: number;
        };
        setUnreadNotifications(countData.unreadCount ?? countData.count ?? 0);
      }
    } catch {
      setRecentNotifications([]);
      setUnreadNotifications(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, [role, user?.role]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    void fetchNotifications();
  }, [notificationsOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const formatNotificationTime = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  const navItems: NavItem[] = [
    { to: "/dashboard", labelAr: "الرئيسية", labelEn: "Home" },
    { to: "/production", labelAr: "الإنتاج", labelEn: "Production" },
    { to: "/notifications", labelAr: "الإشعارات", labelEn: "Notifications" },
    { to: "/attendance", labelAr: "الحضور", labelEn: "Attendance" },
    { to: "/chat", labelAr: "الدردشة", labelEn: "Chat" },
  ];

  if (role === "ACCOUNTANT" || role === "ADMIN") {
    navItems.splice(2, 0, {
      to: "/inventory",
      labelAr: "المخزون",
      labelEn: "Inventory",
    });
    navItems.splice(3, 0, {
      to: "/purchases",
      labelAr: "المشتريات",
      labelEn: "Purchases",
    });
    navItems.splice(4, 0, {
      to: "/sales",
      labelAr: "المبيعات",
      labelEn: "Sales",
    });
    navItems.splice(5, 0, {
      to: "/reports",
      labelAr: "التقارير",
      labelEn: "Reports",
    });
    navItems.push({
      to: "/my-payroll",
      labelAr: "الرواتب",
      labelEn: "Payroll",
    });
    navItems.push({
      to: "/admin/attendance",
      labelAr: "إدارة الحضور",
      labelEn: "Attendance Admin",
    });
    navItems.push({
      to: "/admin/payroll",
      labelAr: "إدارة الرواتب",
      labelEn: "Payroll Admin",
    });
  }

  if (role === "WORKER") {
    navItems.push({
      to: "/worker/snapshots",
      labelAr: "القراءات",
      labelEn: "Readings",
    });
    navItems.push({
      to: "/worker/tools",
      labelAr: "أدوات العامل",
      labelEn: "Worker Tools",
    });
  }

  if (role === "ADMIN") {
    navItems.push({
      to: "/admin/snapshots",
      labelAr: "اللقطات",
      labelEn: "Snapshots",
    });
    navItems.push({
      to: "/admin/shifts",
      labelAr: "الشفتات",
      labelEn: "Shifts",
    });
    navItems.push({
      to: "/admin/machines",
      labelAr: "الماكينات",
      labelEn: "Machines",
    });
    navItems.push({
      to: "/admin/audit-logs",
      labelAr: "سجل التدقيق",
      labelEn: "Audit Logs",
    });
    navItems.push({
      to: "/admin/dashboard-analytics",
      labelAr: "لوحة التحليلات",
      labelEn: "Dashboard Analytics",
    });
    navItems.push({
      to: "/admin/settings/electricity",
      labelAr: "الكهرباء",
      labelEn: "Electricity",
    });
    navItems.push({
      to: "/admin/users",
      labelAr: "المستخدمون",
      labelEn: "Users",
    });
    navItems.push({
      to: "/admin/settings",
      labelAr: "الإعدادات",
      labelEn: "Settings",
    });
  }

  return (
    <main
      className={`app-shell-modern ${isRtl ? "is-rtl" : "is-ltr"} grid min-h-svh grid-cols-[292px_minmax(0,1fr)] gap-4 p-4 max-xl:grid-cols-1 max-xl:p-3`}
      data-locale={locale}
    >
      <aside className="app-sidebar-modern sticky top-4 z-30 grid h-[calc(100svh-2rem)] grid-rows-[auto_1fr_auto] gap-3 rounded-[1.875rem] border border-[#EEEEEE] bg-[#A2AF9B] p-4 text-[#000000] shadow-[0_20px_44px_rgba(162, 175, 155,0.34)] max-xl:h-auto max-xl:rounded-[1.4rem]">
        <div className="app-sidebar-modern__brand flex items-center gap-3 border-b border-[#EEEEEE] pb-4">
          <img src={logo} alt="Plasticon" />
          <div>
            <strong>Plasticon</strong>
            <small>{locale === "ar" ? "إدارة المصنع" : "Factory Ops"}</small>
          </div>
        </div>

        <nav className="app-sidebar-modern__nav grid content-start gap-2 overflow-auto pr-1 max-xl:grid-cols-2 max-md:grid-cols-1">
          {navItems.map((item) => {
            const itemPath = item.to.split("?")[0];
            const isActive =
              location.pathname === itemPath ||
              (itemPath !== "/dashboard" &&
                location.pathname.startsWith(itemPath));

            return (
              <motion.div
                key={item.to}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Link
                  to={item.to}
                  className={`app-sidebar-modern__link flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${isActive ? "border-[#EEEEEE] bg-[#FFFFFF] text-[#000000] shadow-[0_10px_22px_rgba(162, 175, 155,0.2)]" : "border-transparent text-[#000000] hover:border-[#EEEEEE] hover:bg-[#DCCFC0]"}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isActive ? "bg-[#DCCFC0] shadow-[0_0_0_3px_rgba(220, 207, 192,0.36)]" : "bg-[#EEEEEE] shadow-[0_0_0_2px_rgba(238, 238, 238,0.4)]"}`}
                    aria-hidden="true"
                  />
                  <span>{locale === "ar" ? item.labelAr : item.labelEn}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="app-sidebar-modern__footer border-t border-[#EEEEEE] pt-4">
          <p className="mb-3 text-sm font-semibold text-[#000000]">
            {user?.name ?? "-"}
          </p>
          <Button
            variant="secondary"
            className="w-full border-[#EEEEEE] bg-[#EEEEEE] text-[#000000] shadow-none hover:bg-[#DCCFC0]"
            onClick={() => {
              signOut();
              navigate("/login");
            }}
          >
            {locale === "ar" ? "تسجيل الخروج" : "Log Out"}
          </Button>
        </div>
      </aside>

      <section className="app-main-modern grid min-w-0 grid-rows-[auto_1fr] gap-4">
        <header className="app-topbar-modern sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[#EEEEEE] bg-[#FFFFFF] p-3 shadow-[0_6px_16px_rgba(162, 175, 155,0.16)] backdrop-blur">
          <div className="app-topbar-modern__search min-w-0 flex-1">
            <GlobalCommandSearch />
          </div>
          <div className="app-topbar-modern__actions flex flex-wrap items-center justify-end gap-2">
            <div className="app-topbar-modern__meta flex items-center gap-2">
              <DateTimeBadge className="app-topbar-modern__clock" />
              <LocaleSwitch />
            </div>
            <ThemeToggle />
            <div className="relative" ref={notificationsMenuRef}>
              <Button
                variant="outline"
                className="relative border-[#EEEEEE] bg-[#FFFFFF] text-[#000000] hover:bg-[#DCCFC0]"
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-expanded={notificationsOpen}
                aria-label={locale === "ar" ? "الإشعارات" : "Notifications"}
                title={locale === "ar" ? "الإشعارات" : "Notifications"}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  {unreadNotifications}
                </span>
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#A2AF9B] px-1 text-[11px] font-bold text-[#FFFFFF]">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </Button>

              {notificationsOpen ? (
                <div
                  className={`absolute top-full z-40 mt-3 w-88 max-w-[calc(100vw-1.5rem)] rounded-[1.35rem] border border-[#EEEEEE] bg-[#FFFFFF] p-3 shadow-[0_24px_48px_rgba(162,175,155,0.24)] ${isRtl ? "left-0" : "right-0"}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#EEEEEE] pb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#000000]">
                        {locale === "ar"
                          ? `آخر الإشعارات (${unreadNotifications})`
                          : `Latest notifications (${unreadNotifications})`}
                      </p>
                      <p className="text-xs text-[#5F6659]">
                        {unreadNotifications > 0
                          ? locale === "ar"
                            ? `${unreadNotifications} غير مقروءة`
                            : `${unreadNotifications} unread`
                          : locale === "ar"
                            ? "كل الإشعارات مقروءة"
                            : "All caught up"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-xs"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications");
                      }}
                    >
                      {locale === "ar" ? "عرض الكل" : "View all"}
                    </Button>
                  </div>

                  <div className="pr-1">
                    {notificationsLoading ? (
                      <div className="rounded-2xl border border-dashed border-[#DCCFC0] px-4 py-6 text-sm text-[#5F6659]">
                        {locale === "ar"
                          ? "جاري تحميل الإشعارات..."
                          : "Loading notifications..."}
                      </div>
                    ) : recentNotifications.length > 0 ? (
                      <div className="grid gap-2">
                        {recentNotifications.slice(0, 6).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate("/notifications");
                            }}
                            className={`w-full rounded-2xl border px-3 py-3 text-start transition hover:border-[#A2AF9B] hover:bg-[#F7F7F2] ${
                              notification.isRead
                                ? "border-[#EEEEEE] bg-[#FFFFFF]"
                                : "border-[#DCCFC0] bg-[#FAF9EE]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                  notification.isRead
                                    ? "bg-[#DCCFC0]"
                                    : "bg-[#A2AF9B]"
                                }`}
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-semibold text-[#000000]">
                                    {notification.title}
                                  </p>
                                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F6659]">
                                    {notification.type.replaceAll("_", " ")}
                                  </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-[#5F6659]">
                                  {notification.message}
                                </p>
                                <p className="mt-2 text-[11px] font-medium text-[#5F6659]">
                                  {formatNotificationTime(
                                    notification.createdAt,
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                        {recentNotifications.length > 6 ? (
                          <p className="px-3 pb-1 text-[11px] font-medium text-[#5F6659]">
                            {locale === "ar"
                              ? "اعرض بقية الإشعارات من صفحة الإشعارات"
                              : "Open the notifications page to see the rest"}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#DCCFC0] px-4 py-6 text-sm text-[#5F6659]">
                        {locale === "ar"
                          ? "لا توجد إشعارات بعد."
                          : "No notifications yet."}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <UserAvatarBadge size="sm" />
          </div>
        </header>
        <div className="app-main-modern__content min-w-0">{children}</div>
      </section>
    </main>
  );
}
