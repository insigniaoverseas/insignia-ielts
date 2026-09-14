"use client";

import { cn } from "@/lib/utils";

/**
 * Widget `dropdown_bank` — one row of a matching question: the item on the
 * left, a dropdown drawing from a shared option bank on the right
 * (MVP-1 §10: `matching`, `matching_information`, `matching_headings`,
 * `matching_features`, `matching_sentence_endings`).
 *
 * Render one per item; they share the same `options`. A native `<select>`,
 * so it works with every keyboard, screen reader and phone picker.
 */
export function MatchingSelect({
	id,
	label,
	options,
	value,
	onChange,
	placeholder = "Choose",
	disabled,
}: {
	id: string;
	/** The item being matched, e.g. "31. Dr Malik". */
	label: React.ReactNode;
	/** The shared bank, e.g. ["A — Rainfall", "B — Statistics"]. */
	options: { value: string; label: string }[];
	value: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	const chosen = value != null && value !== "";
	return (
		<div className="flex flex-wrap items-center gap-3">
			<label htmlFor={id} className="min-w-30 flex-1 text-passage">
				{label}
			</label>
			<select
				id={id}
				value={value ?? ""}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				className={cn(
					"h-primary min-w-45 rounded-control border px-3 text-passage",
					chosen ? "border-brand bg-brand-soft font-semibold text-ink" : "border-line bg-surface text-ink-3",
				)}
			>
				<option value="" disabled>
					{placeholder}
				</option>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</div>
	);
}
