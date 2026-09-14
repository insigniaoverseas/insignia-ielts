# `components/ui` — the design system

**One responsibility:** visual building blocks that match `Design files/Prioritizing project scope/00 Design System.dc.html`. No data fetching, no business rules, no scoring.

See every component live, in every state, at **`/dev/components`**.

## Two kinds of file live here

| Kind | Files | Source |
|---|---|---|
| **Design-system specific** — no shadcn equivalent | `status-pill`, `difficulty-badge`, `banner`, `empty-state`, `stat-card`, `band-score`, `accuracy-bars`, `band-trend-chart`, `student-tab-bar`, `staff-sidebar`, `pin-input` | Hand-built from the design file (M0-02) |
| **Generic primitives** | `button`, `input`, `card`, `checkbox`, `table`, `dialog`, `sonner`, `skeleton`, `badge`… | shadcn/ui, restyled to the tokens (M0-03) |

Custom files are named so they **can't collide with shadcn's**: it ships `sidebar`, `chart` and `alert`, so ours are `staff-sidebar`, `band-trend-chart` and `banner`. Keep it that way.

## Rules

- **Tokens only.** Use `bg-brand`, `text-ink-2`, `border-line`, `rounded-card`, `text-body`, `h-primary`. The default Tailwind palette and type scale are switched off in `src/app/globals.css`, so `bg-blue-500` or `text-sm` silently generate nothing.
- **Merge classes with `cn()`** from `@/lib/utils`, never string concatenation. Plain `twMerge` drops `text-body` when combined with `text-ink`; ours is configured not to.
- **Colour never carries meaning alone.** Pair it with a glyph (✓ ✕ ! ○) and a word.
- **Student text is never below `text-body` (16px).** `text-small` is for admin/teacher screens and captions.
- **Student tap targets ≥ 48px** (`min-h-touch`); primary actions are 56px (`h-primary`).
- **Cards get a 1px border, never a shadow.** `shadow-soft` is for modals, dropdowns and sticky bars only.
- **TSDoc on every export.** Say what it's for and any rule it enforces.
