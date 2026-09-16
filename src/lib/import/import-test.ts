import "server-only";

import { sanitizePassageHtml } from "../security/sanitize.ts";
import {
	R2_BUCKET_NAMES,
	answerKeyObjectKey,
	assetObjectKey,
	audioObjectKey,
	contentObjectKey,
	transcriptObjectKey,
} from "../r2-keys.ts";
import { testUploadSchema } from "./test-upload.schema.ts";
import type { Database } from "../supabase/database.types.ts";
import type { ZodIssue } from "zod";

export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

type TestRow = Database["public"]["Tables"]["tests"]["Insert"];
type BucketName = (typeof R2_BUCKET_NAMES)[keyof typeof R2_BUCKET_NAMES];

export type ImportBinary = {
	bytes: Uint8Array;
	mediaType: string;
};

export type TestImportFiles = Readonly<Record<string, ImportBinary>>;

export type ImportObject = {
	bucket: BucketName;
	key: string;
	body: Uint8Array;
	contentType: string;
	cacheControl: string;
};

export type TestImportDependencies = {
	putObject(object: ImportObject): Promise<void>;
	deleteObject(bucket: BucketName, key: string): Promise<void>;
	createDraft(row: TestRow): Promise<void>;
	newId?: () => string;
};

export class TestImportError extends Error {
	readonly issues: readonly ZodIssue[];

	constructor(message: string, issues: readonly ZodIssue[] = [], options?: ErrorOptions) {
		super(message, options);
		this.name = "TestImportError";
		this.issues = issues;
	}
}

const encoder = new TextEncoder();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jsonObject = (bucket: BucketName, key: string, value: unknown): ImportObject => ({
	bucket,
	key,
	body: encoder.encode(`${JSON.stringify(value, null, 2)}\n`),
	contentType: "application/json; charset=utf-8",
	cacheControl: "private, no-store",
});

function sanitizeHtml(value: string, path: string): string {
	const sanitized = sanitizePassageHtml(value);
	if (!sanitized.trim()) throw new TestImportError(`${path} is empty after sanitising`);
	return sanitized;
}

function imageType(file: string): { extension: "png" | "jpg" | "jpeg" | "webp"; mediaType: string } {
	const extension = file.slice(file.lastIndexOf(".") + 1).toLocaleLowerCase("en") as "png" | "jpg" | "jpeg" | "webp";
	return { extension, mediaType: extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg" };
}

const begins = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
	signature.every((byte, index) => bytes[offset + index] === byte);

function validateImage(file: string, binary: ImportBinary): void {
	if (binary.bytes.length === 0 || binary.bytes.length > MAX_ASSET_BYTES) {
		throw new TestImportError(`${file} must be between 1 byte and ${MAX_ASSET_BYTES} bytes`);
	}
	const expected = imageType(file);
	if (binary.mediaType.toLocaleLowerCase("en") !== expected.mediaType) {
		throw new TestImportError(`${file} has MIME ${binary.mediaType}; expected ${expected.mediaType}`);
	}
	const valid =
		(expected.extension === "png" && begins(binary.bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
		(["jpg", "jpeg"].includes(expected.extension) && begins(binary.bytes, [0xff, 0xd8, 0xff])) ||
		(expected.extension === "webp" && begins(binary.bytes, [0x52, 0x49, 0x46, 0x46]) && begins(binary.bytes, [0x57, 0x45, 0x42, 0x50], 8));
	if (!valid) throw new TestImportError(`${file} does not match its declared image type`);
}

function skipId3(bytes: Uint8Array): number {
	if (!begins(bytes, [0x49, 0x44, 0x33]) || bytes.length < 10) return 0;
	const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
	return 10 + size;
}

/** Reads enough of the first MPEG Layer III frame to enforce the 64 kbps mono contract. */
export function inspectMp3(bytes: Uint8Array): { bitrateKbps: number; mono: boolean } {
	const start = skipId3(bytes);
	for (let offset = start; offset + 3 < bytes.length; offset++) {
		if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) continue;
		const versionBits = (bytes[offset + 1] >> 3) & 0x03;
		const layerBits = (bytes[offset + 1] >> 1) & 0x03;
		const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f;
		if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15) continue;
		const mpeg1 = versionBits === 3;
		const table = mpeg1
			? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
			: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
		return { bitrateKbps: table[bitrateIndex], mono: ((bytes[offset + 3] >> 6) & 0x03) === 3 };
	}
	throw new TestImportError("Audio does not contain a valid MPEG Layer III frame");
}

function validateAudio(file: string, binary: ImportBinary): void {
	if (binary.bytes.length === 0 || binary.bytes.length > MAX_AUDIO_BYTES) {
		throw new TestImportError(`${file} must be between 1 byte and ${MAX_AUDIO_BYTES} bytes`);
	}
	if (binary.mediaType.toLocaleLowerCase("en") !== "audio/mpeg") {
		throw new TestImportError(`${file} has MIME ${binary.mediaType}; expected audio/mpeg`);
	}
	const audio = inspectMp3(binary.bytes);
	if (audio.bitrateKbps > 64) throw new TestImportError(`${file} is ${audio.bitrateKbps} kbps; the maximum is 64 kbps`);
	if (!audio.mono) throw new TestImportError(`${file} must be mono`);
}

function requiredFile(files: TestImportFiles, name: string): ImportBinary {
	const file = files[name];
	if (!file) throw new TestImportError(`Missing referenced file: ${name}`);
	return file;
}

export type PreparedTestImport = {
	testId: string;
	contentVersion: number;
	content: unknown;
	answerKey: unknown;
	transcript: unknown | null;
	objects: readonly ImportObject[];
	row: TestRow;
};

/** Validates, sanitises and performs the one canonical content/key split without writing. */
export function prepareTestImport(
	input: unknown,
	files: TestImportFiles,
	options: { testId: string; actorId: string; contentVersion?: number },
): PreparedTestImport {
	const parsed = testUploadSchema.safeParse(input);
	if (!parsed.success) throw new TestImportError("Test upload validation failed", parsed.error.issues);
	const test = parsed.data;
	const version = options.contentVersion ?? 1;
	if (!UUID_PATTERN.test(options.testId)) throw new TestImportError("testId must be a UUID");
	if (!UUID_PATTERN.test(options.actorId)) throw new TestImportError("actorId must be a UUID");
	if (!Number.isSafeInteger(version) || version < 1) throw new TestImportError("contentVersion must be a positive integer");

	const referenced = new Set([...test.assets.map((asset) => asset.file), ...(test.audio ? [test.audio.file] : [])]);
	for (const supplied of Object.keys(files)) {
		if (!referenced.has(supplied)) throw new TestImportError(`Unreferenced file supplied: ${supplied}`);
	}

	const assetObjects = test.assets.map((asset, index) => {
		const binary = requiredFile(files, asset.file);
		validateImage(asset.file, binary);
		const { extension, mediaType } = imageType(asset.file);
		return {
			metadata: { id: asset.id, alt: asset.alt, ordinal: index + 1 },
			object: {
				bucket: R2_BUCKET_NAMES.content,
				key: assetObjectKey(options.testId, version, index + 1, extension),
				body: binary.bytes,
				contentType: mediaType,
				cacheControl: "private, max-age=31536000, immutable",
			} satisfies ImportObject,
		};
	});

	let audioObject: ImportObject | null = null;
	if (test.audio) {
		const binary = requiredFile(files, test.audio.file);
		validateAudio(test.audio.file, binary);
		audioObject = {
			bucket: R2_BUCKET_NAMES.audio,
			key: audioObjectKey(options.testId, version),
			body: binary.bytes,
			contentType: "audio/mpeg",
			cacheControl: "private, max-age=31536000, immutable",
		};
	}

	const contentSections = test.sections.map((section, sectionIndex) => ({
		...section,
		passages: section.passages.map((passage, passageIndex) => ({
			...passage,
			html: sanitizeHtml(passage.html, `sections.${sectionIndex}.passages.${passageIndex}.html`),
		})),
		question_groups: section.question_groups.map((group, groupIndex) => {
			return {
				type: group.type,
				widget: group.widget,
				...(group.container === undefined ? {} : { container: group.container }),
				instructions: sanitizeHtml(group.instructions, `sections.${sectionIndex}.question_groups.${groupIndex}.instructions`),
				...(group.word_bank === undefined ? {} : { word_bank: group.word_bank }),
				...(group.option_bank === undefined ? {} : { option_bank: group.option_bank }),
				...(group.choose === undefined ? {} : { choose: group.choose }),
				...(group.asset_id === undefined ? {} : { asset_id: group.asset_id }),
				questions: group.questions.map((question, questionIndex) => {
					return {
						n: question.n,
						...(question.covers === undefined ? {} : { covers: question.covers }),
						prompt: sanitizeHtml(question.prompt, `sections.${sectionIndex}.question_groups.${groupIndex}.questions.${questionIndex}.prompt`),
						...(question.options === undefined ? {} : { options: question.options }),
					};
				}),
			};
		}),
	}));

	const keySections = test.sections.map((section) => ({
		n: section.n,
		question_groups: section.question_groups.map((group) => ({
			type: group.type,
			...(group.word_limit === undefined ? {} : { word_limit: group.word_limit }),
			questions: group.questions.map((question) => ({
				n: question.n,
				...(question.covers === undefined ? {} : { covers: question.covers }),
				marks: question.marks,
				answer: question.answer,
				...(question.accepted_variants === undefined ? {} : { accepted_variants: question.accepted_variants }),
			})),
		})),
	}));

	const content = {
		schema_version: test.schema_version,
		test_id: options.testId,
		content_version: version,
		title: test.title,
		skill: test.skill,
		variant: test.variant,
		difficulty: test.difficulty,
		duration_seconds: test.duration_seconds,
		transfer_seconds: test.transfer_seconds,
		kind: test.kind,
		...(test.practice_question_type === undefined ? {} : { practice_question_type: test.practice_question_type }),
		tags: test.tags,
		...(test.audio === undefined ? {} : { audio: { duration_seconds: test.audio.duration_seconds } }),
		assets: assetObjects.map(({ metadata }) => metadata),
		sections: contentSections,
	};
	const answerKey = {
		schema_version: test.schema_version,
		test_id: options.testId,
		content_version: version,
		sections: keySections,
	};
	const transcript = test.transcript?.length
		? { schema_version: test.schema_version, test_id: options.testId, content_version: version, cues: test.transcript }
		: null;

	const contentKey = contentObjectKey(options.testId, version);
	const keyKey = answerKeyObjectKey(options.testId, version);
	const transcriptKey = transcript ? transcriptObjectKey(options.testId, version) : null;
	const objects = [
		jsonObject(R2_BUCKET_NAMES.content, contentKey, content),
		jsonObject(R2_BUCKET_NAMES.content, keyKey, answerKey),
		...(transcript && transcriptKey ? [jsonObject(R2_BUCKET_NAMES.content, transcriptKey, transcript)] : []),
		...assetObjects.map(({ object }) => object),
		...(audioObject ? [audioObject] : []),
	];
	const totalQuestions = test.sections.reduce(
		(total, section) => total + section.question_groups.reduce((groupTotal, group) => groupTotal + group.questions.reduce((marks, question) => marks + question.marks, 0), 0),
		0,
	);
	const row: TestRow = {
		id: options.testId,
		title: test.title,
		skill: test.skill,
		variant: test.variant,
		difficulty: test.difficulty,
		kind: test.kind,
		practice_question_type: test.practice_question_type ?? null,
		duration_seconds: test.duration_seconds,
		transfer_seconds: test.transfer_seconds,
		total_questions: totalQuestions,
		section_count: test.sections.length,
		status: "draft",
		tags: test.tags,
		content_version: version,
		r2_content_key: contentKey,
		r2_key_key: keyKey,
		r2_transcript_key: transcriptKey,
		r2_audio_key: audioObject?.key ?? null,
		r2_assets_prefix: assetObjects.length ? `tests/${options.testId.toLowerCase()}/v${version}/assets/` : null,
		audio_duration_seconds: test.audio?.duration_seconds ?? null,
		created_by: options.actorId,
	};
	return { testId: options.testId, contentVersion: version, content, answerKey, transcript, objects, row };
}

/** The single validate → split → upload pipeline used by CLI, admin UI and MCP. */
export async function importTest(
	input: unknown,
	files: TestImportFiles,
	actorId: string,
	dependencies: TestImportDependencies,
): Promise<PreparedTestImport> {
	const prepared = prepareTestImport(input, files, {
		testId: dependencies.newId?.() ?? crypto.randomUUID(),
		actorId,
	});
	const uploaded: ImportObject[] = [];
	try {
		for (const object of prepared.objects) {
			await dependencies.putObject(object);
			uploaded.push(object);
		}
		await dependencies.createDraft(prepared.row);
		return prepared;
	} catch (cause) {
		await Promise.allSettled(uploaded.reverse().map((object) => dependencies.deleteObject(object.bucket, object.key)));
		throw new TestImportError("Test import failed; rollback was attempted for every uploaded object", [], { cause });
	}
}
