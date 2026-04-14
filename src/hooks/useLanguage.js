import { useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'meeplemind-language';
const DEFAULT_LANGUAGE = 'pt-BR';
const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'fr-CA'];

export const useLanguage = () => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      setLanguage(savedLanguage);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language || navigator.userLanguage;
      const matchedLanguage = SUPPORTED_LANGUAGES.find(lang => 
        browserLang.startsWith(lang.split('-')[0])
      ) || DEFAULT_LANGUAGE;
      
      setLanguage(matchedLanguage);
    }
    
    setIsInitialized(true);
  }, []);

  const changeLanguage = useCallback((newLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(newLanguage)) {
      setLanguage(newLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
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
    isInitialized,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
};
