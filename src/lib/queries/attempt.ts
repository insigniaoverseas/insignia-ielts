import "server-only";

import { createClient } from "@/lib/supabase/server";
import { queryFailed, testSummary } from "./shared";
import type { TestSummary } from "@/lib/view-models/student";

/** Supabase-owned metadata for a player route while private R2 content is deferred. */
export type AttemptPlaceholder = {
	referenceId: string;
	test: TestSummary;
	state: string | null;
};

/**
 * Resolves an owned attempt, visible assignment, or published practice test.
 * RLS makes a foreign id indistinguishable from a missing one.
 */
export async function getAttemptPlaceholder(referenceId: string): Promise<AttemptPlaceholder | null> {
	const supabase = await createClient();
	const { data: attempt, error: attemptError } = await supabase
		.from("attempts")
		.select("id, test_id, status")
		.eq("id", referenceId)
		.maybeSingle();
	if (attemptError) queryFailed("attempt", attemptError);

	let testId = attempt?.test_id ?? null;
	if (!testId && referenceId.startsWith("practice:")) testId = referenceId.slice("practice:".length);
	if (!testId) {
		const { data: assignment, error } = await supabase
			.from("assignments")
			.select("test_id")
			.eq("id", referenceId)
			.maybeSingle();
		if (error) queryFailed("attempt assignment", error);
		testId = assignment?.test_id ?? null;
	}
	if (!testId) return null;

	const { data: test, error } = await supabase
		.from("tests")
		.select("id, title, skill, variant, difficulty, total_questions, duration_seconds")
		.eq("id", testId)
		.maybeSingle();
	if (error) queryFailed("attempt test", error);
	if (!test) return null;
	const summary = testSummary(test);
	return summary ? { referenceId, test: summary, state: attempt?.status ?? null } : null;
}
