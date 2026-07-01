import React, { createContext, useContext } from 'react';
import { I18nManager } from 'react-native';

// Permanently locked to Arabic
I18nManager.forceRTL(true);

export type Locale = 'ar';

type LocaleContextValue = {
  locale: Locale;
  isAr: true;
  setLocale: (l: Locale) => void;
  t: (en: string, ar: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ar',
  isAr: true,
  setLocale: () => {},
  t: (_en, ar) => ar,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value={{
      locale: 'ar',
      isAr: true,
      setLocale: () => {},
      t: (_en, ar) => ar,
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
