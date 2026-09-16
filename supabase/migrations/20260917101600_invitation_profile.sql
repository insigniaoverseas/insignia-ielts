-- M1-02 · The invitation carries the person's details, not just their email.
--
-- MVP-1 §6 defines `invitations` with email, role, branch, batch and plan, and
-- §9 describes the admin as entering "an email". The built invite screen
-- (M5-04, screen 22) asks for a **full name and phone** as well — and it is
-- right to: the admin already knows them, they are how staff recognise the
-- student in every later list, and `public.users.name` is NOT NULL, so someone
-- has to supply it before the account can exist.
--
-- The alternative was to ask the student for their own name while they accept.
-- Rejected: it is a second thing to type on the one screen that must be
-- effortless, and it lets a typo into the name staff search by.
--
-- MVP-1 §6 and §9 are corrected to match; recorded in PROJECT-MEMORY §4.

-- Safe to add NOT NULL with no backfill: `invited_by` is a NOT NULL foreign key
-- to `public.users`, which has no rows yet, so this table provably has none
-- either. If that ever stops being true this migration will refuse loudly
-- rather than invent a name for somebody.
alter table public.invitations
  add column name         text not null check (length(trim(name)) > 0),
  add column phone        text,
  add column country_code text;

comment on column public.invitations.name is 'The invited person''s full name, as the inviting admin typed it. Becomes users.name on acceptance.';
comment on column public.invitations.phone is 'Optional. Contact only — sign-in is email and password (D9, corrected 2026-09-16).';

-- Column-limited grant, matching M0-06: the API may read an invitation's
-- details but never its token_hash.
grant select (name, phone, country_code) on public.invitations to authenticated;
