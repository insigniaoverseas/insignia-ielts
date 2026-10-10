# Staff sidebar views

The admin and teacher sidebar pages as client components. They hold no queries.

The admin and teacher layouts load every sidebar page's data in one round trip
(`getAdminBundle` / `getTeacherBundle` in `src/lib/queries/staff-bundles.ts`)
and hand it to `AdminDataProvider` / `TeacherDataProvider`. Each view takes its
part with `pageData(useAdminData().students, home)`:

- **present** → the data;
- **forbidden** → the person lacks that page's permission; the server never sent
  the data, and they are sent `home`, as the page's own guard used to do;
- **error** → that page alone shows the error screen.

Search and filters (Students, Audit, Library) run over the loaded rows
(`src/lib/staff-filters.ts`), so changing one needs no round trip. The bundle is
rebuilt after a save (`revalidatePath`) and by `AutoRefresh` every 60 s while
someone is using the page.

Detail pages (one student, one batch, one assignment's results, analytics, the
live monitor) are still server-rendered, with their guard and data read side by
side (`withGuard` in `src/lib/auth/guard.ts`).

Each `page.tsx` only sets the title, reads URL parameters and renders its view.
