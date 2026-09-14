"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * PIN input — 4 or 6 large boxes, numeric keypad, masked, with a "Show my PIN"
 * toggle (DESIGN-PROMPT §A5.2).
 *
 * - Typing a digit moves to the next box; Backspace on an empty box moves back.
 * - Pasting "4821" into any box fills them all.
 * - Only digits are accepted.
 *
 * Controlled: pass `value` (a string of 0–length digits) and `onChange`.
 * This component never stores or transmits the PIN — the parent posts it to
 * the auth Route Handler (MVP-1 §9). A PIN is only valid alongside a known
 * device secret; this is just the keypad.
 */
export function PinInput({
	value,
	onChange,
	length = 4,
	label = `Enter your ${length}-digit PIN`,
	error,
	autoFocus,
	disabled,
}: {
	value: string;
	onChange: (pin: string) => void;
	length?: 4 | 6;
	label?: string;
	/** One-sentence error shown below, e.g. "That PIN is not right. 2 tries left." */
	error?: string;
	autoFocus?: boolean;
	disabled?: boolean;
}) {
	const [shown, setShown] = useState(false);
	const refs = useRef<(HTMLInputElement | null)[]>([]);
	const labelId = useId();
	const errorId = useId();
	const digits = Array.from({ length }, (_, i) => value[i] ?? "");

	function focusBox(i: number) {
		refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
	}

	// The PIN is always a contiguous string of digits — no gaps. Writing past the
	// end appends; writing inside it replaces in place.
	function write(at: number, incoming: string) {
		const clean = incoming.replace(/\D/g, "");
		if (!clean) return;
		if (at < value.length && clean.length === 1) {
			onChange(value.slice(0, at) + clean + value.slice(at + 1));
			focusBox(at + 1);
			return;
		}
		const start = Math.min(at, value.length);
		const next = (value.slice(0, start) + clean).slice(0, length);
		onChange(next);
		focusBox(next.length);
	}

	function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Backspace") {
			e.preventDefault();
			// Clear this box (and anything after it); on an empty box, step back one.
			const cut = digits[i] ? i : i - 1;
			if (cut >= 0) {
				onChange(value.slice(0, cut));
				focusBox(cut);
			}
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			focusBox(i - 1);
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			focusBox(i + 1);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<span id={labelId} className="font-semibold">
				{label}
			</span>
			<div
				role="group"
				aria-labelledby={labelId}
				aria-describedby={error ? errorId : undefined}
				// Boxes flex to fit: 6 × 64px would overflow a 390px phone, so they
				// shrink evenly and cap at 64px wide.
				className={cn("flex gap-2 sm:gap-3", length === 6 ? "max-w-[27.75rem]" : "max-w-[18.25rem]")}
			>
				{digits.map((d, i) => (
					<input
						key={i}
						ref={(el) => {
							refs.current[i] = el;
						}}
						type={shown ? "text" : "password"}
						inputMode="numeric"
						autoComplete="off"
						pattern="[0-9]*"
						maxLength={length}
						value={d}
						disabled={disabled}
						autoFocus={autoFocus && i === 0}
						aria-label={`Digit ${i + 1} of ${length}`}
						aria-invalid={error ? true : undefined}
						onChange={(e) => {
							// One keystroke → the last digit typed. Several at once (keyboard
							// autofill) → treat like a paste.
							const typed = e.target.value.replace(/\D/g, "");
							write(i, typed.length > 1 && !d ? typed : typed.slice(-1));
						}}
						onPaste={(e) => {
							e.preventDefault();
							write(i, e.clipboardData.getData("text"));
						}}
						onKeyDown={(e) => handleKeyDown(i, e)}
						onFocus={(e) => {
							// Never let a box be filled out of order: jump to the first empty one.
							if (i > value.length) focusBox(value.length);
							else e.target.select();
						}}
						className={cn(
							// min-w-0 lets 6 boxes fit a padded card on a 390px phone (~292px).
							// Each box stays 64px tall, so the tap target never drops below 48px.
							"h-16 min-w-0 flex-1 basis-0 rounded-control border text-center text-h1 font-bold tabular-nums",
							"bg-surface text-ink disabled:bg-bg disabled:text-ink-3",
							error ? "border-danger bg-danger-soft" : "border-line focus:border-brand",
						)}
					/>
				))}
			</div>
			{error && (
				<span id={errorId} className="flex items-center gap-2 text-danger">
					<span aria-hidden="true">✕</span>
					{error}
				</span>
			)}
			<button
				type="button"
				onClick={() => setShown((s) => !s)}
				className="min-h-touch self-start bg-transparent px-1 font-semibold text-brand hover:text-brand-hover"
			>
				{shown ? "Hide my PIN" : "Show my PIN"}
			</button>
		</div>
	);
}
