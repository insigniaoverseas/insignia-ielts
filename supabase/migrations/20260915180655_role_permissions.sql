-- Step 22 (M1-13, brought forward) · Role permissions for lib/rbac.ts
--
-- Decided with the user 2026-09-15 (PROJECT-MEMORY §4):
--   * Two top roles: the key `super_admin` is shown as **Owner**; `admin` stays
--     Admin. Only the Owner can add or remove admins and change roles.
--   * Teachers draft tests; only Admins and the Owner publish.
--
-- roles.permissions maps a permission to the scope it applies in:
--   own    — the user's own things (their attempts, their drafts)
--   batch  — batches the user teaches
--   branch — the user's branch
--   all    — everything
-- A missing key means "not allowed". lib/permissions.ts lists the valid keys.
-- Scope is the second gate's job to check; RLS is the first (MVP-1 §13).

update public.roles set name = 'Owner' where key = 'super_admin';

alter table public.roles
  add constraint roles_permissions_well_formed check (
    not jsonb_path_exists(permissions, '$.keyvalue() ? (!(@.key like_regex "^[a-z_]+:[a-z_]+$"))')
    and not jsonb_path_exists(permissions, '$.* ? (@ != "own" && @ != "batch" && @ != "branch" && @ != "all")')
  );
comment on column public.roles.permissions is 'permission → scope (own | batch | branch | all). Missing = not allowed. Keys are listed in lib/permissions.ts.';

update public.roles set permissions = '{
  "attempt:take": "own"
}'::jsonb where key = 'student';

update public.roles set permissions = '{
  "session:invigilate": "branch"
}'::jsonb where key = 'invigilator';

update public.roles set permissions = '{
  "session:invigilate": "batch",
  "assignment:manage":  "batch",
  "results:release":    "batch",
  "mark:override":      "batch",
  "test:author":        "own"
}'::jsonb where key = 'teacher';

update public.roles set permissions = '{
  "session:invigilate": "branch",
  "assignment:manage":  "branch",
  "results:release":    "branch",
  "mark:override":      "branch",
  "test:author":        "all",
  "test:publish":       "all",
  "band_scale:edit":    "all",
  "student:manage":     "branch",
  "staff:manage":       "branch",
  "audit:read":         "branch"
}'::jsonb where key = 'admin';

update public.roles set permissions = '{
  "session:invigilate": "all",
  "assignment:manage":  "all",
  "results:release":    "all",
  "mark:override":      "all",
  "test:author":        "all",
  "test:publish":       "all",
  "band_scale:edit":    "all",
  "student:manage":     "all",
  "staff:manage":       "all",
  "admin:manage":       "all",
  "role:change":        "all",
  "audit:read":         "all"
}'::jsonb where key = 'super_admin';
