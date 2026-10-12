-- M10-17: a whole paper can be a practice test.
--
-- Until now a practice test had to drill exactly one question type
-- (`practice_question_type` NOT NULL iff kind = 'practice'). The user chose on
-- 2026-10-12 to let staff turn any mock or class paper into practice from the
-- Test library, so a practice test may now have no question type: it is a
-- full paper. A mock or class test still may not carry one.
--
-- No new table, so no new RLS policy: `tests` keeps its existing policies, and
-- staff change `kind` and `difficulty` through a server action, never the API.

alter table public.tests
  drop constraint tests_practice_type_iff_practice;

alter table public.tests
  add constraint tests_practice_type_only_practice
  check (kind = 'practice' or practice_question_type is null);

comment on column public.tests.practice_question_type is
  'Practice only, optional: the one question type a practice set drills (a key from lib/question-types.ts). NULL on a full-paper practice test and on every mock or class test.';
