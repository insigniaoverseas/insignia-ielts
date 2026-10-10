"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { getMyReviewAction } from "@/lib/actions/attempts";
import type { MistakesLoad, StudentBundle } from "@/lib/view-models/student";

/*
 * The student's data for all four tabs, loaded once by the student layout.
 *
 * The layout renders on the first page load and is *not* re-rendered when the
 * student moves between Home, My Tests, Progress and Profile — Next.js only
 * swaps the page. So the tabs read from here and switching between them costs
 * no database round trip at all.
 *
 * The bundle is rebuilt whenever the layout renders again:
 *   - after any Server Action that calls `revalidatePath` (every save);
 *   - by `AutoRefresh` (`components/auto-refresh.tsx`), while the student is
 *     using the app.
 */

/** One attempt's mistakes review: the request, and its answer once it lands. */
export type ReviewEntry = {
	promise: Promise<ReviewResult>;
	settled: boolean;
	value: ReviewResult;
};

/** The review, `null` when it may not be shown, or `"session_ended"` while sign-in takes over. */
export type ReviewResult = MistakesLoad | null | "session_ended";

type StudentDataValue = {
	bundle: StudentBundle;
	loadReview: (attemptId: string) => ReviewEntry;
};

const StudentData = createContext<StudentDataValue | null>(null);

/**
 * Makes the layout's bundle available to the views below it, and keeps the
 * mistakes reviews the student has loaded.
 *
 * Reviews are not in the bundle — each one reads the answer key and the test
 * from R2, too heavy to repeat for every attempt on every refresh. The result
 * screen asks for its own review in the background instead, and it is kept
 * here. The cache lives in this component's state, so it goes when the
 * student layout unmounts — on log out — and never outlives the student
 * (a shared lab PC). Entries are keyed by the attempt's score too: a re-marked
 * attempt fetches a fresh review.
 */
export function StudentDataProvider({ bundle, children }: { bundle: StudentBundle; children: React.ReactNode }) {
	const [reviews] = useState(() => new Map<string, ReviewEntry>());
	const router = useRouter();

	const loadReview = useCallback(
		(attemptId: string): ReviewEntry => {
			const score = bundle.tests.done.find((item) => item.attemptId === attemptId)?.result?.rawScore ?? "none";
			const key = `${attemptId}:${score}`;
			const cached = reviews.get(key);
			if (cached) return cached;

			const entry: ReviewEntry = { promise: getMyReviewAction(attemptId), settled: false, value: null };
			entry.promise.then(
				(value) => {
					entry.settled = true;
					entry.value = value;
					// Signed in on another device, or this one was revoked: go to
					// sign in (which clears the cookies) rather than show "not found".
					if (value === "session_ended") {
						reviews.delete(key);
						router.replace("/login?ended=1");
					}
				},
				// A failed load is forgotten, so the next ask tries again.
				() => reviews.delete(key),
			);
			reviews.set(key, entry);
			return entry;
		},
		[bundle, reviews, router],
	);

	const value = useMemo(() => ({ bundle, loadReview }), [bundle, loadReview]);
	return <StudentData.Provider value={value}>{children}</StudentData.Provider>;
}

function useStudentDataValue(): StudentDataValue {
	const value = useContext(StudentData);
	if (!value) throw new Error("Student data is only available inside the student layout.");
	return value;
}

/** The student's tab data. Only for components inside the student layout. */
export function useStudentData(): StudentBundle {
	return useStudentDataValue().bundle;
}

/**
 * Starts — or returns the already-started — load of one attempt's mistakes
 * review. Call it early (the result screen does) and the review opens with
 * its data already here.
 */
export function useReviewLoader(): (attemptId: string) => ReviewEntry {
	return useStudentDataValue().loadReview;
}
