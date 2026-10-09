import "server-only";

import { QUESTION_TYPES } from "@/lib/question-types";
import { readAnswerKeyObject, readContentObject } from "@/lib/r2";
import { answerKeyObjectKey, contentObjectKey } from "@/lib/r2-keys";
import { answerKeySchema } from "@/lib/scoring";
import { testContentSchema } from "@/lib/test-content";
import { getPreviewRow } from "./test-preview";

/** One numbered control on screen 27: the question beside its key. */
export type AnswerKeyRow = {
	/** "7", or "11–13" for a control that answers several numbers. */
	label: string;
	section: number;
	typeName: string;
	/** The prompt as plain text — the editor is a grid, not a test page. */
	prompt: string;
	options: string[] | null;
	answer: string[];
	acceptedVariants: string[];
	marks: number;
	wordLimit: number | null;
};

/** What screen 27 shows, or why it can't. */
export type AnswerKeyView =
	| {
			test: { id: string; title: string; skill: "listening" | "reading"; contentVersion: number };
			rows: AnswerKeyRow[];
			/** Numbered questions with an answer — what "34 of 40 entered" counts. */
			entered: number;
			total: number;
	  }
	| { problem: "missing" | "invalid"; test: { id: string; title: string; skill: "listening" | "reading" } };

/** Sanitised prompt HTML to a single line of text. */
function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Screen 27 — reads a test's private `key.json` and `content.json` through
 * the R2 binding and joins them by question number.
 *
 * Staff-only: the caller must have passed the `test:author` check, and the
 * row itself comes through the signed-in user's RLS-scoped client. The page
 * renders this on the server; it is never handed to a client component and
 * never reachable by a student role (proxy + layout + permission + RLS).
 */
export async function getAnswerKeyView(testId: string): Promise<AnswerKeyView | null> {
	const row = await getPreviewRow(testId);
	if (!row || (row.skill !== "listening" && row.skill !== "reading")) return null;
	const skill: "listening" | "reading" = row.skill === "listening" ? "listening" : "reading";
	const test = { id: row.id, title: row.title, skill };

	const [keyObject, contentObject] = await Promise.all([
		readAnswerKeyObject(answerKeyObjectKey(row.id, row.content_version)),
		readContentObject(contentObjectKey(row.id, row.content_version)),
	]);
	if (!keyObject || !contentObject) return { problem: "missing", test };

	const key = answerKeySchema.safeParse(await keyObject.json());
	const content = testContentSchema.safeParse(await contentObject.json());
	if (!key.success || !content.success) {
		console.error("answer key view:", key.success ? content.error?.message : key.error.message);
		return { problem: "invalid", test };
	}

	const prompts = new Map<number, { prompt: string; options: string[] | null }>();
	for (const section of content.data.sections) {
		for (const group of section.question_groups) {
			for (const question of group.questions) {
				prompts.set(question.n, { prompt: plainText(question.prompt), options: question.options ?? null });
			}
		}
	}

	const rows: AnswerKeyRow[] = [];
	let entered = 0;
	let total = 0;
	for (const section of key.data.sections) {
		for (const group of section.question_groups) {
			for (const question of group.questions) {
				const numbers = question.covers ?? [question.n];
				total += numbers.length;
				if (question.answer.length > 0) entered += numbers.length;
				const shown = prompts.get(question.n);
				rows.push({
					label: numbers.length > 1 ? `${numbers[0]}–${numbers.at(-1)}` : String(question.n),
					section: section.n,
					typeName: QUESTION_TYPES[group.type].officialName,
					prompt: shown?.prompt ?? "",
					options: shown?.options ?? null,
					answer: question.answer,
					acceptedVariants: question.accepted_variants ?? [],
					marks: question.marks,
					wordLimit: group.word_limit ?? null,
				});
			}
		}
	}

	return { test: { ...test, contentVersion: row.content_version }, rows, entered, total };
}
