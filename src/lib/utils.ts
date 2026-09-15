import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught about our design tokens.
 *
 * Without this, `twMerge("text-body text-ink")` returns `"text-ink"` — it can't
 * tell our custom font sizes from colours and silently drops the size. Every
 * token family that shares a prefix with another must be registered here.
 * Keep this list in step with the @theme block in `src/app/globals.css`.
 */
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: ["small", "body", "h3", "h2", "h1", "display", "passage", "hero"],
			color: [
				"white",
				"brand",
				"brand-hover",
				"brand-soft",
				"brand-line",
				"success",
				"success-soft",
				"success-muted",
				"success-bright",
				"warning",
				"warning-soft",
				"warning-line",
				"warning-muted",
				"danger",
				"danger-hover",
				"danger-soft",
				"danger-line",
				"ink",
				"ink-2",
				"ink-3",
				"line",
				"surface",
				"bg",
				"skeleton",
				"night",
				// shadcn/ui aliases (M0-03). Not for application code — but vendored
				// components use them, so merges must resolve them correctly.
				"background",
				"foreground",
				"card",
				"card-foreground",
				"popover",
				"popover-foreground",
				"primary",
				"primary-foreground",
				"secondary",
				"secondary-foreground",
				"muted",
				"muted-foreground",
				"accent",
				"accent-foreground",
				"destructive",
				"destructive-foreground",
				"border",
				"input",
				"ring",
			],
			radius: ["control", "card"],
			shadow: ["soft"],
			spacing: ["touch", "primary"],
		},
	},
});

/**
 * Join class names, resolving Tailwind conflicts so the last one wins.
 *
 * @example cn("h-10 text-ink", isActive && "text-brand") // → "h-10 text-brand"
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
