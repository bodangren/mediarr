# Spec: shadcn/ui Installation & Primitive Migration

## Context

The project has ~50 hand-rolled primitive components in `app/src/components/primitives/`. These
are inconsistently styled (some use `cn()`, some use string interpolation), have varying API
signatures, and must be independently maintained. The goal of this track is to replace them with
shadcn/ui components — Radix UI headless primitives styled with Tailwind and owned by the project
(copied into `app/src/components/ui/`). Existing pages and features continue to work; only the
underlying implementation changes.

## Design Token Bridge

shadcn/ui expects a specific set of CSS variable names (`--background`, `--foreground`,
`--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`, `--ring`,
`--destructive`, `--destructive-foreground`, etc.). Mediarr already has a richer token system
(`--surface-*`, `--accent-*`, `--text-*`, `--status-*`, `--border-subtle`).

**Strategy:** Define shadcn's required variables as aliases in `index.css`, mapping them to the
existing tokens. The existing tokens remain the source of truth and are not renamed. The bridge
MUST be placed inside the `:root` block alongside the existing tokens.

**Mediarr Visual Identity for shadcn:**
- **Base surface**: Deep navy-black ramp (`#0b111b` → `#24354f`) — not shadcn's default zinc/slate
- **Accent**: Cyan `#4bc1ff` — arr-style active/highlight color
- **Border radius**: `4px` (tight, dense monitoring UI — not rounded-pill SaaS defaults)
- **Font**: `system-ui` / `Inter`
- **Theme**: Dark only; no light theme wiring until explicitly requested

```css
/* shadcn/ui variable bridge — do not remove, shadcn components depend on these.
   Mediarr design tokens remain the source of truth; these are aliases only.      */
--background: var(--surface-0);
--foreground: var(--text-primary);
--card: var(--surface-1);
--card-foreground: var(--text-primary);
--popover: var(--surface-2);
--popover-foreground: var(--text-primary);
--primary: var(--accent-primary);
--primary-foreground: var(--text-inverse);
--secondary: var(--surface-2);
--secondary-foreground: var(--text-primary);
--muted: var(--surface-2);
--muted-foreground: var(--text-muted);
--accent: var(--surface-3);
--accent-foreground: var(--text-primary);
--destructive: var(--accent-danger);
--destructive-foreground: var(--text-inverse);
--border: var(--border-subtle);
--input: var(--surface-1);
--ring: var(--accent-primary);
--radius: var(--radius-sm);
```

## Component Migration Map

| Old primitive | New shadcn/ui component | Notes |
|---|---|---|
| `Button.tsx` | `ui/button.tsx` | variant=primary→default, secondary→secondary, danger→destructive |
| `Modal.tsx` + `ModalHeader/Body/Footer/ConfirmModal` | `ui/dialog.tsx` | Radix Dialog; export `ConfirmDialog` wrapper |
| `TextInput`, `PasswordInput` in `Form.tsx` | `ui/input.tsx` | Plain input; label/error via `ui/form.tsx` |
| `SelectInput` in `Form.tsx` | `ui/select.tsx` | Radix Select |
| `CheckInput` in `Form.tsx` | `ui/checkbox.tsx` | Radix Checkbox with styled label |
| `Switch.tsx` | `ui/switch.tsx` | Radix Switch |
| `Form.tsx` (FormGroup wrapper) | `ui/form.tsx` | react-hook-form FormField/FormItem/FormLabel/FormMessage |
| `Table.tsx`, `TableHeader.tsx`, `TableBody.tsx` | `ui/table.tsx` | shadcn Table primitives |
| `StatusBadge.tsx` | `ui/badge.tsx` | variant map: monitored→default, error→destructive, etc. |
| `ProgressBar.tsx` | `ui/progress.tsx` | Radix Progress |
| `Menu.tsx`, `SortMenu.tsx`, `ViewMenu.tsx`, `FilterMenu.tsx` | `ui/dropdown-menu.tsx` | Radix DropdownMenu |
| `Alert.tsx` | `ui/alert.tsx` | shadcn Alert with variant |
| `Label.tsx` | `ui/label.tsx` | Radix Label |
| `SkeletonBlock.tsx` | `ui/skeleton.tsx` | shadcn Skeleton |
| `Separator` | `ui/separator.tsx` | Radix Separator |
| `PageToolbarButton.tsx` | Migrate to `ui/button.tsx` variant | ghost/icon variant |
| `EmptyPanel.tsx`, `ErrorPanel.tsx`, `QueryPanel.tsx` | Keep as project wrappers; use shadcn internals | Thin wrappers over shadcn Alert |

`VirtualTable.tsx`, `DataTable.tsx`, `FilterBuilder.tsx`, `SelectProvider.tsx`,
`FileBrowser.tsx`, `FilesystemBrowser.tsx`, `PageJumpBar.tsx` — **not migrated in this track**.
These are complex project-specific components. They will be refactored to use shadcn primitives
internally in a follow-on track.

## Acceptance Criteria

- `app/src/components/ui/` contains the shadcn/ui component set.
- CSS variable bridge is defined in `index.css`; visual appearance is unchanged.
- All components in the migration map above are replaced; old files are deleted.
- No callsite in `app/src/` imports from the old primitive paths for migrated components.
- `cd app && npm run build` succeeds with zero TS errors.
- All existing tests pass (pre-existing 4 server failures only).
- A smoke test for each new shadcn wrapper (`Button`, `Dialog`, `Input`, `Select`,
  `Checkbox`, `Switch`) verifies render and basic interaction.
