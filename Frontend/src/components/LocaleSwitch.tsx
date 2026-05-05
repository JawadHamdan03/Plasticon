import { authCopy } from "../content/authCopy";
import { useLocale } from "../context/LocaleContext";
import { cn } from "../lib/utils";

type LocaleSwitchProps = {
  variant?: "light" | "dark";
};

export function LocaleSwitch({ variant = "light" }: LocaleSwitchProps) {
  const { locale, setLocale } = useLocale();
  const copy = authCopy[locale];

  return (
    <div
      className={cn(
        "inline-flex rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-1 shadow-sm",
        variant === "dark" && "bg-[#EEEEEE]",
      )}
      aria-label={copy.languageLabel}
    >
      <button
        type="button"
        className={cn(
          "rounded-xl px-3 py-2 text-sm font-semibold text-[#000000] transition hover:bg-[#EEEEEE]",
          locale === "en" && "bg-[#DCCFC0] text-[#000000] shadow-sm",
        )}
        onClick={() => setLocale("en")}
      >
        {copy.languageName}
      </button>
      <button
        type="button"
        className={cn(
          "rounded-xl px-3 py-2 text-sm font-semibold text-[#000000] transition hover:bg-[#EEEEEE]",
          locale === "ar" && "bg-[#DCCFC0] text-[#000000] shadow-sm",
        )}
        onClick={() => setLocale("ar")}
      >
        {copy.languageNameAlt}
      </button>
    </div>
  );
}




