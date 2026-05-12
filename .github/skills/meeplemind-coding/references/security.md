# Security Reference

## Core Rule

Treat **all** input as untrusted: form data, imported JSON, localStorage values, Google Drive payloads, BGG/Ludopedia API responses.

## Sanitize Helpers (`src/utils/sanitize.js`)

Always use these helpers before storing or rendering untrusted data.

| Helper | Use for |
| -------- | --------- |
| `sanitizeText(str)` | Names, notes, free-text fields |
| `sanitizeNumber(val, min, max)` | Player counts, scores, ratings |
| `sanitizeUrl(url)` | Cover URLs, external links — only `https://` and `http://` allowed |
| `sanitizeGameEntry(entry)` | Full game object before writing to localStorage |
| `validateBackupPayload(data)` | Imported JSON backup before merge |

## Input Validation Pattern

```jsx
// Form submit handler
function handleSave() {
  const safeName  = sanitizeText(rawName);
  const safeScore = sanitizeNumber(rawScore, 0, 9999);
  const safeUrl   = sanitizeUrl(rawCoverUrl);
  // then store / pass to hook
}
```

## File Import / Backup

```js
// Before merging imported backup
const validated = validateBackupPayload(parsedJSON);
if (!validated) { showError(); return; }
```

- Validate MIME type and file size on the client before parsing.
- Fail closed: if structure is invalid, reject entirely.

## Forbidden Patterns

```js
// ❌ NEVER
element.innerHTML = userContent;
dangerouslySetInnerHTML={{ __html: userContent }}
eval(code)
new Function(code)

// ✅ ALWAYS
<span>{sanitizeText(userContent)}</span>
```

## BGG / External API Data

- BGG responses come through the `/bggapi` proxy — never fetch `boardgamegeek.com` directly from the browser.
- Always sanitize game names and image URLs from API responses before storing in localStorage.
- Image URLs from BGG: pass through `sanitizeUrl()` before rendering in `<img src>`.

## localStorage

- Keys follow the `meeplemind-*` prefix convention.
- Never store sensitive user credentials or tokens in localStorage.
- `BGG_ACCESS_TOKEN` lives only in `.env.local` (never committed, never in localStorage).

## CSP

- `index.html` enforces a `Content-Security-Policy` meta tag.
- All BGG calls go through `/bggapi/*` (same-origin) — never add `boardgamegeek.com` back to `connect-src`.
- When adding a new external domain (CDN, font, API), update the CSP accordingly.
