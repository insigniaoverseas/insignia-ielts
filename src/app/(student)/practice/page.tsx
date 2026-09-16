import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { AssignedTestCard } from "@/components/student/test-card";
import { getPracticeLibrary } from "@/lib/queries/student";

export const metadata: Metadata = { title: "Practice at Home" };

/**
 * Screen 12 — Practice at home (M4-04).
 *
 * The rule is stated once at the top, in one line, rather than repeated on
 * every card: practice does not count towards the band. Each card says how many
 * times the student has already done it, because "have I done this one?" is the
 * only question this list has to answer.
 */
export default async function PracticePage({
	searchParams,
}: {
	searchParams: Promise<{ skill?: string }>;
}) {
	const { skill } = await searchParams;
	const data = await getPracticeLibrary();

	const filter = skill === "listening" || skill === "reading" ? skill : "all";
	const items = filter === "all" ? data.items : data.items.filter((i) => i.test.skill === filter);

	const FILTERS: { value: string; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "listening", label: "Listening" },
		{ value: "reading", label: "Reading" },
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">Practice at Home</h1>
				<p className="m-0 text-ink-2">{data.rulesLine}</p>
			</div>

			<div className="flex flex-wrap gap-2">
				{FILTERS.map((f) => {
					const on = f.value === filter;
					return (
						<Link
							key={f.value}
							href={f.value === "all" ? "/practice" : `/practice?skill=${f.value}`}
							aria-pressed={on}
							className={`flex min-h-touch items-center rounded-full border px-5 font-semibold no-underline hover:no-underline ${
								on
									? "border-brand bg-brand-soft text-brand"
									: "border-line bg-surface text-ink-2 hover:text-ink"
							}`}
						>
							{f.label}
						</Link>
					);
				})}
			</div>

			<div className="flex flex-col gap-4">
				{items.length > 0 ? (
					items.map((item) => (
						<AssignedTestCard
							key={item.assignmentId}
							item={item}
							extraDetail={
								item.timesCompleted === 0
									? "You haven't done this one yet"
									: item.timesCompleted === 1
										? "You've done this once"
										: `You've done this ${item.timesCompleted} times`
							}
						/>
					))
				) : (
					<EmptyState
						icon="📄"
						title="Nothing here yet"
						action={
							<Link
								href="/practice"
								className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
							>
								Show all practice tests
							</Link>
						}
					>
						{filter === "all"
							? "Your teacher will add practice tests soon."
							: `No ${filter} practice tests right now.`}
					</EmptyState>
				)}
			</div>
		</div>
	);
}
