---
name: meeplemind-i18n
description: "MeepleMind internationalization workflow. Use when adding translation keys, editing UI strings, migrating local copy objects to centralized i18n, or checking locale coverage in MeepleMind."
---

# MeepleMind — i18n Workflow

## When to Use

Load this skill when:
- Adding any new user-facing string to a component
- Migrating a component's local `copy` object to centralized translations
- Checking that all 3 locales have a key
- Naming a new translation key

## Procedure

### Adding a new string

1. **Never hardcode strings** in JSX. Every user-visible string must come from `t()`.
2. Open `src/i18n/translations.js`.
3. Find the feature section (e.g., `library.*`, `profile.*`).
4. Add the key to **all 3 locales** in the same edit:
   - `pt-BR` (default, write first)
   - `en-US`
   - `fr-CA`
5. Use the key in the component via `useLanguage()`:

```jsx
import { useLanguage } from '../hooks/useLanguage';

function MyComponent() {
  const { t } = useLanguage();
  return <h2>{t('feature.myKey')}</h2>;
}
```

### Migrating a local `copy` object

1. Find all string values in the local object.
2. Create keys under the appropriate feature namespace.
3. Add to all 3 locales in `translations.js`.
4. Replace `copy.xxx` usages with `t('feature.xxx')`.
5. Remove the local `copy` object.

## Key Naming Conventions

Keys are grouped by feature with dot notation.

| Feature | Prefix | Example |
|---------|--------|---------|
| Game library | `library.` | `library.tabShelf` |
| Game history | `history.` | `history.filterAll` |
| New game form | `newGame.` | `newGame.title` |
| Profile | `profile.` | `profile.level` |
| Settings | `settings.` | `settings.theme` |
| Friends | `friends.` | `friends.addFriend` |
| Stats | `stats.` | `stats.totalGames` |
| Common / shared | `common.` | `common.cancel` |
| App-level | `app.` | `app.title` |

Sub-keys use camelCase: `library.viewToggleLabel`, `profile.currentLevelXp`.

## File Structure (`src/i18n/translations.js`)

```js
export const translations = {
  'pt-BR': {
    'feature.key': 'Texto em português',
    // ...
  },
  'en-US': {
    'feature.key': 'English text',
    // ...
  },
  'fr-CA': {
    'feature.key': 'Texte en français',
    // ...
  },
};
```

All locales are in a single flat object (no nesting inside each locale).

## Locale Coverage Check

To verify a key exists in all 3 locales, search for the key string in `translations.js`. It should appear exactly 3 times (once per locale block).

## Common Pitfalls

- Do not add keys to only one or two locales — the app will show the raw key string if missing.
- French (`fr-CA`) often needs different word order — translate properly, don't just copy `en-US`.
- Portuguese keys go first (they are the source of truth for meaning).
- When a key holds a sentence with dynamic values, use a pattern like `'Mostrando {count} jogos'` and interpolate in the component.
