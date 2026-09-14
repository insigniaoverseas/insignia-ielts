"use client";

import { cn } from "@/lib/utils";

/**
 * Widget `text_gap` — the one text-entry widget behind every completion type
 * and short answer (MVP-1 §10). Two shapes:
 *
 * - `TextAnswer` — prompt above, a full-width input below, the word-limit hint
 *   under it. Short answer, sentence completion, form/note/table rows.
 * - `GapInput`   — a small input *inside* a sentence or paragraph, with the
 *   question number after it. Summary and note completion.
 *
 * Neither knows the answer or the word limit's consequence. Word limits are
 * enforced by server-side scoring (over the limit scores zero); the hint only
 * tells the student the rule.
 */
export function TextAnswer({
	id,
	number,
	prompt,
	value,
	onChange,
	hint = "Write no more than two words.",
	disabled,
}: {
	id: string;
	number: number;
	prompt: React.ReactNode;
	value: string;
	onChange: (value: string) => void;
	hint?: string;
	disabled?: boolean;
}) {
	const hintId = `${id}-hint`;
	return (
		<div className="flex flex-col gap-3">
			<label htmlFor={id} className="text-passage">
				<strong className="font-semibold">{number}.</strong> {prompt}
			</label>
			<input
				id={id}
				type="text"
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				aria-describedby={hint ? hintId : undefined}
				autoComplete="off"
				autoCapitalize="off"
				spellCheck={false}
				className="h-primary rounded-control border border-line bg-surface px-4 text-passage focus:border-brand disabled:bg-bg disabled:text-ink-3"
			/>
			{hint && (
				<span id={hintId} className="text-ink-2">
					{hint}
				</span>
			)}
		</div>
	);
}

/**
 * An inline gap. Put it inside a paragraph with `leading-[2.2]` so the
 * 48px-tall inputs don't collide between lines.
 *
 * @example
 * <p className="text-passage leading-[2.2]">
 *   The first city apiary opened in <GapInput number={36} … /> and was funded by…
 * </p>
 */
export function GapInput({
	number,
	value,
	onChange,
	width = "w-28",
	disabled,
}: {
	number: number;
	value: string;
	onChange: (value: string) => void;
	/** A Tailwind width class — size the gap to the expected answer. */
	width?: string;
	disabled?: boolean;
}) {
	const filled = value.trim() !== "";
	return (
		<>
			<input
				type="text"
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				aria-label={`Question ${number}`}
				placeholder={String(number)}
				autoComplete="off"
				autoCapitalize="off"
				spellCheck={false}
				className={cn(
					"h-12 rounded-control border px-3 align-middle text-passage placeholder:text-ink-3",
					filled ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface",
					width,
				)}
			/>{" "}
			<strong className="font-semibold" aria-hidden="true">
				({number})
			</strong>
		</>
	);
}
