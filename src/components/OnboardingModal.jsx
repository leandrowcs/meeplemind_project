import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import logoImage from '../assets/meeplemind_logo.png';
import './OnboardingModal.css';

export const OnboardingModal = ({ onComplete }) => {
  const { t } = useLanguage();
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
        <p className="onboarding-desc">{t('onboarding.description')}</p>

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
    </div>
  );
};
