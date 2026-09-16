import Link from "next/link";
import { DIFFICULTY_LABEL } from "@/components/ui/difficulty-badge";
import { MODE_EXPLAINED, SKILL_LABEL } from "@/components/student/labels";
import type { AssignedTest } from "@/lib/view-models/student";

/*
 * The "Next up" hero from screen 03 — the single biggest thing on Student Home,
 * and the only place on the student side that uses the dark --night surface.
 * It is dark so that the one action on the screen is unmissable.
 */

/** One number and its caption in the hero's stat row. */
function Stat({ value, caption }: { value: string; caption: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-mono text-h2 font-medium text-white md:text-h1">{value}</span>
			<span className="text-small text-[#a9b7d6]">{caption}</span>
		</div>
	);
}

/** The difficulty chip, redrawn for a dark background. Word plus three bars. */
function DarkDifficulty({ level }: { level: AssignedTest["test"]["difficulty"] }) {
	const filled = { easy: 1, medium: 2, hard: 3 }[level];
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b80] bg-[#b4530938] px-3.5 py-1 text-small font-semibold text-[#fcd9a0]">
			<span className="inline-flex items-end gap-0.5" aria-hidden="true">
				{["h-[7px]", "h-[10px]", "h-[13px]"].map((h, i) => (
					<span
						key={h}
						className={`w-[3px] rounded-[1px] ${h} ${i < filled ? "bg-[#fcd9a0]" : "bg-[#fcd9a04d]"}`}
					/>
				))}
			</span>
			{DIFFICULTY_LABEL[level]}
		</span>
	);
}

/**
 * The one obvious next action on Home. Renders three ways, because a student
 * who *can't* start must be told why rather than shown a dead button:
 *
 * - `test` startable → dark hero with a white "Start Test" button
 * - `test` locked → the same information, plain card, disabled button, reason
 * - `test === null` → "Practice at home" instead, so the screen is never empty
 */
export function NextUpCard({ test }: { test: AssignedTest | null }) {
	if (!test) {
		return (
			<section className="relative overflow-hidden rounded-card bg-night p-6 md:p-10">
				<Dots />
				<div className="relative flex flex-col gap-5">
					<span className="font-mono text-small tracking-[0.1em] text-[#a9b7d6] uppercase">
						Practice at home
					</span>
					<h2 className="m-0 text-h1 text-white md:text-display">No test set for you today</h2>
					<p className="m-0 max-w-[46ch] text-[#dce3f5]">
						Your teacher will add one soon. Until then, pick any practice test — easy, medium or hard.
					</p>
					<Link
						href="/practice"
						className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-white text-h3 font-semibold text-night no-underline hover:bg-brand-soft hover:no-underline"
					>
						Practice at Home<span aria-hidden="true">→</span>
					</Link>
				</div>
			</section>
		);
	}

	const { test: t, mode, deadline, locked } = test;

	if (locked) {
		return (
			<section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-wrap items-center gap-2">
					<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">
						{SKILL_LABEL[t.skill]}
					</span>
					<span className="rounded-full border border-line px-3 py-1 text-small font-semibold text-ink-2">
						{MODE_EXPLAINED[mode]}
					</span>
				</div>
				<h2 className="m-0 text-h2 text-ink-2">{t.title}</h2>
				<p className="m-0 text-ink-2">
					{t.questionCount} questions · {t.durationMinutes} minutes
				</p>
				<div
					className="flex h-primary items-center justify-center rounded-control bg-line text-h3 font-semibold text-ink-3"
					aria-disabled="true"
				>
					Start Test
				</div>
				{/* The reason is the point of this branch: never a dead button with no explanation. */}
				<p className="m-0 flex items-start gap-2 text-danger">
					<span aria-hidden="true">✕</span>
					{locked.message}
				</p>
			</section>
		);
	}

	return (
		<section className="relative overflow-hidden rounded-card bg-night p-6 md:p-10">
			<Dots />
			<div className="relative flex flex-col gap-6 md:gap-8">
				<div className="flex flex-col gap-3.5 md:gap-5">
					<div className="flex items-center gap-2.5">
						<span className="size-2 rounded-full bg-[#7fa0ff]" aria-hidden="true" />
						<span className="font-mono text-small tracking-[0.1em] text-[#a9b7d6] uppercase">Next up</span>
					</div>
					<h2 className="m-0 max-w-[22ch] text-h1 text-white md:text-[2.5rem] md:leading-[3rem]">
						{t.title}
					</h2>
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full bg-white/12 px-3.5 py-1 text-small font-semibold text-white">
							{SKILL_LABEL[t.skill]}
						</span>
						<span className="rounded-full border border-white/30 px-3.5 py-1 text-small font-semibold text-[#dce3f5]">
							{MODE_EXPLAINED[mode]}
						</span>
						<DarkDifficulty level={t.difficulty} />
					</div>
				</div>

				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap gap-6 border-t border-white/16 pt-5 md:gap-8 md:pt-6">
						<Stat value={String(t.questionCount)} caption="questions" />
						<Stat value={`${t.durationMinutes} min`} caption="time allowed" />
						{deadline && <Stat value={deadline.value} caption={deadline.caption} />}
					</div>
					<Link
						href={`/tests/${test.assignmentId}/start`}
						className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-white text-h3 font-semibold text-night no-underline shadow-soft hover:bg-brand-soft hover:no-underline"
					>
						{test.resumeAttemptId ? "Carry on with your test" : "Start Test"}
						<span aria-hidden="true">→</span>
					</Link>
				</div>
			</div>
		</section>
	);
}

/** The faint dot grid on the night surface. Decorative only. */
function Dots() {
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 opacity-45"
			style={{
				backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.14) 1px, transparent 0)",
				backgroundSize: "22px 22px",
			}}
		/>
	);
}
