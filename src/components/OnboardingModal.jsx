import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { GoogleAuthButton } from './GoogleAuthButton';
import logoImage from '../assets/meeplemind_logo.png';
import './OnboardingModal.css';

const WELCOME_LANGUAGES = [
  { code: 'pt-BR', flag: '🇧🇷', labelKey: 'onboarding.langPTBR' },
  { code: 'en-US', flag: '🇺🇸', labelKey: 'onboarding.langENUS' },
  { code: 'fr-CA', flag: '🇨🇦', labelKey: 'onboarding.langFRCA' },
];

export const OnboardingModal = ({ onComplete, auth, syncStatus }) => {
  const { t, language, changeLanguage } = useLanguage();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  const hasError = touched && !name.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setTouched(true);
      return;
    }
    onComplete(trimmed);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card fade-in">
        <img src={logoImage} alt="MeepleMind" className="onboarding-logo" />
        <h1 className="onboarding-title">{t('onboarding.title')}</h1>
        <p className="onboarding-about">{t('onboarding.about')}</p>
        <p className="onboarding-desc">{t('onboarding.description')}</p>
        
        {auth?.isConfigured && (
          <div className="onboarding-google-block" aria-label={t('onboarding.googleSectionAria')}>
            <GoogleAuthButton auth={auth} syncStatus={syncStatus} />
            <p className="onboarding-google-hint">{t('onboarding.googleHint')}</p>
          </div>
        )}

        <div className="onboarding-divider" aria-hidden>
          <span>{t('onboarding.orUseName')}</span>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <input
            type="text"
            className={`onboarding-input ${hasError ? 'input-error' : ''}`}
            placeholder={t('onboarding.placeholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTouched(false);
            }}
            onBlur={() => setTouched(true)}
            autoFocus
            maxLength={30}
          />
          {hasError && (
            <span className="onboarding-error-msg">{t('onboarding.error')}</span>
          )}
          <button
            type="submit"
            className="onboarding-btn"
            disabled={!name.trim()}
          >
            {t('onboarding.submit')}
          </button>
        </form>
      </div>

      <div className="onboarding-language-bottom" aria-label={t('onboarding.languageSelectorLabel')}>
        {WELCOME_LANGUAGES.map((item) => (
          <button
            key={item.code}
            type="button"
            className={`onboarding-language-flag${language === item.code ? ' active' : ''}`}
            onClick={() => changeLanguage(item.code)}
            title={t(item.labelKey)}
            aria-label={t(item.labelKey)}
          >
            <span aria-hidden>{item.flag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
