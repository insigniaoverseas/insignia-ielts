/**
 * The stable name a test's audio is cached under in the browser (M2-06,
 * `MVP-1.md` §12).
 *
 * **Pure** — the server builds it (pre-test page, attempt loader) and the
 * browser reads it, so both sides always agree.
 *
 * It names the **owner** as well as the test and version. That is how the
 * owner-bound purge works (D10): on a shared lab PC, everything under another
 * student's prefix is deleted before this student's audio is touched, so
 * student B can never play a copy of a test student A downloaded. The
 * expiring signature is never part of the key, so a fresh signed URL never
 * looks like a new file.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every audio key starts with this. */
export const AUDIO_CACHE_ROOT = "/audio-cache/";

/** The prefix every key owned by `ownerId` starts with. */
export function audioCacheOwnerPrefix(ownerId: string): string {
	if (!UUID.test(ownerId)) throw new Error("ownerId must be a UUID");
	return `${AUDIO_CACHE_ROOT}${ownerId.toLowerCase()}/`;
}

/**
 * @returns `/audio-cache/{ownerId}/{testId}/v{n}`, lower-cased.
 * @throws When an id is not a UUID or the version is not a positive integer —
 *   a malformed key would escape its owner's prefix.
 */
export function audioCacheKey(ownerId: string, testId: string, contentVersion: number): string {
	if (!UUID.test(testId)) throw new Error("testId must be a UUID");
	if (!Number.isSafeInteger(contentVersion) || contentVersion < 1) {
		throw new Error("contentVersion must be a positive integer");
	}
	return `${audioCacheOwnerPrefix(ownerId)}${testId.toLowerCase()}/v${contentVersion}`;
}

/** Whether a cached key belongs to `ownerId`. Anything else is purged. */
export function isOwnedAudioKey(key: string, ownerId: string): boolean {
	// Cache API keys come back as absolute URLs; compare the path only.
	const path = key.startsWith("/") ? key : new URL(key).pathname;
	return path.startsWith(audioCacheOwnerPrefix(ownerId));
}
