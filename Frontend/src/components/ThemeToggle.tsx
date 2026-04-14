import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLocale } from "../context/LocaleContext";

export function ThemeToggle() {
  const { locale } = useLocale();
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";
  const lightLabel = locale === "ar" ? "الوضع الفاتح" : "Light mode";
  const darkLabel = locale === "ar" ? "الوضع الداكن" : "Dark mode";

  return (
    <div className="inline-flex overflow-hidden rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] shadow-none">
      <button
        type="button"
        className={`inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold transition ${!isDark ? "bg-[#A2AF9B] text-[#FFFFFF]" : "bg-[#FFFFFF] text-[#000000] hover:bg-[#EEEEEE]"}`}
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        aria-label={lightLabel}
        title={lightLabel}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        <span>{locale === "ar" ? "فاتح" : "Light"}</span>
      </button>
      <button
        type="button"
        className={`inline-flex min-h-10 items-center gap-2 border-l border-[#EEEEEE] px-3 text-sm font-semibold  transition ${isDark ? "bg-[#101418] text-[#FFFFFF]" : "bg-[#FFFFFF] text-[#ffffff] hover:bg-[#EEEEEE]"}`}
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        aria-label={darkLabel}
        title={darkLabel}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
        <span>{locale === "ar" ? "داكن" : "Dark"}</span>
      </button>
    </div>
  );
}




