import { createContext, useContext, useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { language, changeLanguage, t, isInitialized, supportedLanguages } = useLanguage();
  
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
};
