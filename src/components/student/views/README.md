# Student tab views

The four student tabs — Home, My Tests, Progress, Profile — as client components.

They hold no queries. The student layout loads everything they show in one
round trip (`getStudentBundle` in `src/lib/queries/student.ts`) and hands it to
`StudentDataProvider`; each view reads its part with `useStudentData()`.

Moving between tabs therefore never touches the database. The bundle is rebuilt
when the layout renders again: after a save (`revalidatePath`), and every 60 s
while the student is active (`AutoRefresh`).

`result-view.tsx` (screen 09) reads the same bundle, so opening a result is
instant too. If an attempt's marking failed at submit it calls
`markMyResultAction`, then refreshes. The mistakes review (`/review/…`) stays
server-rendered — it reads the answer key from R2 — but its link prefetches,
so it loads in the background while the student reads their band.

Each `page.tsx` under `src/app/(student)/` only sets the title and renders its view.
