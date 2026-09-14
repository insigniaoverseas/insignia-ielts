"use client";

import { cn } from "@/lib/utils";

export type Option = { value: string; label: React.ReactNode };

/**
 * Widget `radio` — one choice from a list (MVP-1 §10: `mcq_single`).
 * Big 56px rows; the whole row is the tap target.
 *
 * Native radio inputs underneath, so arrow keys, screen readers and form
 * semantics all work. The visible circle is drawn from the input's state.
 */
export function SingleChoice({
	name,
	legend,
	options,
	value,
	onChange,
	disabled,
}: {
	/** Unique per question, e.g. `q12`. */
	name: string;
	/** The question prompt. */
	legend: React.ReactNode;
	options: Option[];
	value: string | null;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabled}>
			<legend className="mb-3 p-0 text-passage">{legend}</legend>
			<div className="flex flex-col gap-2">
				{options.map((o) => {
					const checked = value === o.value;
					return (
						<label
							key={o.value}
							className={cn(
								"flex min-h-primary cursor-pointer items-center gap-3 rounded-control border px-4 text-passage",
								checked ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface hover:border-brand",
							)}
						>
							<input
								type="radio"
								name={name}
								value={o.value}
								checked={checked}
								onChange={() => onChange(o.value)}
								className="peer sr-only"
							/>
							<span
								aria-hidden="true"
								className={cn(
									"size-[22px] flex-none rounded-full border-2 border-ink-3 bg-surface",
									"peer-checked:border-[6px] peer-checked:border-brand",
									"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
								)}
							/>
							{o.label}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
