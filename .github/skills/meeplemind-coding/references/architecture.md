# Architecture Reference

## Folder Layout

```
src/
├── components/         Page-level + reusable UI
│   ├── MyComp.jsx      Component logic + rendering
│   └── MyComp.css      Colocated styles (no global leakage)
├── hooks/              Stateful business logic
│   └── useFeature.js   Hook (must start with "use")
├── utils/              Pure helpers (no React, no side effects)
│   ├── sanitize.js     Input sanitization helpers
│   ├── dateFormat.js   Date formatting
│   ├── gameCover.js    Cover URL helpers
│   ├── classifications.js  Game type/category maps
│   └── gameDataProviders.js  BGG / Ludopedia API abstraction
├── i18n/
│   └── translations.js Single source of all UI strings
├── data/
│   ├── changelog.js    User-facing release notes
│   └── bggBundledCatalog.js  Top-5000 BGG offline catalog
├── contexts/
│   └── LanguageContext.jsx
├── App.jsx / App.css
├── index.css           CSS variables (colors, typography)
├── components-v2.css   Component tokens (buttons, cards, etc.)
└── microinteractions-v2.css  Hover, loading, toasts
```

## File Naming

| Type | Convention | Example |
| ------ | ----------- | --------- |
| Component | PascalCase | `GameDetailsModal.jsx` |
| CSS | PascalCase matching component | `GameDetailsModal.css` |
| Hook | camelCase, `use` prefix | `useGames.js` |
| Utility | camelCase | `dateFormat.js` |
| Data | camelCase | `changelog.js` |

## Decision: Where Does This Code Go?

| Question | Answer |
| ---------- | -------- |
| Does it render UI? | `src/components/*.jsx` |
| Does it use `useState`/`useEffect`? | `src/hooks/use*.js` |
| Is it a pure function? | `src/utils/*.js` |
| Is it a constant or static dataset? | `src/data/*.js` |
| Is it a user-visible string? | `src/i18n/translations.js` |

## Existing Hooks (do not duplicate)

| Hook | Purpose |
| ------ | --------- |
| `useGames` | Game history CRUD, localStorage |
| `useLibrary` | Personal game shelf CRUD |
| `useLanguage` | Active locale + `t()` function |
| `useGoogleAuth` | Google sign-in / sign-out |
| `useGoogleDrive` | Backup export/import to Drive |
| `useFriends` | Firebase friends + notifications |

## State Management

- No Redux/Zustand — use `useState` + `useContext` only.
- Cross-component state: lift to parent or create a dedicated hook.
- Persistence: `localStorage` (user prefs) or Firebase Firestore (social features).

## Navigation

- No React Router — navigation is driven by `activeView` state in `App.jsx`.
- Pass `setActiveView` down as a prop when needed.
