---
name: meeplemind-coding
description: "MeepleMind coding patterns, architecture, design system, and security rules. Use when adding or editing components, hooks, utils, CSS, or using design tokens/CSS variables in MeepleMind."
---

# MeepleMind — Coding Patterns

## When to Use

Load this skill when:
- Creating or editing a React component or hook
- Adding new CSS styles or design tokens
- Using the sanitize utilities
- Choosing icons or color variables
- Unsure where to put a file

## Procedure

1. Read [architecture reference](./references/architecture.md) to confirm file placement.
2. Read [design system reference](./references/design-system.md) for CSS variables and component tokens.
3. Read [security reference](./references/security.md) for sanitize helpers and input rules.
4. Apply patterns, then run `npm run build` to confirm no errors.

## Quick Rules

- **Components**: functional + hooks only, one `*.jsx` + one `*.css` per component in `src/components/`.
- **Hooks**: all stateful business logic → `src/hooks/use*.js`.
- **Utils**: pure functions with no React → `src/utils/`.
- **Icons**: `lucide-react` only. Header icons: 16-18px. Buttons: 14-16px.
- **Never**: `dangerouslySetInnerHTML`, `eval`, `new Function`, mixed icon libraries.
