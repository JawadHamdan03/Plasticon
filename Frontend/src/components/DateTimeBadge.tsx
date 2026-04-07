import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../context/LocaleContext";

type DateTimeBadgeProps = {
  tone?: "light" | "dark";
  className?: string;
};

export function DateTimeBadge({
  tone = "light",
  className = "",
}: DateTimeBadgeProps) {
  const { locale } = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale],
  );

  return (
    <div className={`app-clock app-clock--${tone} ${className}`.trim()}>
      <span className="app-clock__label">
        {locale === "ar" ? "اليوم" : "Today"}
      </span>
      <strong className="app-clock__date">{dateFormatter.format(now)}</strong>
      <span className="app-clock__time">{timeFormatter.format(now)}</span>
    </div>
  );
}
