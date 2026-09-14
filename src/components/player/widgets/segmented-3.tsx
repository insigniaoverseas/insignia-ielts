"use client";

import { cn } from "@/lib/utils";

export const TFNG = ["True", "False", "Not Given"] as const;
export const YNNG = ["Yes", "No", "Not Given"] as const;

/**
 * Widget `segmented_3` — three big segmented buttons (MVP-1 §10).
 * Serves both `identifying_information` (True / False / Not Given) and
 * `identifying_views_claims` (Yes / No / Not Given) — pass the option set.
 *
 * Semantically a radio group (one answer, arrow-key navigable), drawn as
 * buttons because that's what the design shows and what's easiest to hit.
 */
export function SegmentedChoice({
	name,
	legend,
	options = TFNG,
	value,
	onChange,
	disabled,
}: {
	name: string;
	legend: React.ReactNode;
	options?: readonly string[];
	value: string | null;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<fieldset className="m-0 flex min-w-0 flex-col border-0 p-0" disabled={disabled}>
			<legend className="mb-3 p-0 text-passage">{legend}</legend>
			<div className="grid grid-cols-3 gap-2">
				{options.map((o) => {
					const checked = value === o;
					return (
						<label key={o} className="relative">
							<input
								type="radio"
								name={name}
								value={o}
								checked={checked}
								onChange={() => onChange(o)}
								className="peer sr-only"
							/>
							<span
								className={cn(
									"grid min-h-primary cursor-pointer place-items-center rounded-control border px-2 text-center font-semibold",
									"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
									checked
										? "border-brand bg-brand text-white"
										: "border-line bg-surface text-ink hover:border-brand",
								)}
							>
								{o}
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
