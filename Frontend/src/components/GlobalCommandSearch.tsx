import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

type SearchItem = {
  labelAr: string;
  labelEn: string;
  to: string;
};

const allItems: SearchItem[] = [
  { labelAr: "لوحة التحكم", labelEn: "Dashboard", to: "/dashboard" },
  { labelAr: "الإنتاج", labelEn: "Production", to: "/production" },
  { labelAr: "الإشعارات", labelEn: "Notifications", to: "/notifications" },
  { labelAr: "الدردشة", labelEn: "Chat", to: "/chat" },
  { labelAr: "المخزون", labelEn: "Inventory", to: "/inventory" },
  { labelAr: "المشتريات", labelEn: "Purchases", to: "/purchases" },
  { labelAr: "المبيعات", labelEn: "Sales", to: "/sales" },
  { labelAr: "التقارير", labelEn: "Reports", to: "/reports" },
  { labelAr: "الحضور", labelEn: "Attendance", to: "/attendance" },
  { labelAr: "الرواتب", labelEn: "My Payroll", to: "/my-payroll" },
  {
    labelAr: "قراءات العامل",
    labelEn: "Worker Snapshots",
    to: "/worker/snapshots",
  },
  { labelAr: "أدوات العامل", labelEn: "Worker Tools", to: "/worker/tools" },
  { labelAr: "مستخدمو الأدمن", labelEn: "Admin Users", to: "/admin/users" },
  {
    labelAr: "حضور الأدمن",
    labelEn: "Admin Attendance",
    to: "/admin/attendance",
  },
  { labelAr: "رواتب الأدمن", labelEn: "Admin Payroll", to: "/admin/payroll" },
  {
    labelAr: "لقطات الأدمن",
    labelEn: "Admin Snapshots",
    to: "/admin/snapshots",
  },
  {
    labelAr: "إعدادات الأدمن",
    labelEn: "Admin Settings",
    to: "/admin/settings",
  },
  {
    labelAr: "كهرباء الأدمن",
    labelEn: "Admin Electricity",
    to: "/admin/settings/electricity",
  },
];

export function GlobalCommandSearch() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const role = String(user?.role ?? "").toUpperCase();

  const allowed = useMemo(() => {
    return allItems.filter((item) => {
      if (item.to.startsWith("/admin")) {
        return role === "ADMIN";
      }
      if (
        item.to === "/inventory" ||
        item.to === "/reports" ||
        item.to === "/purchases" ||
        item.to === "/sales"
      ) {
        return role === "ADMIN" || role === "ACCOUNTANT";
      }
      if (item.to.startsWith("/worker/")) {
        return role === "WORKER";
      }
      return true;
    });
  }, [role]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return allowed.slice(0, 6);
    }

    return allowed.filter((item) => {
      const haystack = `${item.labelAr} ${item.labelEn}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [allowed, query]);

  return (
    <div className="global-search relative w-full min-w-0 max-w-none">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={locale === "ar" ? "بحث سريع..." : "Quick search..."}
        className="h-10 w-full pl-3 pr-3 text-sm"
      />
      {query.trim() ? (
        <Card className="global-search__menu absolute inset-x-0 top-[calc(100%+0.75rem)] z-50 grid gap-2 p-2">
          {filtered.length ? (
            filtered.slice(0, 7).map((item) => (
              <button
                key={item.to}
                type="button"
                className="flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-[#000000] transition hover:bg-[#EEEEEE]"
                onClick={() => {
                  navigate(item.to);
                  setQuery("");
                }}
              >
                <span>{locale === "ar" ? item.labelAr : item.labelEn}</span>
                <Badge tone="soft">{item.to}</Badge>
              </button>
            ))
          ) : (
            <p className="p-2 text-sm text-[#000000]">
              {locale === "ar" ? "لا نتائج" : "No results"}
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
