// Fails if anything server-only reached the browser bundle (MVP-1 §8, §16;
// CLAUDE.md non-negotiables 2, 3, 10). Run after `next build`:
//
//   npm run check:bundle
//
// Scans .next/static — everything Next ships to browsers. A match means a
// server module (scoring, the answer key, the secret key) was imported into
// client code somewhere.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";

/** Patterns that must never appear in client code, and why. */
const FORBIDDEN = [
	[/accepted_variants/, "answer-key field (key.json content)"],
	[/key\.json/, "answer-key file path"],
	[/r2_key_key/, "answer-key path column"],
	[/\bbandFor\b|\bscoreAttempt\b/, "scoring function (lib/scoring.ts is server-only)"],
	[/sb_secret_/, "Supabase secret key value"],
	[/SUPABASE_SECRET_KEY/, "Supabase secret key variable"],
	[/R2_SECRET_ACCESS_KEY/, "R2 secret access-key variable"],
	[/R2_ACCESS_KEY_ID/, "R2 access-key variable"],
];

function* files(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* files(path);
		else if (/\.(js|mjs|cjs|json|map|html|txt)$/.test(name)) yield path;
	}
}

let scanned = 0;
const hits = [];
try {
	for (const file of files(ROOT)) {
		scanned++;
		const text = readFileSync(file, "utf8");
		for (const [pattern, why] of FORBIDDEN) {
			if (pattern.test(text)) hits.push(`${file}: ${why} (${pattern})`);
		}
	}
} catch (error) {
	if (error.code === "ENOENT") {
		console.error(`${ROOT} not found — run \`next build\` first.`);
		process.exit(2);
	}
	throw error;
}

if (hits.length) {
	console.error(`✗ Server-only code reached the browser bundle:\n  ${hits.join("\n  ")}`);
	process.exit(1);
}
console.log(`✓ ${scanned} client files scanned; nothing server-only found.`);
