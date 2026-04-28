import { useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

const updateDocumentTitle = (language) => {
  const title = translations[language]?.['page.title'];
  if (title) document.title = title;
};

const LANGUAGE_STORAGE_KEY = 'meeplemind-language';
const DEFAULT_LANGUAGE = 'pt-BR';
const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'fr-CA'];

const detectPreferredLanguage = () => {
  const browserCandidates = [
    ...(navigator.languages || []),
    navigator.language,
    navigator.userLanguage,
  ].filter(Boolean);

  for (const candidate of browserCandidates) {
    const normalizedCandidate = String(candidate).toLowerCase();
    const exactMatch = SUPPORTED_LANGUAGES.find(
      (lang) => lang.toLowerCase() === normalizedCandidate
    );
    if (exactMatch) return exactMatch;

    const baseLanguage = normalizedCandidate.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find(
      (lang) => lang.toLowerCase().startsWith(baseLanguage)
    );
    if (baseMatch) return baseMatch;
  }

  return DEFAULT_LANGUAGE;
};

const getInitialLanguage = () => {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch {
    // Ignore localStorage read failures.
  }

  return detectPreferredLanguage();
};

export const useLanguage = () => {
  const [language, setLanguage] = useState(getInitialLanguage);

  // Sync document.title whenever language changes
  useEffect(() => {
    updateDocumentTitle(language);
  }, [language]);

  const changeLanguage = useCallback((newLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(newLanguage)) {
      setLanguage(newLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      updateDocumentTitle(newLanguage);
    }
  }, []);

  const t = useCallback((key) => {
    const translationString = translations[language]?.[key];
    
    if (!translationString) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    return translationString;
  }, [language]);

  return {
    language,
    changeLanguage,
    t,
    isInitialized: true,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
};
