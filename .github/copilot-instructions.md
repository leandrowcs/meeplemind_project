# MeepleMind - Copilot Instructions

Use this file as the default coding guide for all new code in this repository.

## 1. Project baseline

- Stack: React + Vite (frontend only, no backend server in this repo).
- Data persistence: localStorage + optional Google Drive sync.
- Main domains:
  - Game history and stats
  - Library and BGG catalog
  - Profile and settings
  - Internationalization (pt-BR, en-US, fr-CA)

## 2. Folder and file structure

Keep the current structure and conventions.

- `src/components/`: page-level and reusable UI components (`*.jsx` + `*.css`)
- `src/hooks/`: stateful business logic hooks (`useGames`, `useLibrary`, `useGoogleAuth`, `useGoogleDrive`, `useLanguage`)
- `src/utils/`: sanitization and utility helpers (`sanitize.js`, date formatting, etc.)
- `src/i18n/translations.js`: single source of translation keys and values
- `src/data/`: app data constants and changelog sources
- `public/`: static assets (icons, logos, manifest/sw)
- `docs/`: user/dev docs
- `.github/copilot-instructions.md`: this guidance file

When adding files:

- Prefer colocated CSS in `src/components/` for component-specific styles.
- Put shared logic in hooks/utils, not inside page components.
- Avoid creating duplicate helpers if an equivalent already exists.

## 3. Coding best practices

- Use functional React components and hooks only.
- Keep components focused on rendering and interaction; move logic to hooks/utils.
- Keep functions small and explicit; avoid hidden side effects.
- Reuse existing app patterns for navigation and state updates.
- Do not add new dependencies unless truly necessary.
- Keep naming consistent with current codebase (camelCase vars/functions, PascalCase components).

## 4. i18n rules (mandatory)

- Do not hardcode user-facing strings in components.
- Always use `useLanguage()` and `t('key.path')` for UI text.
- Add new translation keys to all supported locales in `src/i18n/translations.js`:
  - `pt-BR`
  - `en-US`
  - `fr-CA`
- Keep key naming grouped by feature, for example:
  - `settings.*`
  - `library.*`
  - `profile.*`
  - `common.*`
- If a component currently has local copy objects, migrate to centralized i18n.

## 5. Secure coding rules (mandatory)

- Treat all input as untrusted (form data, imported JSON, cached data, Drive data, external API data).
- Always sanitize/validate before storing or rendering:
  - Text and notes: use helpers from `src/utils/sanitize.js`
  - Numeric values: clamp with `sanitizeNumber`
  - URLs: only allow safe protocols via URL sanitization helper
  - Backup payloads: validate structure before merge/import
- Never use `dangerouslySetInnerHTML`.
- Avoid dynamic code execution (`eval`, `new Function`, etc.).
- For file uploads/imports:
  - Validate MIME type and file size on client side.
  - Fail closed on invalid payloads.
- Preserve defense-in-depth even when React escapes by default.

## 6. Icon standardization (lucide.dev)

- Use only icons from `lucide-react` for new UI icons.
- Match existing visual rhythm:
  - Header/title icons: usually 16-18
  - Action buttons: usually 14-16
- Keep semantic consistency:
  - Settings/config actions: `Settings`
  - Sync/reload actions: `RefreshCw`
  - Language/global: `Globe` or `Languages`
  - Navigation/menu: `Menu`
- Avoid mixing icon libraries unless explicitly approved.

## 7. Styling and UI consistency

- Reuse existing color/token patterns from global styles.
- Prefer incremental CSS changes over broad rewrites.
- Keep accessibility in mind:
  - labels and aria attributes where needed
  - focus-visible states for interactive controls
  - color contrast for badges/alerts

## 8. Data and sync recommendations

- Keep versioned backup compatibility (v1/v2 import behavior).
- For offline fallback data:
  - Clearly label source status in UI (online vs offline cache)
  - Keep user-facing explanation short and explicit
- For BGG integration:
  - Treat BGG as external source
  - Keep legal/attribution text when relevant in UI

## 9. Versioning and release notes

- Follow app version policy used in project workflow:
  - Keep major.minor stable and increment patch (`2.4.X`) per chat-driven code update.
- Update changelog entries in `src/data/changelog.js` when behavior changes are visible to users.

## 10. Validation checklist before finishing

- `npm run build` must pass.
- New translation keys exist in all 3 locales.
- No new lint/type/runtime errors introduced in changed files.
- Security-sensitive paths reviewed (input, import, external data, storage).
- Changes stay aligned with existing architecture and UX patterns.
