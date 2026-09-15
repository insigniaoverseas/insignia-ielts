-- M0-19 · Reference data: the five roles and the default band scales
--
-- Band charts supplied by the institute on 2026-09-15 (Listening, Academic
-- Reading, General Training Reading — "approximate marks out of 40"). They are
-- defaults only: staff can edit them, and each assignment may pick another
-- scale (MVP-1 §6). Every chart covers raw 0–40 with no gaps.
--
-- "Below 4" (PROJECT-MEMORY §4, user decision 2026-09-15): the lowest row of a
-- scale has band NULL, meaning "below this scale's lowest band". A score then
-- stores below_band (e.g. 4.0, shown as "Below 4") instead of band, so it is
-- never averaged in as a zero.
--
-- The seed inserts are idempotent: running them again changes nothing.

-- ─── "Below the scale" ──────────────────────────────────────────────────────

alter table public.band_scale_rows alter column band drop not null;
comment on column public.band_scale_rows.band is 'Half-band steps 0–9. NULL = below this scale''s lowest band (shown as "Below 4"). At most one such row per scale.';
create unique index band_scale_rows_one_below_row on public.band_scale_rows (scale_id) where band is null;

alter table public.attempt_scores alter column band drop not null;
alter table public.attempt_scores
  add column below_band numeric(2,1) check (below_band between 0 and 9 and below_band * 2 = trunc(below_band * 2)),
  add constraint attempt_scores_band_or_below check (num_nonnulls(band, below_band) = 1);
comment on column public.attempt_scores.band is 'The band, or NULL when the score is below the scale — then below_band is set.';
comment on column public.attempt_scores.below_band is 'Set instead of band when the raw score is below the scale: the lowest band of that scale (4.0 → "Below 4"). Excluded from band averages.';

-- ─── Roles ───────────────────────────────────────────────────────────────────
-- Permissions are defined with lib/rbac.ts (BUILD-STEPS step 22).

insert into public.roles (key, name) values
  ('super_admin', 'Super admin'),
  ('admin',       'Admin'),
  ('teacher',     'Teacher'),
  ('invigilator', 'Invigilator'),
  ('student',     'Student')
on conflict (key) do nothing;

-- ─── Default band scales ────────────────────────────────────────────────────

with scale as (
  insert into public.band_scales (skill, variant, name, is_default)
  select 'listening', 'n_a', 'Listening — institute chart', true
  where not exists (select 1 from public.band_scales where skill = 'listening' and variant = 'n_a' and is_default)
  returning id
)
insert into public.band_scale_rows (scale_id, raw_min, raw_max, band)
select scale.id, v.raw_min, v.raw_max, v.band
from scale, (values
  (39, 40, 9.0), (37, 38, 8.5), (35, 36, 8.0), (32, 34, 7.5), (30, 31, 7.0), (26, 29, 6.5),
  (23, 25, 6.0), (18, 22, 5.5), (16, 17, 5.0), (13, 15, 4.5), (10, 12, 4.0), (0, 9, null)
) as v (raw_min, raw_max, band);

with scale as (
  insert into public.band_scales (skill, variant, name, is_default)
  select 'reading', 'academic', 'Academic Reading — institute chart', true
  where not exists (select 1 from public.band_scales where skill = 'reading' and variant = 'academic' and is_default)
  returning id
)
insert into public.band_scale_rows (scale_id, raw_min, raw_max, band)
select scale.id, v.raw_min, v.raw_max, v.band
from scale, (values
  (39, 40, 9.0), (37, 38, 8.5), (35, 36, 8.0), (33, 34, 7.5), (30, 32, 7.0), (27, 29, 6.5),
  (23, 26, 6.0), (19, 22, 5.5), (15, 18, 5.0), (13, 14, 4.5), (10, 12, 4.0), (0, 9, null)
) as v (raw_min, raw_max, band);

with scale as (
  insert into public.band_scales (skill, variant, name, is_default)
  select 'reading', 'general', 'General Training Reading — institute chart', true
  where not exists (select 1 from public.band_scales where skill = 'reading' and variant = 'general' and is_default)
  returning id
)
insert into public.band_scale_rows (scale_id, raw_min, raw_max, band)
select scale.id, v.raw_min, v.raw_max, v.band
from scale, (values
  (40, 40, 9.0), (39, 39, 8.5), (37, 38, 8.0), (36, 36, 7.5), (34, 35, 7.0), (32, 33, 6.5),
  (30, 31, 6.0), (27, 29, 5.5), (23, 26, 5.0), (19, 22, 4.5), (15, 18, 4.0), (0, 14, null)
) as v (raw_min, raw_max, band);
