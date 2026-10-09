import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, test } from "node:test";

import eslintConfig from "../../eslint.config.mjs";

/**
 * Guards the `overrides` entry in package.json that swaps fast-glob for
 * tinyglobby inside @next/eslint-plugin-next.
 *
 * Why the swap: the plugin pins fast-glob@3.3.1 → micromatch → braces, and
 * every braces release is affected by GHSA-vfj7-8cjw-p6xm with no fix, so CI's
 * `npm audit --audit-level=high` fails. The plugin's only use of fast-glob is
 * `globSync(pattern, { onlyDirectories: true })`, and only when ESLint's
 * `settings.next.rootDir` is set. tinyglobby provides the same call, but its
 * results differ slightly (trailing slashes; a plain folder pattern expands
 * into subfolders). That difference cannot matter while `rootDir` is unset —
 * which is what this test pins. If you need `rootDir`, revisit the override
 * first. Remove both once the plugin drops fast-glob or braces is fixed.
 */
describe("ESLint glob override", () => {
	test("no ESLint config sets settings.next.rootDir", () => {
		const configs = Array.isArray(eslintConfig) ? eslintConfig : [eslintConfig];
		const withRootDir = configs.filter((config) => config?.settings?.next?.rootDir !== undefined);
		assert.deepEqual(withRootDir, [], "settings.next.rootDir is set — re-check the fast-glob override in package.json");
	});

	test("the Next plugin loads and, without rootDir, never globs", () => {
		const require = createRequire(import.meta.url);
		const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs.js");
		assert.deepEqual(getRootDirs({ cwd: "/project", settings: {} }), ["/project"]);
	});
});
