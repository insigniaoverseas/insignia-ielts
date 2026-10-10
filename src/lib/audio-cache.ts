import { isOwnedAudioKey } from "./audio-cache-key.ts";

/**
 * The browser's copy of a test's one audio file (M2-06, `MVP-1.md` §12).
 *
 * Downloaded **in full** on the pre-test screen, before Start creates the
 * attempt and the server clock begins — so a slow lab connection costs
 * waiting time, never test time. The player then plays it from here and never
 * asks the network for it again.
 *
 * Stored in the Cache API under the key from `audio-cache-key.ts`, which names
 * the owner. Every read first deletes whatever belongs to anyone else (D10),
 * and signing out deletes everything.
 *
 * When the Cache API is missing or refuses (a private window, a full disk) the
 * file is kept in memory instead. That survives the move from the pre-test
 * screen into the player — a client-side navigation — but not a reload, where
 * the player falls back to its signed URL.
 */

const CACHE_NAME = "insignia-audio-v1";

/** In-memory fallback, keyed the same way. Lost on reload, by design. */
const memory = new Map<string, Blob>();

async function openCache(): Promise<Cache | null> {
	try {
		if (typeof caches === "undefined") return null;
		return await caches.open(CACHE_NAME);
	} catch {
		return null;
	}
}

/**
 * Deletes every cached file that is not `ownerId`'s.
 *
 * Runs before any read, and on every student page load, so a shared machine
 * never holds one student's audio while another is signed in.
 */
export async function purgeOtherOwners(ownerId: string): Promise<void> {
	for (const key of memory.keys()) if (!isOwnedAudioKey(key, ownerId)) memory.delete(key);
	const cache = await openCache();
	if (!cache) return;
	try {
		const requests = await cache.keys();
		await Promise.all(
			requests.filter((r) => !isOwnedAudioKey(r.url, ownerId)).map((r) => cache.delete(r)),
		);
	} catch {
		// Nothing we can do about a broken cache; the next read will miss.
	}
}

/** Deletes every cached audio file, whoever owns it. Called on sign-out and on the sign-in screen. */
export async function purgeAllAudio(): Promise<void> {
	memory.clear();
	try {
		if (typeof caches !== "undefined") await caches.delete(CACHE_NAME);
	} catch {
		// As above.
	}
}

/** Drops one file — a mock or class test's audio once it has been submitted. */
export async function dropAudio(key: string): Promise<void> {
	memory.delete(key);
	const cache = await openCache();
	try {
		await cache?.delete(key);
	} catch {
		// As above.
	}
}

/** The cached file for `key`, or `null`. Purges other owners first. */
export async function readAudio(ownerId: string, key: string): Promise<Blob | null> {
	await purgeOtherOwners(ownerId);
	if (!isOwnedAudioKey(key, ownerId)) return null;
	const inMemory = memory.get(key);
	if (inMemory) return inMemory;
	const cache = await openCache();
	try {
		const hit = await cache?.match(key);
		return hit ? await hit.blob() : null;
	} catch {
		return null;
	}
}

/**
 * Downloads the whole file from `src` and stores it under `key`.
 *
 * @param onProgress Called with 0–1 as bytes arrive, when the size is known.
 * @throws When the download fails or comes back empty — the caller offers a retry.
 */
export async function downloadAudio(
	ownerId: string,
	key: string,
	src: string,
	onProgress?: (fraction: number) => void,
	signal?: AbortSignal,
): Promise<Blob> {
	if (!isOwnedAudioKey(key, ownerId)) throw new Error("Audio key does not belong to this student");
	const existing = await readAudio(ownerId, key);
	if (existing) {
		onProgress?.(1);
		return existing;
	}

	const response = await fetch(src, { cache: "no-store", signal });
	if (!response.ok || !response.body) throw new Error(`Audio download failed: ${response.status}`);
	const total = Number(response.headers.get("content-length")) || 0;
	const type = response.headers.get("content-type") ?? "audio/mpeg";

	const reader = response.body.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		received += value.byteLength;
		if (total > 0) onProgress?.(Math.min(1, received / total));
	}
	if (received === 0 || (total > 0 && received !== total)) throw new Error("Audio download was incomplete");

	const blob = new Blob(chunks, { type });
	const cache = await openCache();
	let stored = false;
	try {
		if (cache) {
			await cache.put(
				key,
				new Response(blob, { headers: { "content-type": type, "content-length": String(blob.size) } }),
			);
			stored = true;
		}
	} catch {
		// Quota or private mode: fall through to memory.
	}
	if (!stored) memory.set(key, blob);
	onProgress?.(1);
	return blob;
}
