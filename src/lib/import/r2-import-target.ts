import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { R2_BUCKET_NAMES } from "@/lib/r2-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportObject, TestImportDependencies } from "@/lib/import/import-test";

/**
 * The live target for `importTest` — R2 through the Worker bindings, and the
 * `tests` catalogue row through the secret key.
 *
 * `importTest` takes its side effects as dependencies so the CLI, this admin
 * screen and the future MCP server all drive one pipeline. This module is the
 * browser-facing end of that; `scripts/import-test.ts` supplies its own using
 * the S3 API, because a CLI has no Worker bindings.
 */

/** Resolves a bucket name to the binding that writes it. */
function bucketFor(bucket: string) {
	const env = getCloudflareContext().env;
	if (bucket === R2_BUCKET_NAMES.audio) return env.AUDIO_BUCKET;
	if (bucket === R2_BUCKET_NAMES.content) return env.CONTENT_BUCKET;
	// Unreachable through `prepareTestImport`, which only ever names these two.
	throw new Error(`Unknown bucket: ${bucket}`);
}

/**
 * Bindings-backed dependencies for one import.
 *
 * Writes are plain `put`s: keys are server-generated and versioned, so an
 * import never overwrites an object an in-progress attempt is reading.
 */
export function r2ImportTarget(): TestImportDependencies {
	return {
		async putObject(object: ImportObject) {
			await bucketFor(object.bucket).put(object.key, object.body, {
				httpMetadata: { contentType: object.contentType, cacheControl: object.cacheControl },
			});
		},

		async deleteObject(bucket: string, key: string) {
			await bucketFor(bucket).delete(key);
		},

		async createDraft(row) {
			const { error } = await createAdminClient().from("tests").insert(row);
			// Thrown, not logged: `importTest` catches it and rolls back every
			// object it has already written, which is the whole point of the
			// catalogue row going last.
			if (error) throw new Error(`Catalogue row failed: ${error.message}`);
		},
	};
}
