#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import process from "node:process";

import { QUESTIONS, TEST } from "../Design files/Prioritizing project scope/ielts-data.js";
import { buildLegacyListeningUpload } from "../src/lib/import/legacy-listening.ts";

const usage = `Usage:
  npm run import:legacy-listening -- \\
    --audio /secure/path/listening-mock-2.mp3 \\
    --audio-duration <seconds> \\
    --section-ends <s1,s2,s3,s4> \\
    [--output /secure/path/listening-mock-2.json] [--force]

Add --import --actor <active-author-uuid> [--dry-run] to pass the generated
payload to the canonical import:test CLI. The JSON must live beside the MP3.

The legacy source has all 40 answers but has no audio or timing metadata. This
command requires those real values; it never invents section timestamps.`;

type Arguments = {
	audioPath: string;
	audioDurationSeconds: number;
	sectionEndsSeconds: number[];
	outputPath: string;
	force: boolean;
	shouldImport: boolean;
	dryRun: boolean;
	actorId?: string;
};

function option(argv: readonly string[], name: string): string | undefined {
	const index = argv.indexOf(name);
	return index < 0 ? undefined : argv[index + 1];
}

function parsePositiveInteger(value: string | undefined, label: string): number {
	const parsed = Number(value);
	if (!value || !Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive whole number`);
	return parsed;
}

function parseArguments(argv: readonly string[]): Arguments | { help: true } {
	if (argv.includes("--help") || argv.includes("-h")) return { help: true };
	const valueOptions = new Set(["--audio", "--audio-duration", "--section-ends", "--output", "--actor"]);
	const switches = new Set(["--force", "--import", "--dry-run"]);
	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		if (switches.has(argument)) continue;
		if (!valueOptions.has(argument)) throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
		if (!argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(`${argument} requires a value`);
		index++;
	}
	const audioValue = option(argv, "--audio");
	if (!audioValue) throw new Error(`--audio is required\n\n${usage}`);
	const audioPath = resolve(audioValue);
	if (!existsSync(audioPath) || !statSync(audioPath).isFile()) throw new Error(`Audio file does not exist: ${audioPath}`);
	if (!audioPath.toLocaleLowerCase("en").endsWith(".mp3")) throw new Error("--audio must point to an MP3 file");

	const audioDurationSeconds = parsePositiveInteger(option(argv, "--audio-duration"), "--audio-duration");
	const sectionEndsValue = option(argv, "--section-ends");
	if (!sectionEndsValue) throw new Error(`--section-ends is required\n\n${usage}`);
	const sectionEndsSeconds = sectionEndsValue.split(",").map((value) => parsePositiveInteger(value.trim(), "--section-ends"));
	const outputPath = resolve(option(argv, "--output") ?? `${dirname(audioPath)}/listening-mock-test-2.json`);
	if (dirname(outputPath) !== dirname(audioPath)) {
		throw new Error("The generated JSON must be in the same directory as the MP3 so import:test can resolve it");
	}

	const shouldImport = argv.includes("--import");
	const dryRun = argv.includes("--dry-run");
	const actorId = option(argv, "--actor");
	if (shouldImport && !actorId) throw new Error("--import requires --actor <active-author-uuid>");
	if (!shouldImport && (actorId || dryRun)) throw new Error("--actor and --dry-run are used only with --import");

	return {
		audioPath,
		audioDurationSeconds,
		sectionEndsSeconds,
		outputPath,
		force: argv.includes("--force"),
		shouldImport,
		dryRun,
		...(actorId ? { actorId } : {}),
	};
}

function run(): void {
	const args = parseArguments(process.argv.slice(2));
	if ("help" in args) {
		console.log(usage);
		return;
	}

	const upload = buildLegacyListeningUpload(TEST, QUESTIONS, {
		audioFile: basename(args.audioPath),
		audioDurationSeconds: args.audioDurationSeconds,
		sectionEndsSeconds: args.sectionEndsSeconds,
	});
	const serialized = `${JSON.stringify(upload, null, 2)}\n`;
	if (existsSync(args.outputPath)) {
		const existing = readFileSync(args.outputPath, "utf8");
		if (existing !== serialized && !args.force) {
			throw new Error(`Refusing to overwrite changed file: ${args.outputPath} (pass --force to replace it)`);
		}
		if (existing !== serialized) writeFileSync(args.outputPath, serialized);
	} else {
		writeFileSync(args.outputPath, serialized, { flag: "wx" });
	}
	console.log(`Generated ${args.outputPath} from 40 legacy questions.`);

	if (!args.shouldImport) {
		console.log("Review the answer key and timing values, then rerun with --import and --actor.");
		return;
	}
	const importArguments = [
		"--conditions=react-server",
		resolve("scripts/import-test.ts"),
		args.outputPath,
		"--actor",
		args.actorId!,
		...(args.dryRun ? ["--dry-run"] : []),
	];
	const result = spawnSync(process.execPath, importArguments, { cwd: process.cwd(), stdio: "inherit" });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`Canonical import:test command failed with exit ${result.status}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		run();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
