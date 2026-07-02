"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "ar";

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (english: string, arabic: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "diamond-design-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "ar" || saved === "en") setLanguageState(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isArabic: language === "ar",
      setLanguage: setLanguageState,
      toggleLanguage: () => setLanguageState((current) => (current === "ar" ? "en" : "ar")),
      t: (english, arabic) => (language === "ar" ? arabic : english)
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider.");
  return value;
}
