/**
 * Pure R2 key construction and download policy for `lib/r2.ts`.
 *
 * Kept free of credentials and Cloudflare runtime imports so every refusal can
 * be unit-tested without an R2 account. Browser code must not import this file;
 * the client-bundle guard rejects its `key.json` literal if that ever happens.
 */

/** The fixed lifetime for every browser-facing R2 URL (MVP-1 §14). */
export const R2_SIGNED_URL_TTL_SECONDS = 300;

/** The two private buckets provisioned in M0-12 part 1. */
export const R2_BUCKET_NAMES = {
	content: "insignia-ielts-content",
	audio: "insignia-ielts-audio",
} as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_PATTERN = new RegExp(`^${UUID}$`, "i");
const VERSION_PATTERN = /^[1-9]\d*$/;
const TEST_OBJECT_PATTERN = new RegExp(
	`^tests/(${UUID})/v([1-9]\\d*)/(content|key|transcript)\\.json$`,
	"i",
);
const ASSET_PATTERN = new RegExp(
	`^tests/(${UUID})/v([1-9]\\d*)/assets/([1-9]\\d*)\\.(png|jpg|jpeg|webp)$`,
	"i",
);
const AUDIO_PATTERN = new RegExp(`^audio/(${UUID})/v([1-9]\\d*)/test\\.mp3$`, "i");
const ASSET_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

/** Every private object class in the prescribed R2 layout. */
export type R2ObjectKind = "content" | "answer_key" | "transcript" | "asset" | "audio";

/** A parsed, canonical object reference. */
export type R2ObjectReference = {
	key: string;
	kind: R2ObjectKind;
	bucket: keyof typeof R2_BUCKET_NAMES;
	testId: string;
	contentVersion: number;
};

/** Facts the route must resolve server-side before requesting a signed URL. */
export type AttemptObjectAccess = {
	attemptId: string;
	testId: string;
	contentVersion: number;
	status: "in_progress" | "submitted" | "expired" | "voided";
	resultsReleased: boolean;
};

/** A refused R2 key or attempt/object relationship. */
export class R2AccessError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "R2AccessError";
	}
}

function assertUuid(value: string, label: string): void {
	if (!UUID_PATTERN.test(value)) throw new R2AccessError(`${label} must be a UUID`);
}

function assertVersion(value: number): void {
	if (!Number.isSafeInteger(value) || value < 1 || !VERSION_PATTERN.test(String(value))) {
		throw new R2AccessError("contentVersion must be a positive integer");
	}
}

/** Server-generated path for browser-safe test content, read only through the binding. */
export function contentObjectKey(testId: string, contentVersion: number): string {
	assertUuid(testId, "testId");
	assertVersion(contentVersion);
	return `tests/${testId.toLowerCase()}/v${contentVersion}/content.json`;
}

/** Server-generated path for the answer key, which is never signable. */
export function answerKeyObjectKey(testId: string, contentVersion: number): string {
	assertUuid(testId, "testId");
	assertVersion(contentVersion);
	return `tests/${testId.toLowerCase()}/v${contentVersion}/key.json`;
}

/** Server-generated path for a timestamped transcript. */
export function transcriptObjectKey(testId: string, contentVersion: number): string {
	assertUuid(testId, "testId");
	assertVersion(contentVersion);
	return `tests/${testId.toLowerCase()}/v${contentVersion}/transcript.json`;
}

/** Server-generated path for the one MP3 belonging to a Listening test. */
export function audioObjectKey(testId: string, contentVersion: number): string {
	assertUuid(testId, "testId");
	assertVersion(contentVersion);
	return `audio/${testId.toLowerCase()}/v${contentVersion}/test.mp3`;
}

/**
 * Server-generated path for a labelling image.
 *
 * `ordinal` comes from the validated asset's position, not its author-supplied
 * id or file name; therefore no user-controlled string becomes a path segment.
 */
export function assetObjectKey(
	testId: string,
	contentVersion: number,
	ordinal: number,
	extension: "png" | "jpg" | "jpeg" | "webp",
): string {
	assertUuid(testId, "testId");
	assertVersion(contentVersion);
	if (!Number.isSafeInteger(ordinal) || ordinal < 1) throw new R2AccessError("asset ordinal must be a positive integer");
	if (!ASSET_EXTENSIONS.has(extension)) throw new R2AccessError("asset extension is not allowed");
	return `tests/${testId.toLowerCase()}/v${contentVersion}/assets/${ordinal}.${extension}`;
}

/** Parses only keys produced by the prescribed server-side layout. */
export function parseR2ObjectKey(key: string): R2ObjectReference {
	const object = TEST_OBJECT_PATTERN.exec(key);
	if (object) {
		const [, testId, rawVersion, name] = object;
		return {
			key,
			kind: name === "key" ? "answer_key" : (name as "content" | "transcript"),
			bucket: "content",
			testId: testId.toLowerCase(),
			contentVersion: Number(rawVersion),
		};
	}

	const asset = ASSET_PATTERN.exec(key);
	if (asset) {
		return {
			key,
			kind: "asset",
			bucket: "content",
			testId: asset[1].toLowerCase(),
			contentVersion: Number(asset[2]),
		};
	}

	const audio = AUDIO_PATTERN.exec(key);
	if (audio) {
		return {
			key,
			kind: "audio",
			bucket: "audio",
			testId: audio[1].toLowerCase(),
			contentVersion: Number(audio[2]),
		};
	}

	throw new R2AccessError("Object key is outside the server-generated R2 layout");
}

/**
 * Authorises one browser download and returns its parsed object.
 *
 * `content.json` and `key.json` are refused before attempt context or signing
 * credentials are considered. Audio/assets must match the attempt's test and
 * immutable content version. Transcripts additionally require a submitted,
 * released attempt.
 */
export function authorizeSignedDownload(key: string, access?: AttemptObjectAccess): R2ObjectReference {
	const object = parseR2ObjectKey(key);
	if (object.kind === "answer_key") {
		throw new R2AccessError("key.json is never signable");
	}
	if (object.kind === "content") {
		throw new R2AccessError("content.json is binding-read only and never signable");
	}
	if (!access) throw new R2AccessError("Attempt context is required for a signed URL");

	assertUuid(access.attemptId, "attemptId");
	assertUuid(access.testId, "attempt testId");
	assertVersion(access.contentVersion);
	if (object.testId !== access.testId.toLowerCase() || object.contentVersion !== access.contentVersion) {
		throw new R2AccessError("Object does not belong to this attempt's test version");
	}
	if (object.kind === "transcript" && (access.status !== "submitted" || !access.resultsReleased)) {
		throw new R2AccessError("Transcript requires a submitted attempt with released results");
	}
	if (object.kind !== "transcript" && access.status !== "in_progress") {
		throw new R2AccessError("Audio and assets require an in-progress attempt");
	}
	return object;
}
