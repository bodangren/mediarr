# Track 7C Design Tokens (Modern Dark)

## Color Ramps

### Surface Layers
- `--surface-0`: `#0b111b`
- `--surface-1`: `#131d2b`
- `--surface-2`: `#1a2739`
- `--surface-3`: `#24354f`

### Text
- `--text-primary`: `#e6edf9`
- `--text-secondary`: `#b7c6de`
- `--text-muted`: `#8ea3c2`
- `--text-inverse`: `#0d1522`

### Accent
- `--accent-primary`: `#4bc1ff`
- `--accent-success`: `#41d37d`
- `--accent-warning`: `#ffbf57`
- `--accent-danger`: `#ff6f6f`
- `--accent-info`: `#74a8ff`

### Semantic States
- `--status-monitored`: `#69d4ff`
- `--status-wanted`: `#ffbf57`
- `--status-downloading`: `#74a8ff`
- `--status-seeding`: `#41d37d`
- `--status-completed`: `#3ed29d`
- `--status-error`: `#ff6f6f`

## Spacing Scale (4px Grid)
- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-6`: `24px`
- `--space-8`: `32px`
- `--space-12`: `48px`
- `--space-16`: `64px`

## Typography
- Families: Geist Sans (`--font-geist-sans`), Geist Mono (`--font-geist-mono`)
- Scale:
  - `--font-size-12`: `12px`
  - `--font-size-14`: `14px`
  - `--font-size-16`: `16px`
  - `--font-size-20`: `20px`
  - `--font-size-24`: `24px`
  - `--font-size-32`: `32px`

## Radius
- `--radius-none`: `0`
- `--radius-sm`: `4px`
- `--radius-md`: `8px`
- `--radius-lg`: `12px`
- `--radius-full`: `9999px`

## Elevation
- `--shadow-1`: card elevation
- `--shadow-2`: dialog elevation
- `--shadow-3`: popover/overlay elevation

## Tailwind v4 Consumption
Tokens are exposed via `@theme inline` in `app/src/app/globals.css` and consumed as utility tokens:
- Colors: `bg-surface-1`, `text-text-primary`, `border-border-subtle`, etc.
- Shadows: `shadow-elevation-1/2/3`
- Radius: `rounded-sm/md/lg/full`
