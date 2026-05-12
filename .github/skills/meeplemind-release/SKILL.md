---
name: meeplemind-release
description: "MeepleMind release workflow: version bumping, changelog entries, and build validation. Use when finishing a feature, fixing a bug, or preparing a release in MeepleMind."
---

# MeepleMind — Release Workflow

## When to Use

Load this skill when:
- Finishing any user-visible change
- Bumping the app version
- Writing a changelog entry
- Validating the build before committing

## Procedure

### 1. Bump the version in `package.json`

Policy: increment the **patch** number (`4.1.X`). Only change minor/major when explicitly requested.

```json
// Before
"version": "4.1.0"
// After
"version": "4.1.1"
```

### 2. Add a changelog entry in `src/data/changelog.js`

Format: `'vX.Y.Z: <user-friendly description of what changed and why it matters.'`

- Insert as the **first item** in each locale's `items` array.
- Write in **all 3 locales** (`pt-BR`, `en-US`, `fr-CA`).
- `pt-BR` is the source — write it first, then translate.
- Be concrete: what changed + how it benefits the user.
- Avoid technical jargon (no "refactored", "fixed null pointer", etc.).

```js
// pt-BR — insert at top of items array
'v4.1.1: Visualização em grade adicionada na Biblioteca. Alterne entre lista e grade usando os botões no topo da estante.',

// en-US
'v4.1.1: Grid view added to the Library. Switch between list and grid using the toggle at the top of your shelf.',

// fr-CA
'v4.1.1: Vue grille ajoutée dans la Bibliothèque. Basculez entre liste et grille avec les boutons en haut de votre étagère.',
```

### 3. Run the build

```bash
npm run build
```

Expected output: `✓ built in X.XXs` (exit 0). Fix any errors before considering the release done.

### 4. Validation Checklist

Before marking a task complete:

- [ ] `npm run build` exits 0
- [ ] New user-visible strings have translation keys in all 3 locales (`pt-BR`, `en-US`, `fr-CA`)
- [ ] Untrusted input is sanitized via helpers in `src/utils/sanitize.js`
- [ ] No new `dangerouslySetInnerHTML`, `eval`, or `new Function` introduced
- [ ] `package.json` version bumped (patch)
- [ ] `src/data/changelog.js` updated in all 3 locales
- [ ] No new npm dependencies added without necessity

## File Locations

| File | Purpose |
|------|---------|
| `package.json` (root) | `"version"` field |
| `src/data/changelog.js` | `CHANGELOG_BY_LANGUAGE` export with `pt-BR`, `en-US`, `fr-CA` keys |

## Changelog Structure

```js
export const CHANGELOG_BY_LANGUAGE = {
  'pt-BR': {
    title: 'Novidades',
    items: [
      'v4.1.1: ...',  // ← newest first
      'v4.1.0: ...',
      // ...
    ],
  },
  'en-US': {
    title: 'What\'s New',
    items: [
      'v4.1.1: ...',
      // ...
    ],
  },
  'fr-CA': {
    title: 'Nouveautés',
    items: [
      'v4.1.1: ...',
      // ...
    ],
  },
};
```
