/**
 * Applying screen 27's edits to an answer key (M5-09) — **pure**, so the rules
 * are tested without R2: only answers and accepted spellings change, blanks and
 * duplicates are dropped, an answer is required, and what changed is recorded
 * for the audit trail. The caller re-validates the result with `answerKeySchema`.
 */

type Control = { n: number; covers?: number[]; answer: string[]; accepted_variants?: string[] };
type KeyShape = { sections: { question_groups: { questions: Control[] }[] }[] };

export type KeyEdit = { n: number; answer: string[]; acceptedVariants: string[] };
export type KeyChange = { n: number; from: { answer: string[]; also: string[] }; to: { answer: string[]; also: string[] } };

const clean = (values: readonly string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

/**
 * @returns A **new** key with the edits applied and the list of real changes,
 *   or the sentence to show when an edit can't be applied.
 */
export function applyKeyEdits<K extends KeyShape>(
	key: K,
	edits: readonly KeyEdit[],
): { ok: true; key: K; changes: KeyChange[] } | { ok: false; message: string } {
	const next = structuredClone(key);
	const controls = new Map(next.sections.flatMap((s) => s.question_groups.flatMap((g) => g.questions)).map((q) => [q.n, q]));
	const changes: KeyChange[] = [];
	for (const edit of edits) {
		const control = controls.get(edit.n);
		if (!control) return { ok: false, message: `Question ${edit.n} isn't in this test. Reload the page.` };
		const answer = clean(edit.answer);
		const also = clean(edit.acceptedVariants);
		if (answer.length === 0) return { ok: false, message: `Question ${edit.n} needs an answer.` };
		const from = { answer: [...control.answer], also: [...(control.accepted_variants ?? [])] };
		if (JSON.stringify(from) === JSON.stringify({ answer, also })) continue;
		control.answer = answer;
		if (also.length > 0) control.accepted_variants = also;
		else delete control.accepted_variants;
		changes.push({ n: edit.n, from, to: { answer, also } });
	}
	return { ok: true, key: next, changes };
}
