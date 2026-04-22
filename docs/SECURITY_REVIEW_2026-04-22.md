# MeepleMind Security Review - 2026-04-22

## Scope

Validation performed on:

- Input sanitization and storage paths
- JSON import and backup merge behavior
- External data ingestion (BGG + Google APIs)
- Client-side file upload handling
- Dependency vulnerability report (`npm audit --omit=dev`)

## Key Findings

### 1) Input/data sanitization hardening applied

Implemented defenses:

- Added safe URL sanitization (`http`/`https` only) in `src/utils/sanitize.js`
- Tightened backup structural validation limits in `src/utils/sanitize.js`
- Sanitized cover URL and Drive-merged library entries in `src/hooks/useLibrary.js`
- Sanitized loaded/imported/updated game payloads in `src/hooks/useGames.js`
- Added avatar upload constraints (type allowlist + 2 MB cap) in `src/components/Profile.jsx`

### 2) Dependency vulnerability mitigated

Command:

```bash
npm audit --omit=dev
```

Result:

- `xlsx` removed from runtime dependencies.
- Export path replaced with native CSV generation in app code.
- Current status: `npm audit --omit=dev` reports 0 production vulnerabilities.

Mitigation completed:

- Export now generates 2 CSV files (history + library) without third-party spreadsheet libraries.
- Attack surface reduced by removing vulnerable transitive code paths.

### 3) Residual architectural risk (client-only auth token storage)

Current behavior:

- Google access token is persisted in localStorage to survive refresh.

Risk:

- Any XSS in runtime context can potentially read localStorage and exfiltrate token.

Recommended roadmap:

- Prefer in-memory token + short session model where possible.
- Add stronger CSP and avoid introducing any unsafe HTML rendering patterns.
- Keep all user-provided content sanitized before persistence/display.

## Security Posture Summary

Current posture improved for user input and imported payloads.

Main residual risks:

- localStorage token persistence model (trade-off between UX and security)

## Next Steps (priority)

1. Add CSP policy and document secure deployment headers.
2. Consider reducing token lifetime/persistence strategy for Google auth.
3. Keep periodic security regression checks in release workflow.
