import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { SoundCheck } from "@/components/student/sound-check";
import { MODE_EXPLAINED, SKILL_LABEL } from "@/components/student/labels";
import { getPreTestBriefing } from "@/lib/queries/student";

export const metadata: Metadata = { title: "Before you start" };

/** One number and its caption in the facts strip. */
function Fact({ value, caption }: { value: string; caption: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-mono text-h1 font-medium">{value}</span>
			<span className="text-small text-ink-2">{caption}</span>
		</div>
	);
}

/**
 * Screen 05 — Pre-test instructions (M2-05).
 *
 * The calmest screen in the product, and the one that prevents most support
 * calls: it states the facts, the four or five rules that actually surprise
 * people, and — for Listening — proves the headphones work *before* a one-shot
 * timer starts.
 *
 * Two ways out, and the safe one is not hidden: "I'm ready — Start" is the
 * single primary action, and "Not now, go back" sits under it as plain text.
 */
export default async function PreTestPage({
	params,
}: {
	params: Promise<{ assignmentId: string }>;
}) {
	const { assignmentId } = await params;
	const briefing = await getPreTestBriefing(assignmentId);
	if (!briefing) notFound();

	const { assignment, rules, soundCheckUrl } = briefing;
	const t = assignment.test;

	return (
		<div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
			<Link href="/home" className="font-semibold">
				← Back to Home
			</Link>

			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">
						{SKILL_LABEL[t.skill]}
					</span>
					<span className="rounded-full border border-line bg-bg px-3 py-1 text-small font-semibold text-ink-2">
						{MODE_EXPLAINED[assignment.mode]}
					</span>
					<DifficultyBadge level={t.difficulty} />
				</div>
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-display">Before you start</h1>
				<p className="m-0 text-h2 text-ink-2">{t.title}</p>
			</div>

			<section className="flex flex-wrap gap-8 rounded-card border border-line bg-surface p-6">
				<Fact value={String(t.questionCount)} caption="questions" />
				<Fact value={`${t.durationMinutes} min`} caption="time allowed" />
				{t.skill === "listening" && (
					<Fact value="4" caption={assignment.mode === "practice" ? "sections" : "sections, played once"} />
				)}
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">How this test works</h2>
				<ul className="m-0 flex list-none flex-col gap-3 p-0">
					{rules.map((rule) => (
						<li key={rule} className="flex items-start gap-3">
							<span className="mt-2 size-1.5 flex-none rounded-full bg-brand" aria-hidden="true" />
							<span>{rule}</span>
						</li>
					))}
				</ul>
			</section>

			{soundCheckUrl && <SoundCheck src={soundCheckUrl} />}

			<div className="flex flex-col gap-3">
				<Link
					href={`/attempt/${assignment.assignmentId}`}
					className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
				>
					I&rsquo;m ready — Start
					<span aria-hidden="true">→</span>
				</Link>
				<Link
					href="/home"
					className="flex min-h-touch items-center justify-center font-semibold text-ink-2 no-underline hover:text-ink hover:no-underline"
				>
					Not now, go back
				</Link>
			</div>
		</div>
	);
}
