"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, getTranslation } from "./translations";

type TranslationValue = string | { [key: string]: TranslationValue };

type Translations = {
  nav: Record<string, string>;
  sections: Record<string, string>;
  dashboard: Record<string, string>;
  sync: Record<string, string>;
  inventory: Record<string, string>;
  common: Record<string, string>;
  currency: Record<string, string>;
};

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_STORAGE_KEY = "shopixo_admin_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "ar")) {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const value: I18nContextType = {
    locale,
    setLocale,
    t: getTranslation(locale),
    dir: locale === "ar" ? "rtl" : "ltr",
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      t: getTranslation("en"),
      dir: "ltr" as const,
    };
  }
  return context;
}

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      title={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <span className="text-lg">{locale === "en" ? "🇸🇦" : "🇺🇸"}</span>
      <span>{locale === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
