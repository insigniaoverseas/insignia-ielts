// Shared by every tests/db and tests/unit file: a PGlite database (real
// Postgres in WASM) that imitates the Supabase pieces our migrations rely on,
// with every migration in supabase/migrations/ applied in order.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Absolute path of supabase/migrations/. */
export const MIG = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

/**
 * A fresh database with all migrations applied.
 * @param {{ log?: boolean, dropPolicy?: string }} [options]
 *   dropPolicy — "table:policy name" to drop after migrating (the policy sweep).
 */
export async function migratedDatabase({ log = false, dropPolicy } = {}) {
  const db = new PGlite({ extensions: { btree_gist } });

  // ── Supabase shim ──────────────────────────────────────────────────────────
  await db.exec(`
    create role anon nologin noinherit;
    create role authenticated nologin noinherit;
    create role service_role nologin noinherit bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    -- Supabase's default grants in public (copied from the live project's pg_default_acl)
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
    -- stub of Supabase's auto-RLS function, so the first migration has something to revoke on
    create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin end $$;
  `);

  for (const f of readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`${MIG}/${f}`, "utf8"));
    if (log) console.log("applied", f);
  }

  if (dropPolicy) {
    const [table, ...rest] = dropPolicy.split(":");
    await db.exec(`drop policy "${rest.join(":").replaceAll('"', '""')}" on public.${table}`);
    if (log) console.log(`dropped policy "${rest.join(":")}" on ${table} — this run should fail`);
  }

  return db;
}
