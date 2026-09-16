import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/student/pill-tabs";
import { AssignedTestCard, CompletedAttemptCard } from "@/components/student/test-card";
import { getMyTests, type Scenario } from "@/lib/mock/student";

export const metadata: Metadata = { title: "My Tests" };

const TAB_NOTE: Record<string, string> = {
	todo: "Tests your teacher has set for you.",
	practice: "Take these as many times as you like. They don't count towards your band.",
	done: "Tests you have finished.",
};

/**
 * Screen 04 — My Tests (M2-03).
 *
 * Three tabs, each a plain list of cards. The tab lives in the URL rather than
 * in client state, so the back button behaves and `/tests?tab=done` can be
 * linked to directly (see `PillTabs`).
 *
 * The rule this screen exists to honour: **a locked test says why it is
 * locked.** That reason is resolved server-side by the eligibility resolver
 * (M2-04) and arrives as `AssignedTest.locked.message`.
 */
export default async function MyTestsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string; state?: string }>;
}) {
	const { tab, state } = await searchParams;
	const data = await getMyTests((state as Scenario) ?? "default");
	const active = tab === "practice" || tab === "done" ? tab : "todo";

	return (
		<div className="flex flex-col gap-6">
			<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">My Tests</h1>

			<PillTabs
				basePath="/tests"
				active={active}
				extraParams={{ state }}
				tabs={[
					{ value: "todo", label: `To do · ${data.toDo.length}` },
					{ value: "practice", label: "Practice" },
					{ value: "done", label: `Done · ${data.done.length}` },
				]}
			/>

			<p className="m-0 text-ink-2">{TAB_NOTE[active]}</p>

			<div className="flex flex-col gap-4">
				{active === "todo" &&
					(data.toDo.length > 0 ? (
						data.toDo.map((item) => <AssignedTestCard key={item.assignmentId} item={item} />)
					) : (
						<EmptyState
							icon="📄"
							title="No tests for you right now"
							action={
								<Link
									href="/practice"
									className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
								>
									Practice at Home
								</Link>
							}
						>
							Your teacher will set one soon. Until then you can practise on your own.
						</EmptyState>
					))}

				{active === "practice" &&
					(data.practice.length > 0 ? (
						data.practice.map((item) => <AssignedTestCard key={item.assignmentId} item={item} />)
					) : (
						<EmptyState icon="📄" title="No practice tests yet">
							Your teacher will add some soon.
						</EmptyState>
					))}

				{active === "done" &&
					(data.done.length > 0 ? (
						data.done.map((item) => <CompletedAttemptCard key={item.attemptId} item={item} />)
					) : (
						<EmptyState
							icon="✓"
							title="You haven't finished a test yet"
							action={
								<Link
									href="/tests?tab=todo"
									className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
								>
									See my tests
								</Link>
							}
						>
							When you finish one, your result will appear here.
						</EmptyState>
					))}
			</div>
		</div>
	);
}
