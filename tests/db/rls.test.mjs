// Database access-control test (M0-11): every migration, run on PGlite (real
// Postgres in WASM), then probed as each role. See tests/db/README.md.
//
//   npm run test:db
//   RLS_DROP_POLICY='band_scales:Read: staff' npm run test:db
//
// The second form drops one policy after migrating — the run must then FAIL.
import { readFileSync } from "node:fs";
import { MIG, migratedDatabase } from "./setup.mjs";

process.on("unhandledRejection", (e) => { console.error("FATAL:", e.message, e.detail ?? "", e.where ?? ""); process.exit(2); });

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, detail); }
};

// Every migration applied to a Supabase-shaped PGlite database (setup.mjs).
// RLS_DROP_POLICY drops one policy afterwards — then this run must fail.
const db = await migratedDatabase({ log: true, dropPolicy: process.env.RLS_DROP_POLICY });

// ── Fixtures (as postgres, bypassing nothing — postgres owns the tables) ─────
const id = {
  b1: "00000000-0000-0000-0000-0000000000b1", b2: "00000000-0000-0000-0000-0000000000b2",
  studentA: "00000000-0000-0000-0000-00000000000a", studentB: "00000000-0000-0000-0000-00000000000b",
  studentOther: "00000000-0000-0000-0000-00000000000c", suspended: "00000000-0000-0000-0000-00000000000d",
  admin1: "00000000-0000-0000-0000-0000000000a1", admin2: "00000000-0000-0000-0000-0000000000a2",
  teacher: "00000000-0000-0000-0000-0000000000e1", superAdmin: "00000000-0000-0000-0000-0000000000f1",
  teacher2: "00000000-0000-0000-0000-0000000000e2", suspTeacher: "00000000-0000-0000-0000-0000000000e3",
  studentLeft: "00000000-0000-0000-0000-00000000001e",
  batchX: "00000000-0000-0000-0000-000000000b0a", batchY: "00000000-0000-0000-0000-000000000b0b",
  batchZ: "00000000-0000-0000-0000-000000000b0c",
  tPractice: "00000000-0000-0000-0000-0000000007a1", tMockX: "00000000-0000-0000-0000-0000000007a2",
  tMockFree: "00000000-0000-0000-0000-0000000007a3", tClassB: "00000000-0000-0000-0000-0000000007a4",
  tDraft: "00000000-0000-0000-0000-0000000007a5", tArchived: "00000000-0000-0000-0000-0000000007a6",
  aX: "00000000-0000-0000-0000-0000000008a1", aArch: "00000000-0000-0000-0000-0000000008a2",
  aB: "00000000-0000-0000-0000-0000000008a3", aT: "00000000-0000-0000-0000-0000000008a4",
  aZ: "00000000-0000-0000-0000-0000000008a5", scale: "00000000-0000-0000-0000-0000000009a1",
  aImm: "00000000-0000-0000-0000-0000000008a6", aSched: "00000000-0000-0000-0000-0000000008a7",
};
await db.exec(`
  insert into public.branches (id, name) values ('${id.b1}', 'Main'), ('${id.b2}', 'North');
  insert into public.roles (key, name) values
    ('super_admin','Super admin'), ('admin','Admin'), ('teacher','Teacher'), ('invigilator','Invigilator'), ('student','Student')
  on conflict (key) do nothing; -- seeded by the reference_data migration
`);
const users = [
  ["studentA", "student", "b1", "active"], ["studentB", "student", "b1", "active"],
  ["studentOther", "student", "b2", "active"], ["suspended", "admin", "b1", "suspended"],
  ["admin1", "admin", "b1", "active"], ["admin2", "admin", "b2", "active"],
  ["teacher", "teacher", "b1", "active"], ["superAdmin", "super_admin", "b1", "active"],
  ["teacher2", "teacher", "b1", "active"], ["suspTeacher", "teacher", "b1", "suspended"],
  ["studentLeft", "student", "b1", "active"],
];
const branch1Users = users.filter((u) => u[2] === "b1").length;
for (const [k, role, b, status] of users) {
  await db.exec(`
    insert into auth.users (id, email) values ('${id[k]}', '${k.toLowerCase()}@x.in');
    insert into public.users (id, email, name, role_id, branch_id, status)
    select '${id[k]}', '${k.toLowerCase()}@x.in', '${k}', r.id, '${id[b]}', '${status}' from public.roles r where r.key = '${role}';
    insert into public.user_devices (user_id, device_secret_hash, pin_hash) values ('${id[k]}', 'dsh-${k}', 'ph-${k}');
    insert into public.user_sessions (user_id) values ('${id[k]}');
  `);
}
await db.exec(`
  insert into public.invitations (email, role_id, branch_id, token_hash, expires_at, invited_by)
  select 'new1@x.in', r.id, '${id.b1}', 'th-1', now() + interval '7 days', '${id.admin1}' from public.roles r where r.key = 'student';
  insert into public.invitations (email, role_id, branch_id, token_hash, expires_at, invited_by)
  select 'new2@x.in', r.id, '${id.b2}', 'th-2', now() + interval '7 days', '${id.admin2}' from public.roles r where r.key = 'student';
`);


// ── Cohort fixtures ──────────────────────────────────────────────────────────
await db.exec(`
  insert into public.batches (id, name, branch_id, starts_on) values
    ('${id.batchX}', 'X', '${id.b1}', '2026-09-01'), ('${id.batchY}', 'Y', '${id.b1}', '2026-09-01'),
    ('${id.batchZ}', 'Z', '${id.b2}', '2026-09-01');
  insert into public.batch_teachers (batch_id, teacher_id) values
    ('${id.batchX}', '${id.teacher}'), ('${id.batchX}', '${id.teacher2}'), ('${id.batchX}', '${id.suspTeacher}');
  insert into public.batch_students (batch_id, student_id, joined_at, left_at) values
    ('${id.batchX}', '${id.studentA}', now() - interval '10 days', null),
    ('${id.batchX}', '${id.studentLeft}', now() - interval '10 days', now() - interval '1 day'),
    ('${id.batchY}', '${id.studentB}', now() - interval '10 days', null),
    ('${id.batchZ}', '${id.studentOther}', now() - interval '10 days', null);
  insert into public.student_plans (student_id, plan_name, starts_on, expires_on, notes) values
    ('${id.studentA}', '3 months', '2026-09-01', '2026-12-01', 'paid'),
    ('${id.studentB}', '3 months', '2026-09-01', '2026-12-01', null),
    ('${id.studentOther}', '1 month', '2026-09-01', '2026-10-01', null);
  insert into public.plan_history (plan_id, action, new_expiry, actor_id)
    select id, 'create', expires_on, '${id.admin1}' from public.student_plans;
`);


// ── Content fixtures ─────────────────────────────────────────────────────────
const T = (idk, title, kind, status, extra = {}) => {
  const e = { skill: "listening", variant: "n_a", ptype: null, created_by: id.admin1, ...extra };
  const published = status === "draft" ? "null" : "now()";
  return `insert into public.tests (id, title, skill, variant, difficulty, kind, practice_question_type, duration_seconds, total_questions, section_count, status, r2_content_key, r2_key_key, r2_audio_key, created_by, published_at)
    values ('${id[idk]}', '${title}', '${e.skill}', '${e.variant}', 'medium', '${kind}', ${e.ptype ? `'${e.ptype}'` : "null"}, 1800, 40, 4, '${status}',
      'tests/${id[idk]}/v1/content.json', 'tests/${id[idk]}/v1/key.json', 'audio/${id[idk]}/v1/test.mp3', '${e.created_by}', ${published});`;
};
await db.exec([
  T("tPractice", "Matching headings 1", "practice", "published", { skill: "reading", variant: "academic", ptype: "matching_headings" }),
  T("tMockX", "Mock X", "mock", "published"),
  T("tMockFree", "Mock unassigned", "mock", "published"),
  T("tClassB", "Class test for B", "class", "published"),
  T("tDraft", "Teacher draft", "mock", "draft", { created_by: id.teacher }),
  T("tArchived", "Old mock", "mock", "archived"),
].join("\n"));
await db.exec(`
  insert into public.band_scales (id, skill, variant, name, is_default) values ('${id.scale}', 'listening', 'n_a', 'Custom listening', false);
  insert into public.band_scale_rows (scale_id, raw_min, raw_max, band) values ('${id.scale}', 39, 40, 9.0), ('${id.scale}', 37, 38, 8.5), ('${id.scale}', 35, 36, 8.0);
  insert into public.assignments (id, test_id, branch_id, created_by) values
    ('${id.aX}', '${id.tMockX}', '${id.b1}', '${id.admin1}'),
    ('${id.aArch}', '${id.tArchived}', '${id.b1}', '${id.admin1}'),
    ('${id.aB}', '${id.tClassB}', '${id.b1}', '${id.admin1}'),
    ('${id.aT}', '${id.tPractice}', '${id.b1}', '${id.teacher}'),
    ('${id.aZ}', '${id.tMockFree}', '${id.b2}', '${id.admin2}');
  insert into public.assignment_targets (assignment_id, batch_id, student_id) values
    ('${id.aX}', '${id.batchX}', null), ('${id.aArch}', '${id.batchX}', null),
    ('${id.aB}', null, '${id.studentB}'), ('${id.aT}', '${id.batchY}', null),
    ('${id.aZ}', '${id.batchZ}', null);
  insert into public.assignment_unlocks (assignment_id, student_id, unlocked_by, until, extra_attempts, reason)
    values ('${id.aX}', '${id.studentA}', '${id.teacher}', now() + interval '1 day', 1, 'was ill');
`);


// ── Helpers to act as an API role ────────────────────────────────────────────
async function as(role, userKey, sql) {
  const claims = userKey ? JSON.stringify({ sub: id[userKey], role }) : "";
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql);
    return { rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec("rollback");
  }
}
const count = async (role, user, sql) => (await as(role, user, sql)).rows?.length;
const denied = (r) => !!r.error && /permission denied|row-level security/.test(r.error);
async function asExec(role, userKey, sql) {
  const claims = userKey ? JSON.stringify({ sub: id[userKey], role }) : "";
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await db.exec(`set local role ${role}`);
    await db.exec(sql);
    return {};
  } catch (e) { return { error: e.message }; } finally { await db.exec("rollback"); }
}
const one = async (sql) => (await db.query(sql)).rows[0];

// ── Tests ────────────────────────────────────────────────────────────────────
const tables = ["branches", "roles", "users", "invitations", "user_devices", "user_sessions"];

console.log("\nRLS is on everywhere");
const rls = await db.query(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`);
for (const t of tables) ok(`${t} has RLS enabled`, rls.rows.find((r) => r.relname === t)?.relrowsecurity === true);
const rlsFinal = async () => (await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)).rows.map(r => r.relname);

console.log("\nanon gets nothing");
for (const t of tables) ok(`anon cannot select ${t}`, denied(await as("anon", null, `select * from public.${t}`)));
ok("anon cannot use schema private", denied(await as("anon", null, `select private.auth_role()`)));

console.log("\nstudent A");
ok("sees exactly their own user row", (await as("authenticated", "studentA", `select id from public.users`)).rows?.map(r=>r.id).join() === id.studentA);
ok("sees only their own branch", (await count("authenticated", "studentA", `select id from public.branches`)) === 1);
ok("can read roles", (await count("authenticated", "studentA", `select id from public.roles`)) === 5);
ok("sees no invitations", (await count("authenticated", "studentA", `select id from public.invitations`)) === 0);
ok("sees only their own device", (await as("authenticated", "studentA", `select user_id from public.user_devices`)).rows?.map(r=>r.user_id).join() === id.studentA);
ok("sees only their own session", (await count("authenticated", "studentA", `select id from public.user_sessions`)) === 1);
ok("cannot read pin_hash", denied(await as("authenticated", "studentA", `select pin_hash from public.user_devices`)));
ok("cannot read device_secret_hash", denied(await as("authenticated", "studentA", `select device_secret_hash from public.user_devices`)));
ok("select * on user_devices is refused (hashes in *)", denied(await as("authenticated", "studentA", `select * from public.user_devices`)));
ok("cannot update own role", denied(await as("authenticated", "studentA", `update public.users set role_id = role_id where id = '${id.studentA}'`)));
ok("cannot update own name (identity is read-only via API)", denied(await as("authenticated", "studentA", `update public.users set name = 'x' where id = '${id.studentA}'`)));
ok("cannot insert a user", denied(await as("authenticated", "studentA", `insert into public.users (id, email, name, role_id, branch_id) values (gen_random_uuid(), 'z@x.in', 'z', gen_random_uuid(), gen_random_uuid())`)));
ok("cannot delete own device", denied(await as("authenticated", "studentA", `delete from public.user_devices`)));
ok("private.auth_role() says student", (await as("authenticated", "studentA", `select private.auth_role() as r`)).rows?.[0]?.r === "student");

console.log("\nadmin, branch 1");
const adminUsers = (await as("authenticated", "admin1", `select id from public.users`)).rows?.map(r => r.id) ?? [];
ok("sees all branch-1 users", [id.studentA, id.studentB, id.admin1, id.teacher, id.superAdmin, id.suspended].every(u => adminUsers.includes(u)));
ok("sees no branch-2 users", !adminUsers.includes(id.studentOther) && !adminUsers.includes(id.admin2));
ok("sees branch-1 invitations only", (await as("authenticated", "admin1", `select email from public.invitations`)).rows?.map(r=>r.email).join() === "new1@x.in");
ok("cannot read token_hash", denied(await as("authenticated", "admin1", `select token_hash from public.invitations`)));
ok("sees branch-1 devices only", (await count("authenticated", "admin1", `select id from public.user_devices`)) === branch1Users);
ok("sees branch-1 sessions only", (await count("authenticated", "admin1", `select id from public.user_sessions`)) === branch1Users);
ok("cannot create an invitation via the API", denied(await as("authenticated", "admin1", `insert into public.invitations (email, role_id, branch_id, token_hash, expires_at, invited_by) values ('q@x.in', gen_random_uuid(), '${id.b1}', 't', now() + interval '1 day', '${id.admin1}')`)));
ok("sees only their own branch row", (await count("authenticated", "admin1", `select id from public.branches`)) === 1);

console.log("\nsuspended admin, branch 1");
ok("gets no role from the helper", (await as("authenticated", "suspended", `select private.auth_role() as r`)).rows?.[0]?.r === null);
ok("sees only their own user row", (await count("authenticated", "suspended", `select id from public.users`)) === 1);
ok("sees no invitations", (await count("authenticated", "suspended", `select id from public.invitations`)) === 0);
ok("sees no roles", (await count("authenticated", "suspended", `select id from public.roles`)) === 0);

console.log("\nteacher (identity)");
ok("sees self + the one current student in their batch", (await as("authenticated", "teacher", `select id from public.users order by id`)).rows?.map(r=>r.id).sort().join() === [id.studentA, id.teacher].sort().join());
ok("sees no invitations", (await count("authenticated", "teacher", `select id from public.invitations`)) === 0);
ok("is_staff() is true", (await as("authenticated", "teacher", `select private.is_staff() as s`)).rows?.[0]?.s === true);
ok("student is_staff() is false", (await as("authenticated", "studentA", `select private.is_staff() as s`)).rows?.[0]?.s === false);

console.log("\nsuper admin");
ok("sees every user", (await count("authenticated", "superAdmin", `select id from public.users`)) === users.length);
ok("sees every branch", (await count("authenticated", "superAdmin", `select id from public.branches`)) === 2);
ok("sees every invitation", (await count("authenticated", "superAdmin", `select id from public.invitations`)) === 2);
ok("still cannot read token_hash", denied(await as("authenticated", "superAdmin", `select token_hash from public.invitations`)));

console.log("\nauthenticated with no profile row (auth user only)");
await db.exec(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ff', 'ghost@x.in')`);
id.ghost = "00000000-0000-0000-0000-0000000000ff";
for (const t of tables) ok(`sees nothing in ${t}`, (await count("authenticated", "ghost", `select 1 from public.${t}`)) === 0);

console.log("\nservice role (server code) and triggers");
ok("service_role can read token_hash", !(await as("service_role", null, `select token_hash from public.invitations`)).error);
const before = (await db.query(`select updated_at from public.users where id = '${id.studentA}'`)).rows[0].updated_at;
await db.exec(`select pg_sleep(0.01); update public.users set name = 'Student A' where id = '${id.studentA}'`);
const after = (await db.query(`select updated_at from public.users where id = '${id.studentA}'`)).rows[0].updated_at;
ok("updated_at trigger moves on update", after > before);
ok("service_role update fires the private trigger", !(await as("service_role", null, `update public.users set name = 'A2' where id = '${id.studentA}'`)).error);

console.log("\nconstraints");
const bad = async (sql) => { try { await db.exec(sql); return false; } catch { return true; } };
ok("uppercase email rejected", await bad(`update public.users set email = 'Upper@x.in' where id = '${id.studentB}'`));
ok("second pending invite for same email rejected", await bad(`insert into public.invitations (email, role_id, branch_id, token_hash, expires_at, invited_by) select 'new1@x.in', role_id, branch_id, 'th-x', now() + interval '1 day', invited_by from public.invitations limit 1`));
ok("accepted without accepted_at rejected", await bad(`update public.invitations set status = 'accepted' where email = 'new1@x.in'`));
ok("unknown status rejected", await bad(`update public.users set status = 'banned' where id = '${id.studentB}'`));


console.log("\ncohorts — teacher of batch X");
const tUsers = async (k, sql) => (await as("authenticated", k, sql)).rows ?? [];
ok("sees batch X only", (await tUsers("teacher", `select id from public.batches`)).map(r=>r.id).join() === id.batchX);
ok("sees X's memberships incl. the student who left (history)", (await count("authenticated", "teacher", `select 1 from public.batch_students`)) === 2);
ok("sees own + co-teacher rows for X", (await count("authenticated", "teacher", `select 1 from public.batch_teachers`)) === 3);
ok("sees only studentA's plan", (await tUsers("teacher", `select student_id from public.student_plans`)).map(r=>r.student_id).join() === id.studentA);
ok("sees no plan history", (await count("authenticated", "teacher", `select 1 from public.plan_history`)) === 0);
ok("does not see a student who left the batch", !(await tUsers("teacher", `select id from public.users`)).some(r=>r.id===id.studentLeft));
ok("does not see studentB (other batch) or branch 2", !(await tUsers("teacher", `select id from public.users`)).some(r=>[id.studentB,id.studentOther].includes(r.id)));
ok("still cannot read other students' devices", (await count("authenticated", "teacher", `select id from public.user_devices`)) === 1);
ok("co-teacher also sees studentA", (await tUsers("teacher2", `select id from public.users`)).some(r=>r.id===id.studentA));

console.log("\ncohorts — suspended teacher of batch X");
ok("sees only own user row", (await count("authenticated", "suspTeacher", `select id from public.users`)) === 1);
ok("sees no batches", (await count("authenticated", "suspTeacher", `select id from public.batches`)) === 0);
ok("sees no plans", (await count("authenticated", "suspTeacher", `select id from public.student_plans`)) === 0);
ok("sees no memberships", (await count("authenticated", "suspTeacher", `select 1 from public.batch_students`)) === 0);

console.log("\ncohorts — students");
ok("studentA sees batch X only", (await tUsers("studentA", `select id from public.batches`)).map(r=>r.id).join() === id.batchX);
ok("studentA sees only their own membership row", (await tUsers("studentA", `select student_id from public.batch_students`)).map(r=>r.student_id).join() === id.studentA);
ok("studentA sees no teacher assignments", (await count("authenticated", "studentA", `select 1 from public.batch_teachers`)) === 0);
ok("studentA sees only their own plan (with notes)", (await tUsers("studentA", `select student_id, notes from public.student_plans`)).map(r=>r.student_id+r.notes).join() === id.studentA+"paid");
ok("studentA sees no plan history", (await count("authenticated", "studentA", `select 1 from public.plan_history`)) === 0);
ok("studentA still sees only their own user row", (await count("authenticated", "studentA", `select id from public.users`)) === 1);
ok("student who left sees no batch", (await count("authenticated", "studentLeft", `select id from public.batches`)) === 0);
ok("student who left still sees their own history row", (await count("authenticated", "studentLeft", `select 1 from public.batch_students`)) === 1);
ok("studentB sees batch Y only", (await tUsers("studentB", `select id from public.batches`)).map(r=>r.id).join() === id.batchY);

console.log("\ncohorts — admins and super admin");
ok("admin1 sees batches X and Y, not Z", (await tUsers("admin1", `select id from public.batches order by id`)).map(r=>r.id).join() === [id.batchX, id.batchY].join());
ok("admin1 sees all 3 branch-1 memberships", (await count("authenticated", "admin1", `select 1 from public.batch_students`)) === 3);
ok("admin1 sees branch-1 teacher assignments", (await count("authenticated", "admin1", `select 1 from public.batch_teachers`)) === 3);
ok("admin1 sees 2 branch-1 plans", (await count("authenticated", "admin1", `select 1 from public.student_plans`)) === 2);
ok("admin1 sees 2 branch-1 plan histories", (await count("authenticated", "admin1", `select 1 from public.plan_history`)) === 2);
ok("admin2 sees batch Z only", (await tUsers("admin2", `select id from public.batches`)).map(r=>r.id).join() === id.batchZ);
ok("admin2 sees 1 plan and 1 history", (await count("authenticated", "admin2", `select 1 from public.student_plans`)) === 1 && (await count("authenticated", "admin2", `select 1 from public.plan_history`)) === 1);
ok("super admin sees all 3 batches, plans, histories", (await count("authenticated", "superAdmin", `select 1 from public.batches`)) === 3 && (await count("authenticated", "superAdmin", `select 1 from public.student_plans`)) === 3 && (await count("authenticated", "superAdmin", `select 1 from public.plan_history`)) === 3);

console.log("\ncohorts — writes, anon, constraints");
const cohortTables = ["batches", "batch_teachers", "batch_students", "student_plans", "plan_history"];
for (const t of cohortTables) ok(`anon cannot select ${t}`, denied(await as("anon", null, `select 1 from public.${t}`)));
ok("admin cannot insert a batch via the API", denied(await as("authenticated", "admin1", `insert into public.batches (name, branch_id, starts_on) values ('Q', '${id.b1}', '2026-09-01')`)));
ok("student cannot extend their own plan", denied(await as("authenticated", "studentA", `update public.student_plans set expires_on = '2030-01-01' where student_id = '${id.studentA}'`)));
ok("teacher cannot enrol a student", denied(await as("authenticated", "teacher", `insert into public.batch_students (batch_id, student_id) values ('${id.batchX}', '${id.studentB}')`)));
ok("second active plan for a student rejected", await bad(`insert into public.student_plans (student_id, plan_name, starts_on, expires_on) values ('${id.studentA}', 'dup', '2026-09-01', '2026-10-01')`));
ok("plan_history rows cannot be updated (even by postgres)", await bad(`update public.plan_history set reason = 'x'`));
ok("expiry before start rejected", await bad(`insert into public.student_plans (student_id, plan_name, starts_on, expires_on, status) values ('${id.studentB}', 'bad', '2026-09-10', '2026-09-01', 'expired')`));
ok("invitation with unknown batch_id rejected", await bad(`insert into public.invitations (email, role_id, branch_id, batch_id, token_hash, expires_at, invited_by) select 'b@x.in', role_id, branch_id, gen_random_uuid(), 'th-b', now() + interval '1 day', invited_by from public.invitations limit 1`));
await db.exec(`insert into public.student_plans (id, student_id, plan_name, starts_on, expires_on, status) values ('00000000-0000-0000-0000-00000000dead', '${id.studentB}', 'old', '2026-01-01', '2026-02-01', 'expired');
  insert into public.plan_history (plan_id, action) values ('00000000-0000-0000-0000-00000000dead', 'create');`);
ok("deleting a plan cascades its history (DPDP erase still works)", !(await bad(`delete from public.student_plans where id = '00000000-0000-0000-0000-00000000dead'`)) && (await db.query(`select count(*)::int c from public.plan_history where plan_id = '00000000-0000-0000-0000-00000000dead'`)).rows[0].c === 0);


console.log("\ncontent — tests visibility");
const ids = async (k, sql) => ((await as("authenticated", k, sql)).rows ?? []).map((r) => r.id).sort().join();
const S = (...ks) => ks.map((k) => id[k]).sort().join();
ok("studentA: practice + assigned mock + assigned archived", (await ids("studentA", `select id from public.tests`)) === S("tPractice", "tMockX", "tArchived"));
ok("studentB: practice + class test assigned to them directly", (await ids("studentB", `select id from public.tests`)) === S("tPractice", "tClassB"));
ok("student who left batch X: practice only", (await ids("studentLeft", `select id from public.tests`)) === S("tPractice"));
ok("branch-2 student: practice + the mock assigned to batch Z", (await ids("studentOther", `select id from public.tests`)) === S("tPractice", "tMockFree"));
ok("teacher: all published + own draft, not archived", (await ids("teacher", `select id from public.tests`)) === S("tPractice", "tMockX", "tMockFree", "tClassB", "tDraft"));
ok("co-teacher: published only (not the other teacher's draft)", (await ids("teacher2", `select id from public.tests`)) === S("tPractice", "tMockX", "tMockFree", "tClassB"));
ok("admin (any branch): whole library", (await count("authenticated", "admin2", `select id from public.tests`)) === 6);
ok("suspended teacher: no tests", (await count("authenticated", "suspTeacher", `select id from public.tests`)) === 0);
ok("student cannot read r2_key_key", denied(await as("authenticated", "studentA", `select r2_key_key from public.tests`)));
ok("admin cannot read r2_key_key either", denied(await as("authenticated", "superAdmin", `select r2_key_key from public.tests`)));
ok("select * on tests refused (R2 paths in *)", denied(await as("authenticated", "teacher", `select * from public.tests`)));
ok("service_role can read r2_key_key (server code)", !(await as("service_role", null, `select r2_key_key from public.tests`)).error);

console.log("\ncontent — band scales");
ok("teacher reads the band scales (3 seeded + 1 custom)", (await count("authenticated", "teacher", `select 1 from public.band_scales`)) === 4);
ok("teacher reads band scale rows (36 seeded + 3 custom)", (await count("authenticated", "teacher", `select 1 from public.band_scale_rows`)) === 39);
ok("student reads no band scales", (await count("authenticated", "studentA", `select 1 from public.band_scales`)) === 0 && (await count("authenticated", "studentA", `select 1 from public.band_scale_rows`)) === 0);

console.log("\ncontent — assignments, targets, unlocks");
ok("studentA: the two assignments on batch X", (await ids("studentA", `select id from public.assignments`)) === S("aX", "aArch"));
ok("studentB: direct assignment + batch Y homework", (await ids("studentB", `select id from public.assignments`)) === S("aB", "aT"));
ok("studentA sees only target rows for batch X", (await count("authenticated", "studentA", `select 1 from public.assignment_targets`)) === 2);
ok("studentA does not see studentB's direct target", !((await as("authenticated", "studentA", `select student_id from public.assignment_targets`)).rows ?? []).some((r) => r.student_id === id.studentB));
ok("teacher: batch X assignments + the one they created", (await ids("teacher", `select id from public.assignments`)) === S("aX", "aArch", "aT"));
ok("admin1: all branch-1 assignments", (await ids("admin1", `select id from public.assignments`)) === S("aX", "aArch", "aB", "aT"));
ok("admin2: branch-2 assignment only", (await ids("admin2", `select id from public.assignments`)) === S("aZ"));
ok("super admin: all 5", (await count("authenticated", "superAdmin", `select 1 from public.assignments`)) === 5);
ok("studentA sees their unlock", (await count("authenticated", "studentA", `select 1 from public.assignment_unlocks`)) === 1);
ok("studentB sees no unlocks", (await count("authenticated", "studentB", `select 1 from public.assignment_unlocks`)) === 0);
ok("teacher of X sees the unlock", (await count("authenticated", "teacher", `select 1 from public.assignment_unlocks`)) === 1);
ok("admin2 sees no branch-1 unlock", (await count("authenticated", "admin2", `select 1 from public.assignment_unlocks`)) === 0);
ok("student reads release fields of their assignment", (await as("authenticated", "studentA", `select results_release, results_released_at from public.assignments`)).rows?.length === 2);

console.log("\ncontent — writes, anon, constraints");
const contentTables = ["tests", "band_scales", "band_scale_rows", "assignments", "assignment_targets", "assignment_unlocks"];
for (const t of contentTables) ok(`anon cannot select ${t}`, denied(await as("anon", null, `select 1 from public.${t}`)));
ok("admin cannot publish a test via the API", denied(await as("authenticated", "admin1", `update public.tests set status = 'published' where id = '${id.tDraft}'`)));
ok("teacher cannot release results via the API", denied(await as("authenticated", "teacher", `update public.assignments set results_released_at = now() where id = '${id.aX}'`)));
ok("student cannot give themselves an unlock", denied(await as("authenticated", "studentA", `insert into public.assignment_unlocks (assignment_id, student_id, until) values ('${id.aX}', '${id.studentA}', now() + interval '1 day')`)));
ok("published test without key rejected", await bad(`insert into public.tests (title, skill, variant, difficulty, kind, duration_seconds, total_questions, section_count, status, published_at, r2_content_key) values ('x','reading','academic','easy','mock',60,40,3,'published',now(),'c')`));
ok("published listening test without audio rejected", await bad(`insert into public.tests (title, skill, variant, difficulty, kind, duration_seconds, total_questions, section_count, status, published_at, r2_content_key, r2_key_key) values ('x','listening','n_a','easy','mock',60,40,4,'published',now(),'c','k')`));
ok("practice test without a question type rejected", await bad(`insert into public.tests (title, skill, variant, difficulty, kind, duration_seconds, total_questions, section_count) values ('x','reading','academic','easy','practice',60,5,1)`));
ok("mock test with a question type rejected", await bad(`insert into public.tests (title, skill, variant, difficulty, kind, practice_question_type, duration_seconds, total_questions, section_count) values ('x','reading','academic','easy','mock','matching_headings',60,40,3)`));
ok("listening test marked academic rejected", await bad(`insert into public.tests (title, skill, variant, difficulty, kind, duration_seconds, total_questions, section_count) values ('x','listening','academic','easy','mock',60,40,4)`));
ok("overlapping band rows rejected", await bad(`insert into public.band_scale_rows (scale_id, raw_min, raw_max, band) values ('${id.scale}', 36, 37, 8.0)`));
ok("band 6.3 rejected", await bad(`insert into public.band_scale_rows (scale_id, raw_min, raw_max, band) values ('${id.scale}', 0, 1, 6.3)`));
ok("second default scale for listening rejected", await bad(`insert into public.band_scales (skill, variant, name, is_default) values ('listening', 'n_a', 'dup', true)`));
ok("scheduled release without a time rejected", await bad(`update public.assignments set results_release = 'scheduled', results_released_at = null where id = '${id.aX}'`));
ok("immediate release with a time rejected", await bad(`update public.assignments set results_release = 'immediate', results_released_at = now() where id = '${id.aX}'`));
ok("target with both batch and student rejected", await bad(`insert into public.assignment_targets (assignment_id, batch_id, student_id) values ('${id.aX}', '${id.batchY}', '${id.studentB}')`));
ok("target with neither rejected", await bad(`insert into public.assignment_targets (assignment_id) values ('${id.aX}')`));
ok("same batch targeted twice rejected", await bad(`insert into public.assignment_targets (assignment_id, batch_id) values ('${id.aX}', '${id.batchX}')`));
ok("default release is manual", (await db.query(`select results_release r from public.assignments where id = '${id.aX}'`)).rows[0].r === "manual");


// ── Assessment fixtures ──────────────────────────────────────────────────────
await db.exec(`
  insert into public.assignments (id, test_id, branch_id, created_by, results_release, allow_review) values
    ('${id.aImm}', '${id.tMockFree}', '${id.b1}', '${id.admin1}', 'immediate', false);
  insert into public.assignments (id, test_id, branch_id, created_by, results_release, results_released_at) values
    ('${id.aSched}', '${id.tMockX}', '${id.b1}', '${id.admin1}', 'scheduled', now() + interval '1 day');
  insert into public.assignment_targets (assignment_id, student_id) values ('${id.aImm}', '${id.studentB}'), ('${id.aSched}', '${id.studentA}'), ('${id.aSched}', '${id.studentB}');
`);
const newAttempt = async (student, test, assignment) => (await db.query(
  `insert into public.attempts (student_id, test_id, assignment_id) values ($1, $2, $3) returning id`,
  [id[student], id[test], assignment ? id[assignment] : null])).rows[0].id;
const finish = async (att, status = "submitted") => db.exec(`update public.attempts set status = '${status}' where id = '${att}'`);
const mark = (att, n, ok) => `insert into public.answer_marks (attempt_id, q_number, section_no, question_type, is_correct, marks_awarded) values ('${att}', ${n}, 1, 'form_completion', ${ok}, ${ok ? 1 : 0});`;
const score = (att) => `insert into public.attempt_scores (attempt_id, raw_score, band) values ('${att}', 30, 7.0);`;
const att = {};
att.A = await newAttempt("studentA", "tMockX", "aX");                                        // mock, in progress
att.practice = await newAttempt("studentA", "tPractice", null);                              // self-started practice
att.B = await newAttempt("studentB", "tClassB", "aB");                                       // class, manual release
att.imm = await newAttempt("studentB", "tMockFree", "aImm");                                 // immediate, no review
att.other = await newAttempt("studentOther", "tMockFree", "aZ");                             // branch 2
att.left = await newAttempt("studentLeft", "tArchived", null).catch(() => null);            // archived test: must fail
await db.exec(`insert into public.answers (attempt_id, q_number, section_no, given_answer) values
  ('${att.A}', 1, 1, 'library'), ('${att.practice}', 1, 1, 'iii'), ('${att.B}', 1, 1, 'x'), ('${att.imm}', 1, 1, 'y');`);
await db.exec([mark(att.A, 1, true), score(att.A), mark(att.practice, 1, false), mark(att.B, 1, true), mark(att.imm, 1, true), mark(att.other, 1, true)].join("\n"));
await finish(att.B); await finish(att.imm); await finish(att.other);
await db.exec([score(att.B), score(att.imm), score(att.other)].join("\n"));
await db.exec(`insert into public.attempt_events (attempt_id, type) values ('${att.A}', 'start'), ('${att.A}', 'tab_blur');`);


console.log("\nassessment — the server clock");
const tA = await one(`select started_at, expires_at, kind, status, content_version from public.attempts where id = '${att.A}'`);
ok("expires_at = start + test duration (set by trigger)", (tA.expires_at - tA.started_at) === 1800 * 1000);
const forged = (await db.query(`insert into public.attempts (student_id, test_id, assignment_id, kind, status, expires_at, started_at) values ('${id.studentB}', '${id.tMockX}', '${id.aSched}', 'practice', 'submitted', now() + interval '10 years', now() - interval '1 day') returning kind, status, expires_at - started_at as len`)).rows[0];
ok("caller-supplied kind/status/times are ignored", forged.kind === "mock" && forged.status === "in_progress" && /00:30:00|1800/.test(JSON.stringify(forged.len)));
await db.exec(`delete from public.attempts where student_id = '${id.studentB}' and test_id = '${id.tMockX}'`);
ok("attempt on an archived test rejected", att.left === null);
ok("self-started mock (no assignment) rejected", await bad(`insert into public.attempts (student_id, test_id) values ('${id.studentB}', '${id.tMockX}')`));
ok("attempt pointing at another test's assignment rejected", /different test/.test((await asExec("service_role", null, `insert into public.attempts (student_id, test_id, assignment_id) values ('${id.studentA}', '${id.tClassB}', '${id.aX}')`)).error ?? ""));
ok("assignment that doesn't target the student rejected", /does not target/.test((await asExec("service_role", null, `insert into public.attempts (student_id, test_id, assignment_id) values ('${id.studentA}', '${id.tClassB}', '${id.aB}')`)).error ?? ""));
ok("second open attempt on the same test rejected", await bad(`insert into public.attempts (student_id, test_id, assignment_id) values ('${id.studentA}', '${id.tMockX}', '${id.aX}')`));
ok("extra time while in progress allowed", !(await bad(`update public.attempts set expires_at = expires_at + interval '5 minutes' where id = '${att.A}'`)));
ok("shortening expires_at rejected", await bad(`update public.attempts set expires_at = expires_at - interval '1 minute' where id = '${att.A}'`));
ok("extra time after submit rejected", await bad(`update public.attempts set expires_at = expires_at + interval '5 minutes' where id = '${att.B}'`));
ok("moving an attempt to another student rejected", await bad(`update public.attempts set student_id = '${id.studentB}' where id = '${att.A}'`));
ok("submitted_at stamped on submit", (await one(`select submitted_at from public.attempts where id = '${att.B}'`)).submitted_at !== null);
ok("submitted → in_progress rejected", await bad(`update public.attempts set status = 'in_progress', submitted_at = null where id = '${att.B}'`));
ok("submitted → voided allowed, voided → submitted rejected", !(await bad(`update public.attempts set status = 'voided' where id = '${att.other}'`)) && await bad(`update public.attempts set status = 'submitted' where id = '${att.other}'`));

console.log("\nassessment — writing answers");
ok("student saves an answer to their own open attempt", !(await asExec("authenticated", "studentA", `insert into public.answers (attempt_id, q_number, section_no, given_answer) values ('${att.A}', 2, 1, 'park')`)).error);
ok("…and updates it with a higher revision", !(await asExec("authenticated", "studentA", `update public.answers set given_answer = 'parks', revision = 2 where attempt_id = '${att.A}' and q_number = 1`)).error);
const stale = await asExec("authenticated", "studentA", `update public.answers set given_answer = 'old', revision = 1 where attempt_id = '${att.A}' and q_number = 1`);
ok("replayed save with the same revision rejected", /stale revision/.test(stale.error ?? ""));
ok("student cannot write into another student's attempt", denied(await asExec("authenticated", "studentB", `insert into public.answers (attempt_id, q_number, section_no, given_answer) values ('${att.A}', 3, 1, 'x')`)));
ok("student cannot set answered_at themselves", denied(await asExec("authenticated", "studentA", `insert into public.answers (attempt_id, q_number, section_no, answered_at) values ('${att.A}', 4, 1, now() - interval '1 hour')`)));
ok("question number beyond the test rejected", /outside this test/.test((await asExec("authenticated", "studentA", `insert into public.answers (attempt_id, q_number, section_no) values ('${att.A}', 41, 4)`)).error ?? ""));
ok("student cannot write answer_marks", denied(await asExec("authenticated", "studentA", mark(att.A, 2, true))));
ok("student cannot write their own score", denied(await asExec("authenticated", "studentA", `update public.attempt_scores set band = 9 where attempt_id = '${att.A}'`)));
ok("student cannot submit or extend their attempt directly", denied(await asExec("authenticated", "studentA", `update public.attempts set expires_at = expires_at + interval '1 hour' where id = '${att.A}'`)));
ok("saving into a submitted attempt rejected, even for service_role", /attempt is submitted/.test((await asExec("service_role", null, `insert into public.answers (attempt_id, q_number, section_no) values ('${att.B}', 2, 1)`)).error ?? ""));
await db.exec(`alter table public.attempts disable trigger attempts_before_update;
  update public.attempts set started_at = now() - interval '1 hour', expires_at = now() - interval '1 second' where id = '${att.practice}';
  alter table public.attempts enable trigger attempts_before_update;`);
const late = await as("authenticated", "studentA", `update public.answers set given_answer = 'late', revision = 9 where attempt_id = '${att.practice}' and q_number = 1`);
ok("after the deadline: student's update changes 0 rows (RLS)", (denied(late) || late.affected === 0) && (await one(`select given_answer from public.answers where attempt_id = '${att.practice}' and q_number = 1`)).given_answer === "iii");
const lateIns = await asExec("authenticated", "studentA", `insert into public.answers (attempt_id, q_number, section_no) values ('${att.practice}', 2, 1)`);
ok("after the deadline: student's new answer refused", denied(lateIns) || /time is up/.test(lateIns.error ?? ""));
ok("after the deadline: service_role save refused by trigger", /time is up/.test((await asExec("service_role", null, `update public.answers set given_answer = 'late', revision = 9 where attempt_id = '${att.practice}' and q_number = 1`)).error ?? ""));
ok("an answer write stamps last_autosave_at", (await one(`select last_autosave_at from public.attempts where id = '${att.A}'`)).last_autosave_at !== null);

console.log("\nassessment — what students can read");
const n = (k, sql) => count("authenticated", k, sql);
ok("studentA reads their own in-progress answers", (await n("studentA", `select 1 from public.answers where attempt_id = '${att.A}'`)) === 1);
ok("in-progress MOCK: no marks visible to the student", (await n("studentA", `select 1 from public.answer_marks where attempt_id = '${att.A}'`)) === 0);
ok("in-progress MOCK: no score visible to the student", (await n("studentA", `select 1 from public.attempt_scores where attempt_id = '${att.A}'`)) === 0);
ok("PRACTICE: instant verdict visible", (await n("studentA", `select 1 from public.answer_marks where attempt_id = '${att.practice}'`)) === 1);
ok("manual release, not yet released: score hidden", (await n("studentB", `select 1 from public.attempt_scores where attempt_id = '${att.B}'`)) === 0);
ok("manual release, not yet released: marks hidden", (await n("studentB", `select 1 from public.answer_marks where attempt_id = '${att.B}'`)) === 0);
await db.exec(`update public.assignments set results_released_at = now() where id = '${id.aB}'`);
ok("…after the teacher releases: score visible", (await n("studentB", `select 1 from public.attempt_scores where attempt_id = '${att.B}'`)) === 1);
ok("…and marks visible (review allowed)", (await n("studentB", `select 1 from public.answer_marks where attempt_id = '${att.B}'`)) === 1);
ok("immediate release: score visible straight after submit", (await n("studentB", `select 1 from public.attempt_scores where attempt_id = '${att.imm}'`)) === 1);
ok("immediate release with review off: marks still hidden", (await n("studentB", `select 1 from public.answer_marks where attempt_id = '${att.imm}'`)) === 0);
await finish(att.A);
ok("scheduled release in the future: score hidden", (await n("studentA", `select 1 from public.attempt_scores where attempt_id = '${att.A}'`)) === 0);
await db.exec(`update public.assignments set results_release = 'scheduled', results_released_at = now() + interval '1 hour' where id = '${id.aX}'`);
ok("…still hidden before the scheduled time", (await n("studentA", `select 1 from public.attempt_scores where attempt_id = '${att.A}'`)) === 0);
await db.exec(`update public.assignments set results_released_at = now() - interval '1 minute' where id = '${id.aX}'`);
ok("…visible once the server clock passes it", (await n("studentA", `select 1 from public.attempt_scores where attempt_id = '${att.A}'`)) === 1);
await db.exec(`update public.attempts set status = 'voided' where id = '${att.imm}'`);
ok("voided attempt: score hidden again", (await n("studentB", `select 1 from public.attempt_scores where attempt_id = '${att.imm}'`)) === 0);
ok("studentB cannot read studentA's attempts or answers", (await n("studentB", `select 1 from public.attempts where student_id = '${id.studentA}'`)) === 0 && (await n("studentB", `select 1 from public.answers where attempt_id = '${att.A}'`)) === 0);
ok("students read no attempt events", (await n("studentA", `select 1 from public.attempt_events`)) === 0);
ok("student who left the batch cannot start its assignment", /does not target this student/.test((await asExec("service_role", null, `insert into public.attempts (student_id, test_id, assignment_id) values ('${id.studentLeft}', '${id.tMockX}', '${id.aX}')`)).error ?? ""));
ok("student keeps seeing a test they sat before leaving (history)", await (async () => {
  await db.exec(`alter table public.attempts disable trigger attempts_before_insert;
    insert into public.attempts (student_id, test_id, assignment_id, kind, content_version, expires_at) values ('${id.studentLeft}', '${id.tMockX}', '${id.aX}', 'mock', 1, now() + interval '1 hour');
    alter table public.attempts enable trigger attempts_before_insert;`);
  return (await ids("studentLeft", `select id from public.tests`)).includes(id.tMockX); })());

console.log("\nassessment — staff");
ok("teacher of batch X sees studentA's scores and marks regardless of release", (await n("teacher", `select 1 from public.answer_marks where attempt_id = '${att.practice}'`)) === 1 && (await n("teacher", `select 1 from public.attempt_scores where attempt_id = '${att.A}'`)) === 1);
ok("teacher sees attempt events of their student", (await n("teacher", `select 1 from public.attempt_events`)) === 2);
ok("teacher does not see studentB's attempts", (await n("teacher", `select 1 from public.attempts where student_id = '${id.studentB}'`)) === 0);
ok("admin1 sees branch-1 attempts, not branch 2", (await n("admin1", `select 1 from public.attempts where student_id = '${id.studentOther}'`)) === 0 && (await n("admin1", `select 1 from public.attempts where student_id = '${id.studentB}'`)) === 2);
ok("admin2 sees the branch-2 attempt", (await n("admin2", `select 1 from public.attempts`)) === 1);
ok("staff cannot write marks via the API", denied(await asExec("authenticated", "teacher", `update public.answer_marks set marks_awarded = 1 where attempt_id = '${att.A}'`)));
ok("attempt events are append-only", await bad(`update public.attempt_events set type = 'resume'`));
const assessTables = ["attempts", "answers", "answer_marks", "attempt_scores", "attempt_events"];
for (const t of assessTables) ok(`anon cannot select ${t}`, denied(await as("anon", null, `select 1 from public.${t}`)));


console.log("\ncross-cutting — audit log and rate limits");
await db.exec(`insert into public.audit_log (actor_id, branch_id, action, entity, entity_id) values
  ('${id.admin1}', '${id.b1}', 'plan.extend', 'student_plans', 'p1'),
  ('${id.admin2}', '${id.b2}', 'invite.create', 'invitations', 'i2'),
  ('${id.superAdmin}', null, 'role.change', 'users', 'u3');
  insert into public.rate_limits (key, window_start, count) values ('login:ip:203.0.113.9', date_trunc('minute', now()), 3);`);
ok("admin1 reads branch-1 audit rows only", (await n("admin1", `select 1 from public.audit_log`)) === 1);
ok("admin2 reads branch-2 audit rows only", (await n("admin2", `select 1 from public.audit_log`)) === 1);
ok("super admin reads every audit row", (await n("superAdmin", `select 1 from public.audit_log`)) === 3);
ok("teacher and student read no audit rows", (await n("teacher", `select 1 from public.audit_log`)) === 0 && (await n("studentA", `select 1 from public.audit_log`)) === 0);
ok("nobody writes audit rows via the API", denied(await asExec("authenticated", "superAdmin", `insert into public.audit_log (action, entity) values ('x.y', 'z')`)));
ok("audit rows cannot be updated (even by postgres)", await bad(`update public.audit_log set action = 'x.y'`));
ok("malformed action rejected", await bad(`insert into public.audit_log (action, entity) values ('Plan Extend', 'student_plans')`));
ok("rate_limits: no API access for anyone", denied(await as("authenticated", "superAdmin", `select 1 from public.rate_limits`)) && denied(await as("anon", null, `select 1 from public.rate_limits`)));
ok("rate_limits: service_role can use it", !(await as("service_role", null, `select 1 from public.rate_limits`)).error);
ok("anon cannot select audit_log", denied(await as("anon", null, `select 1 from public.audit_log`)));
// A staff user who changed a plan and appears in the audit log can still be erased, and the trail stays.
await db.exec(`
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a3', 'admin3@x.in');
  insert into public.users (id, email, name, role_id, branch_id) select '00000000-0000-0000-0000-0000000000a3', 'admin3@x.in', 'A3', r.id, '${id.b1}' from public.roles r where r.key = 'admin';
  insert into public.plan_history (plan_id, action, actor_id) select id, 'extend', '00000000-0000-0000-0000-0000000000a3' from public.student_plans limit 1;
  insert into public.audit_log (actor_id, branch_id, action, entity) values ('00000000-0000-0000-0000-0000000000a3', '${id.b1}', 'plan.extend', 'student_plans');`);
ok("erasing a staff user who changed a plan succeeds", !(await bad(`delete from auth.users where id = '00000000-0000-0000-0000-0000000000a3'`)));
ok("…and their plan_history and audit rows keep the actor id", (await one(`select count(*)::int c from public.plan_history where actor_id = '00000000-0000-0000-0000-0000000000a3'`)).c === 1 && (await one(`select count(*)::int c from public.audit_log where actor_id = '00000000-0000-0000-0000-0000000000a3'`)).c === 1);


console.log("\nreference data (M0-19)");
ok("the five roles are seeded", (await db.query(`select key from public.roles order by key`)).rows.map((r) => r.key).join() === "admin,invigilator,student,super_admin,teacher");
const defaults = (await db.query(`select skill || '/' || variant as sv, id from public.band_scales where is_default order by 1`)).rows;
ok("one default scale each: listening, academic reading, general reading", defaults.map((d) => d.sv).join() === "listening/n_a,reading/academic,reading/general");
for (const d of defaults) {
  const cov = await one(`select min(raw_min) lo, max(raw_max) hi, sum(raw_max - raw_min + 1)::int cells, count(*) filter (where band is null)::int below,
    (select raw_min from public.band_scale_rows where scale_id = '${d.id}' and band is null) below_from from public.band_scale_rows where scale_id = '${d.id}'`);
  ok(`${d.sv}: covers 0–40 with no gaps, one "Below" row starting at 0`, cov.lo === 0 && cov.hi === 40 && cov.cells === 41 && cov.below === 1 && cov.below_from === 0);
}
const bandFor = async (sv, raw) => (await one(`select r.band from public.band_scale_rows r join public.band_scales s on s.id = r.scale_id
  where s.is_default and s.skill || '/' || s.variant = '${sv}' and ${raw} between r.raw_min and r.raw_max`)).band;
const spot = [
  ["listening/n_a", 31, 7], ["listening/n_a", 32, 7.5], ["listening/n_a", 10, 4], ["listening/n_a", 9, null], ["listening/n_a", 40, 9],
  ["reading/academic", 31, 7], ["reading/academic", 33, 7.5], ["reading/academic", 26, 6], ["reading/academic", 9, null], ["reading/academic", 10, 4],
  ["reading/general", 31, 6], ["reading/general", 36, 7.5], ["reading/general", 39, 8.5], ["reading/general", 40, 9], ["reading/general", 14, null], ["reading/general", 15, 4],
];
ok("spot checks match the institute's charts", (await Promise.all(spot.map(async ([sv, raw, want]) => {
  const got = await bandFor(sv, raw); return (got === null ? null : Number(got)) === want;
}))).every(Boolean));
ok("a second \"Below\" row in one scale rejected", await bad(`insert into public.band_scale_rows (scale_id, raw_min, raw_max, band) values ('${id.scale}', 0, 1, null), ('${id.scale}', 2, 3, null)`));
const scoreIns = (band, below) => `insert into public.attempt_scores (attempt_id, raw_score, band, below_band) values ('${att.practice}', 5, ${band}, ${below})`;
await db.exec(`delete from public.attempt_scores where attempt_id = '${att.practice}'`);
ok("score with both band and below_band rejected", await bad(scoreIns("6.0", "4.0")));
ok("score with neither rejected", await bad(scoreIns("null", "null")));
ok("\"Below 4\" score stored as below_band", !(await bad(scoreIns("null", "4.0"))));
const seedSql = "-- ─── Roles" + readFileSync(`${MIG}/20260915174541_reference_data.sql`, "utf8").split("-- ─── Roles")[1];
const seedBefore = await one(`select (select count(*) from public.roles)::int r, (select count(*) from public.band_scales)::int s, (select count(*) from public.band_scale_rows)::int rw`);
await db.exec(seedSql);
const seedAfter = await one(`select (select count(*) from public.roles)::int r, (select count(*) from public.band_scales)::int s, (select count(*) from public.band_scale_rows)::int rw`);
ok("re-running the seed inserts changes nothing", JSON.stringify(seedBefore) === JSON.stringify(seedAfter), JSON.stringify({ seedBefore, seedAfter }));

console.log("\npolicy hygiene");
const multi = (await db.query(`select tablename, cmd, count(*)::int n from pg_policies where schemaname = 'public' group by 1, 2 having count(*) > 1`)).rows;
ok("exactly one policy per table per command (advisor: multiple_permissive_policies)", multi.length === 0, JSON.stringify(multi));
const allTables = [...tables, ...cohortTables, ...contentTables, ...assessTables, "audit_log"];
let recursionOk = true;
for (const who of Object.keys(id).filter(k => users.some(u => u[0] === k))) for (const t of allTables) {
  const r = await as("authenticated", who, `select count(*) from public.${t}`);
  if (r.error) { recursionOk = false; console.log("    ", who, t, r.error); }
}
ok("every role can query every table without error (no policy recursion)", recursionOk);

console.log("\nmigration 1");
const acl = (await db.query(`select has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') a, has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute') b`)).rows[0];
ok("rls_auto_enable not executable by anon/authenticated", !acl.a && !acl.b);

console.log("\nfinal sweep");
ok("every table in public has RLS enabled", (await rlsFinal()).length === 0, JSON.stringify(await rlsFinal()));
ok("public has exactly 24 tables", (await one(`select count(*)::int c from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`)).c === 24);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
