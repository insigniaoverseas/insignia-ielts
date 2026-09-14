"use client";

import { cn } from "@/lib/utils";
import type { Option } from "./radio";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"];

/**
 * Widget `checkbox_n` — choose exactly N (MVP-1 §10: `mcq_multi`).
 *
 * A live counter ("1 of 2 chosen") sits beside the prompt. Once N are chosen,
 * the remaining options are disabled until one is unticked — a student can't
 * accidentally over-answer.
 */
export function ChooseN({
	name,
	legend,
	options,
	value,
	onChange,
	choose,
	disabled,
}: {
	name: string;
	legend: React.ReactNode;
	options: Option[];
	value: string[];
	onChange: (value: string[]) => void;
	/** How many must be chosen. */
	choose: number;
	disabled?: boolean;
}) {
	const full = value.length >= choose;
	const toggle = (v: string) =>
		onChange(value.includes(v) ? value.filter((x) => x !== v) : full ? value : [...value, v]);

	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabled}>
			{/* The legend must be the fieldset's first child to act as its caption. */}
			<legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-4 p-0 text-passage">
				<span>{legend}</span>
				<span className="sr-only">Choose {NUMBER_WORDS[choose] ?? choose}.</span>
				<span
					className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold whitespace-nowrap text-brand"
					aria-live="polite"
				>
					{value.length} of {choose} chosen
				</span>
			</legend>
			<div className="flex flex-col gap-2">
				{options.map((o) => {
					const checked = value.includes(o.value);
					const locked = full && !checked;
					return (
						<label
							key={o.value}
							className={cn(
								"flex min-h-primary items-center gap-3 rounded-control border px-4 text-passage",
								checked ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface",
								locked ? "cursor-not-allowed text-ink-3" : "cursor-pointer hover:border-brand",
							)}
						>
							<input
								type="checkbox"
								name={name}
								value={o.value}
								checked={checked}
								disabled={locked}
								onChange={() => toggle(o.value)}
								className="peer sr-only"
							/>
							<span
								aria-hidden="true"
								className={cn(
									"grid size-[22px] flex-none place-items-center rounded-[4px] border-2 border-ink-3 bg-surface text-small text-transparent",
									"peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white",
									"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
								)}
							>
								✓
							</span>
							{o.label}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
