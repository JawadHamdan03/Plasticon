import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../context/LocaleContext";

export function DateTimeBadge() {
  const { locale } = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isAr = locale === "ar";
  const loc  = "ar-EG";

  const dateStr = useMemo(
    () => new Intl.DateTimeFormat(loc, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loc, now.toDateString()],
  );

  const timeStr = new Intl.DateTimeFormat(loc, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return (
    <div className="dt-badge" dir="ltr">
      <span className="dt-badge__icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
      <span className="dt-badge__date">{dateStr}</span>
      <span className="dt-badge__divider" />
      <span className="dt-badge__time">{timeStr}</span>
    </div>
  );
}
