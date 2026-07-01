import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

const STORAGE_KEY = 'plasticon_locale';

export type Locale = 'en' | 'ar';

type LocaleContextValue = {
  locale: Locale;
  isAr: boolean;
  setLocale: (l: Locale) => void;
  t: (en: string, ar: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    I18nManager.forceRTL(true);
    AsyncStorage.setItem(STORAGE_KEY, 'ar');
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
    I18nManager.forceRTL(l === 'ar');
  };

  const t = (en: string, ar: string) => locale === 'ar' ? ar : en;

  return (
    <LocaleContext.Provider value={{ locale, isAr: locale === 'ar', setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
