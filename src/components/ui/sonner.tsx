"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { Icon, type IconName } from "@/components/ui/icon";

/*
 * Toast — sonner, restyled to the tokens (M0-03).
 * Section 13 of "00 Design System.dc.html": a dark --color-ink pill with a
 * bright ✓, 12px radius, the one soft shadow.
 *
 * shadcn's version reads the theme from `next-themes`. We don't use
 * next-themes — dark mode is an opt-in `data-theme` attribute — and the design
 * shows the toast dark in both themes anyway, so the theme is fixed here and
 * the dependency is gone.
 *
 * Icons come from the app's one SVG set (`Icon`), matching the banners.
 *
 * Mount <Toaster /> once, in the root layout. Then: `toast.success("Results released to 42 students.")`.
 * Toasts confirm something that already happened. Anything the user must act on
 * belongs in a Banner, which stays put.
 */

const glyph = (name: IconName, className: string) => <Icon name={name} className={`size-5 ${className}`} strokeWidth={2.5} />;

/** The app's toast region. Bottom-centre, so it clears the student tab bar. */
function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			position="bottom-center"
			offset={96}
			mobileOffset={96}
			icons={{
				success: glyph("check", "text-success-bright"),
				info: glyph("info", "text-white"),
				warning: glyph("warning", "text-warning-line"),
				error: glyph("alert", "text-danger-line"),
			}}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"flex w-full items-center gap-3 rounded-card bg-ink px-5 py-4 text-body text-white shadow-soft sm:w-[380px]",
					title: "text-body font-normal",
					description: "text-small text-ink-3",
					actionButton:
						"ml-auto h-10 shrink-0 cursor-pointer rounded-control bg-white px-4 font-semibold text-ink",
					cancelButton: "h-10 shrink-0 cursor-pointer rounded-control px-4 font-semibold text-ink-3",
					closeButton: "text-ink-3",
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
