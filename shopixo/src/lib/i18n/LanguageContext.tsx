"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, getTranslations, isRtl } from './translations';

type TranslationType = typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationType;
  isRtl: boolean;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem('admin_lang') as Language;
    if (stored && (stored === 'en' || stored === 'ar')) {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('admin_lang', newLang);
  };

  const t = getTranslations(lang);
  const rtl = isRtl(lang);

  return (
    <LanguageContext.Provider value={{ 
      lang, 
      setLang, 
      t, 
      isRtl: rtl, 
      dir: rtl ? 'rtl' : 'ltr' 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
