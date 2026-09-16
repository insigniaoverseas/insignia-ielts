#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { importTest, TestImportError } from "../src/lib/import/import-test.ts";
import { testUploadSchema } from "../src/lib/import/test-upload.schema.ts";
import { parsePermissions } from "../src/lib/permissions.ts";
import type { TestImportFiles, ImportObject } from "../src/lib/import/import-test.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

const usage = `Usage: npm run import:test -- <test.json> --actor <user-uuid> [--dry-run]

Validates local JSON and referenced media, sanitises authored HTML, and shows
the generated draft. Without --dry-run it uploads to remote R2 and inserts the
Supabase catalogue + audit rows. Cloudflare CLI login and .dev.vars are needed.`;

function parseArguments(argv: readonly string[]) {
	if (argv.includes("--help") || argv.includes("-h")) return { help: true } as const;
	const positional = argv.filter((arg, index) => !arg.startsWith("--") && argv[index - 1] !== "--actor");
	const actorIndex = argv.indexOf("--actor");
	if (positional.length !== 1 || actorIndex < 0 || !argv[actorIndex + 1]) throw new Error(usage);
	return { help: false, jsonPath: resolve(positional[0]), actorId: argv[actorIndex + 1], dryRun: argv.includes("--dry-run") } as const;
}

function mediaType(file: string): string {
	const extension = file.slice(file.lastIndexOf(".") + 1).toLocaleLowerCase("en");
	if (extension === "mp3") return "audio/mpeg";
	if (extension === "png") return "image/png";
	if (extension === "webp") return "image/webp";
	if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
	throw new Error(`Unsupported file type: ${file}`);
}

function loadFiles(input: unknown, baseDirectory: string): TestImportFiles {
	const parsed = testUploadSchema.safeParse(input);
	if (!parsed.success) throw new TestImportError("Test upload validation failed", parsed.error.issues);
	const test = parsed.data;
	const names = [...test.assets.map((asset) => asset.file), ...(test.audio ? [test.audio.file] : [])];
	return Object.fromEntries(
		names.map((name) => {
			const path = resolve(baseDirectory, name);
			if (dirname(path) !== baseDirectory) throw new Error(`Referenced file escaped the JSON directory: ${name}`);
			return [name, { bytes: new Uint8Array(readFileSync(path)), mediaType: mediaType(name) }];
		}),
	);
}

function runWrangler(args: readonly string[], input?: Uint8Array): void {
	const executable = process.platform === "win32" ? "npx.cmd" : "npx";
	const result = spawnSync(executable, ["wrangler", ...args], {
		cwd: process.cwd(),
		input,
		encoding: input ? undefined : "utf8",
		stdio: input ? ["pipe", "inherit", "inherit"] : "inherit",
	});
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`wrangler ${args.slice(0, 3).join(" ")} failed with exit ${result.status}`);
}

function loadLocalEnvironment(): void {
	const path = resolve(".dev.vars");
	if (!existsSync(path)) throw new Error(".dev.vars is missing; copy .dev.vars.example and fill the Supabase values");
	process.loadEnvFile(path);
}

async function main() {
	const args = parseArguments(process.argv.slice(2));
	if (args.help) {
		console.log(usage);
		return;
	}
	const input = JSON.parse(readFileSync(args.jsonPath, "utf8"));
	const files = loadFiles(input, dirname(args.jsonPath));

	if (!args.dryRun) loadLocalEnvironment();
	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SECRET_KEY;
	const client = !args.dryRun && supabaseUrl && supabaseKey
		? createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
		: null;

	if (!args.dryRun && !client) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required in .dev.vars");
	if (client) {
		const { data: actor, error } = await client
			.from("users")
			.select("id, branch_id, status, roles ( permissions )")
			.eq("id", args.actorId)
			.maybeSingle();
		if (error) throw error;
		const permissions = parsePermissions(actor?.roles?.permissions);
		if (!actor || actor.status !== "active" || !permissions["test:author"]) {
			throw new Error("The --actor user must be active and hold test:author");
		}
	}

	const prepared = await importTest(input, files, args.actorId, {
		newId: () => crypto.randomUUID(),
		async putObject(object: ImportObject) {
			if (args.dryRun) return;
			runWrangler(
				["r2", "object", "put", `${object.bucket}/${object.key}`, "--remote", "--pipe", "--content-type", object.contentType, "--cache-control", object.cacheControl],
				object.body,
			);
		},
		async deleteObject(bucket, key) {
			if (!args.dryRun) runWrangler(["r2", "object", "delete", `${bucket}/${key}`, "--remote", "--force"]);
		},
		async createDraft(row) {
			if (!client) return;
			const { data: actor, error: actorError } = await client.from("users").select("branch_id").eq("id", args.actorId).single();
			if (actorError) throw actorError;
			const { error: testError } = await client.from("tests").insert(row);
			if (testError) throw testError;
			const { error: auditError } = await client.from("audit_log").insert({
				actor_id: args.actorId,
				branch_id: actor.branch_id,
				action: "test.import",
				entity: "test",
				entity_id: row.id,
				meta: { title: row.title, content_version: row.content_version, source: "cli" },
			});
			if (auditError) {
				await client.from("tests").delete().eq("id", row.id!);
				throw auditError;
			}
		},
	});

	console.log(`${args.dryRun ? "Validated" : "Imported"} ${basename(args.jsonPath)} as draft ${prepared.testId}`);
	console.log(`${prepared.objects.length} private object(s), content version ${prepared.contentVersion}`);
}

main().catch((error: unknown) => {
	if (error instanceof TestImportError && error.issues.length) {
		for (const issue of error.issues) console.error(`${issue.path.join(".") || "<root>"}: ${issue.message}`);
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
