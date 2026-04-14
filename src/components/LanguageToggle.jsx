import './LanguageToggle.css';

const LANGUAGES = [
  { code: 'pt-BR', label: '🇧🇷 Português' },
  { code: 'en-US', label: '🇺🇸 English' },
  { code: 'fr-CA', label: '🇨🇦 Français' },
];

export const LanguageToggle = ({ currentLanguage, onLanguageChange }) => {
  const handleLanguageChange = (e) => {
    onLanguageChange(e.target.value);
  };

  return (
    <div className="language-toggle">
      <select 
        value={currentLanguage} 
        onChange={handleLanguageChange}
        className="language-select"
        title="Selecionar idioma / Select language / Sélectionner la langue"
      >
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};
