import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, TranslationSet, languages } from "./translations";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: keyof TranslationSet) => string;
  supportedLanguages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem("swasthya_setu_lang") || "en";
  });

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("swasthya_setu_lang", lang);
  };

  const t = (key: keyof TranslationSet): string => {
    const langSet = translations[language] || translations["en"];
    const fallbackSet = translations["en"];
    return langSet[key] !== undefined ? langSet[key] : (fallbackSet[key] || String(key));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
