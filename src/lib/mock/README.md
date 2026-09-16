# `lib/mock` — fixtures standing in for the queries

**One responsibility:** return data shaped like `@/lib/view-models`, so screens
can be built and reviewed before the queries exist. **Temporary by design.**

Every file here is `import "server-only"`. That is not decoration: it makes the
compiler reject any attempt to pull this module — or the real query module that
replaces it — into a client component. All data access in this product is
server-side (`PROJECT-MEMORY.md` §4, "No browser Supabase client").

## How screens use it

```tsx
// app/(student)/home/page.tsx
import { getStudentHome } from "@/lib/mock/student";

export default async function HomePage() {
  const data = await getStudentHome();
  return <Home data={data} />;
}
```

Each `get*` is `async` even though nothing here awaits, so the call site already
looks like the real thing.

## Replacing it

1. Write `lib/queries/student.ts` exporting the same function names and the same
   return types.
2. Change the import in each `page.tsx` — one line per screen.
3. Delete the fixture file.

Screens do not change. If one has to, the view-model was wrong; fix that first.

## Previewing screen variants

Every list and card has states that fixtures alone can't show at once — nothing
assigned, plan expired, results held. The `get*` functions take a `Scenario`, and
student pages read it from a `?state=` search param:

| URL | Shows |
|---|---|
| `/home` | The normal screen |
| `/home?state=empty` | Nothing assigned — the "Practice at home" card instead |
| `/home?state=expired` | Plan ended: Start disabled, with the reason |
| `/home?state=first_time` | A brand-new student, no results yet |
| `/tests?state=empty` | Empty "To do" and "Done" lists |
| `/tests?state=held` | A submitted attempt whose result the teacher hasn't released |

**`?state=` goes away with this module.** It is a review affordance, not a
feature — it must never survive into a screen wired to real data.
