# Design System Reference

## CSS Variables — Colors

Defined in `src/index.css`. Always use variables, never hardcode hex values.

```css
/* Backgrounds (80% of UI surface) */
--color-bg-primary:     #0B0F1A   /* main app background */
--color-bg-secondary:   #121826   /* cards, panels */
--color-bg-card:        #1A2233   /* elevated card background */

/* Primary (15% — blue identity) */
--color-primary:        #3B82F6   /* buttons, highlights, links */
--color-primary-light:  #60A5FA   /* hover states */
--color-primary-dark:   #1D4ED8   /* pressed states */

/* Accent (5% — orange CTA energy) */
--color-accent:         #F59E0B   /* CTA buttons, top actions */
--color-accent-strong:  #F97316   /* victory highlight */

/* Semantic */
--color-success:        #22C55E   /* win, cooperative, positive */
--color-error:          #EF4444   /* loss, error, destructive */

/* Text */
--color-text-primary:   #E5E7EB   /* headings, important content */
--color-text-secondary: #9CA3AF   /* descriptions, labels */
--color-text-muted:     #6B7280   /* disabled, placeholders */
```

**Golden rule**: 80% neutral BG + 15% blue + 5% orange.

## CSS Variables — Typography

Defined in `src/index.css`.

```css
/* Families */
--font-primary:    'Inter'    /* 95% of UI */
--font-secondary:  'Poppins'  /* stats/numbers only */

/* Sizes */
--font-size-h1:      24px
--font-size-h2:      20px
--font-size-h3:      16px
--font-size-body:    14px
--font-size-caption: 12px
--font-size-stat:    40px   /* large stat numbers */
--font-size-stat-sm: 32px

/* Weights */
/* 400 (normal), 500 (medium), 600 (semibold), 700 (bold) */
```

## Component Classes (src/components-v2.css)

These pre-built classes apply the design system automatically.

```
.btn            Base button
.btn-primary    Blue CTA
.btn-cta        Orange CTA (accent)
.btn-success    Green
.btn-error      Red/destructive
.btn-icon       Icon-only circle button

.card           Basic card
.card-victory   Orange-tinted victory card
.card-success   Green-tinted success card

.stat-card      Stat number + label
.insight-card   Icon + message (info/warning/error variants)

.input-field    Form input with focus glow
```

## Micro-interactions (src/microinteractions-v2.css)

- `.btn`, `.card`, `.stat-card` get hover zoom automatically.
- Skeleton loaders: import `SkeletonLoader` from `src/components/SkeletonLoader.jsx`.
- Toast feedback: use `useToast` hook from `src/hooks/useToast.js`.
- Animation timings: hover 0.2s, toast 0.3s, success pulse 0.6s.

## Icon Rules (lucide-react)

| Context | Size |
| --------- | ------ |
| Page title / section header | 16–18px |
| Inline action button | 14–16px |
| Empty state | 24px |
| Navigation | 20–22px |

Semantic icon mapping:

| Action | Icon |
| -------- | ------ |
| Settings / config | `Settings` |
| Sync / reload | `RefreshCw` |
| Language / global | `Globe`, `Languages` |
| Navigation menu | `Menu` |
| Delete / remove | `Trash2` |
| Add / create | `Plus` |
| Edit | `Pencil` |
| Search | `Search` |
| Close | `X` |
| Done / confirm | `Check` |

## CSS Authoring Rules

- Component-specific CSS goes in colocated `ComponentName.css` — not in `App.css`.
- Use existing variables; prefer incremental changes over broad rewrites.
- Add `focus-visible` styles for all interactive elements.
- Mobile-first: base styles for small screens, override up with `@media (min-width: ...)`.
