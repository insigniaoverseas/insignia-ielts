// Policy sweep (M0-11 "done when … fails if you drop one policy"): for every
// RLS policy the migrations create, rerun rls.test.mjs with that one policy
// dropped and require the run to FAIL. A policy whose removal nothing notices
// is a policy the tests don't cover.
//
//   npm run test:db:sweep
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIG = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
const TEST = fileURLToPath(new URL("./rls.test.mjs", import.meta.url));

// List the policies by applying the migrations to a scratch database.
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin end $$;
`);
for (const f of readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(`${MIG}/${f}`, "utf8"));
}
const policies = (await db.query(
  `select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`,
)).rows;
await db.close();

let uncaught = 0;
for (const { tablename, policyname } of policies) {
  const run = spawnSync(process.execPath, [TEST], {
    env: { ...process.env, RLS_DROP_POLICY: `${tablename}:${policyname}` },
    encoding: "utf8",
  });
  const failed = (run.stdout.match(/^\s+✗ /gm) ?? []).length;
  if (run.status === 0) {
    uncaught++;
    console.log(`  ✗ ${tablename} — "${policyname}": dropping it broke NO test`);
  } else {
    console.log(`  ✓ ${tablename} — "${policyname}": ${failed} check(s) failed, as they should`);
  }
}

console.log(`\n${policies.length} policies swept, ${uncaught} not covered by any test`);
process.exit(uncaught ? 1 : 0);
