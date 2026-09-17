"use server";

import { revalidatePath } from "next/cache";

import { importTest, prepareTestImport, TestImportError } from "@/lib/import/import-test";
import { parseR2ObjectKey } from "@/lib/r2-keys";
import { r2ImportTarget } from "@/lib/import/r2-import-target";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import type { TestImportFiles } from "@/lib/import/import-test";

/**
 * Server Actions behind the test library's upload screen (M0-17, screen 26a).
 *
 * Both run `test:author`. Importing a test is the one write in this product
 * that puts an answer key into storage, so it is deliberately a two-step
 * screen: **Check** validates and shows what would be created without writing
 * anything, and **Import** does it. The same `importTest` pipeline serves the
 * CLI and, later, the MCP server — there is one place where a test is split
 * into `content.json` and `key.json`, and this is not a second one.
 */

/** What the Check step reports back, with nothing written. */
export type TestPreview = {
	ok: true;
	title: string;
	skill: string;
	variant: string;
	difficulty: string;
	totalQuestions: number;
	durationLabel: string;
	/**
	 * The R2 keys that would be created, in write order — **excluding the
	 * answer key**, which is described separately. Its path is not a secret,
	 * but this preview renders in the browser and the client-bundle guard
	 * rejects that file name on sight. Keeping it out of the payload keeps the
	 * one rule that matters unambiguous.
	 */
	objects: { key: string; bucket: string; contentType: string; sizeLabel: string }[];
	/** Size of the answer key that would be written privately alongside them. */
	answerKeySizeLabel: string;
	/** Media the JSON names. Present ones are ticked; missing ones block import. */
	files: { name: string; supplied: boolean; sizeLabel: string | null }[];
};

export type TestUploadState =
	| null
	| TestPreview
	| { ok: false; message: string; issues: string[] }
	| { ok: true; imported: true; testId: string; title: string };

/** Human file size. Authors care whether an MP3 is 15 MB or 150 MB. */
function sizeLabel(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Media type from the extension, matching what the importer accepts. */
function mediaType(name: string): string {
	const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	if (extension === "mp3") return "audio/mpeg";
	if (extension === "png") return "image/png";
	if (extension === "webp") return "image/webp";
	if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
	throw new TestImportError(`Unsupported file type: ${name}`);
}

/** Reads the posted JSON and media into the shape `importTest` expects. */
async function readUpload(formData: FormData): Promise<{ input: unknown; files: TestImportFiles }> {
	const raw = String(formData.get("json") ?? "").trim();
	if (!raw) throw new TestImportError("Paste the test JSON, or choose a .json file.");

	let input: unknown;
	try {
		input = JSON.parse(raw);
	} catch (cause) {
		throw new TestImportError(
			`That isn't valid JSON: ${cause instanceof Error ? cause.message : "could not be parsed"}`,
		);
	}

	const files: Record<string, { bytes: Uint8Array; mediaType: string }> = {};
	for (const entry of formData.getAll("media")) {
		if (typeof entry === "string" || entry.size === 0) continue;
		// The *file name* is the join to `audio.file` / `assets[].file` in the
		// JSON — it never becomes part of an R2 key, which the importer builds
		// itself from the test id, version and ordinal.
		files[entry.name] = { bytes: new Uint8Array(await entry.arrayBuffer()), mediaType: mediaType(entry.name) };
	}

	return { input, files };
}

/** Turns any failure into something an author can act on. */
function asFailure(error: unknown): { ok: false; message: string; issues: string[] } {
	if (error instanceof TestImportError) {
		return {
			ok: false,
			message: error.message,
			issues: error.issues.map((issue) => {
				const where = issue.path.length > 0 ? issue.path.join(" → ") : "the test";
				return `${where}: ${issue.message}`;
			}),
		};
	}
	console.error("test import failed:", error);
	return { ok: false, message: "Something went wrong reading that test.", issues: [] };
}

/**
 * Validates an upload and describes exactly what importing it would create.
 *
 * Writes nothing — not to R2, not to Postgres. The test id it shows is a
 * throwaway, because the real one is minted at import.
 */
export async function checkTestAction(_previous: TestUploadState, formData: FormData): Promise<TestUploadState> {
	try {
		const { actor } = await requirePermission("test:author");
		const { input, files } = await readUpload(formData);

		const prepared = prepareTestImport(input, files, {
			testId: crypto.randomUUID(),
			actorId: actor.id,
		});

		// Every referenced file is guaranteed present: `prepareTestImport`
		// throws on a missing one before it reaches here.
		const row = prepared.row as Record<string, unknown>;

		return {
			ok: true,
			title: String(row.title ?? "Untitled"),
			skill: String(row.skill ?? ""),
			variant: String(row.variant ?? ""),
			difficulty: String(row.difficulty ?? ""),
			totalQuestions: Number(row.total_questions ?? 0),
			durationLabel: `${Math.round(Number(row.duration_seconds ?? 0) / 60)} minutes`,
			objects: prepared.objects
				.filter((object) => parseR2ObjectKey(object.key).kind !== "answer_key")
				.map((object) => ({
					key: object.key,
					bucket: object.bucket,
					contentType: object.contentType,
					sizeLabel: sizeLabel(object.body.byteLength),
				})),
			answerKeySizeLabel: sizeLabel(
				prepared.objects.find((object) => parseR2ObjectKey(object.key).kind === "answer_key")?.body.byteLength ?? 0,
			),
			files: Object.entries(files).map(([name, binary]) => ({
				name,
				supplied: true,
				sizeLabel: sizeLabel(binary.bytes.byteLength),
			})),
		};
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to add tests.", issues: [] };
		}
		return asFailure(error);
	}
}

/**
 * Imports the test: uploads every object to R2 and inserts the catalogue row.
 *
 * The test lands as a **draft**. Nothing reaches a student until somebody
 * publishes it, which matters most for the Listening paper whose answers were
 * read off the recording rather than an answer key.
 */
export async function importTestAction(_previous: TestUploadState, formData: FormData): Promise<TestUploadState> {
	try {
		const { actor } = await requirePermission("test:author");
		const { input, files } = await readUpload(formData);

		const prepared = await importTest(input, files, actor.id, r2ImportTarget());
		const row = prepared.row as Record<string, unknown>;
		const title = String(row.title ?? "Untitled");

		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "test.import",
			entity: "test",
			entityId: prepared.testId,
			meta: {
				title,
				skill: String(row.skill ?? ""),
				content_version: prepared.contentVersion,
				objects: prepared.objects.length,
			},
		});

		revalidatePath("/admin/library");
		return { ok: true, imported: true, testId: prepared.testId, title };
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to add tests.", issues: [] };
		}
		return asFailure(error);
	}
}
