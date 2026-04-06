import { authCopy } from "../content/authCopy";
import { useLocale } from "../context/LocaleContext";

type LocaleSwitchProps = {
  variant?: "light" | "dark";
};

export function LocaleSwitch({ variant = "light" }: LocaleSwitchProps) {
  const { locale, setLocale } = useLocale();
  const copy = authCopy[locale];

  return (
    <div
      className={`auth-language-switch auth-language-switch--${variant}`}
      aria-label={copy.languageLabel}
    >
      <button
        type="button"
        className={locale === "en" ? "is-active" : ""}
        onClick={() => setLocale("en")}
      >
        {copy.languageName}
      </button>
      <button
        type="button"
        className={locale === "ar" ? "is-active" : ""}
        onClick={() => setLocale("ar")}
      >
        {copy.languageNameAlt}
      </button>
    </div>
  );
}
