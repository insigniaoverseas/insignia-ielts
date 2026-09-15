"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

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
 * Icons are text glyphs, matching the banners: words and simple marks over an
 * icon library, and nothing extra in the bundle.
 *
 * Mount <Toaster /> once, in the root layout. Then: `toast.success("Results released to 42 students.")`.
 * Toasts confirm something that already happened. Anything the user must act on
 * belongs in a Banner, which stays put.
 */

const glyph = (char: string, className: string) => (
	<span aria-hidden="true" className={`font-bold ${className}`}>
		{char}
	</span>
);

/** The app's toast region. Bottom-centre, so it clears the student tab bar. */
function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			position="bottom-center"
			offset={96}
			mobileOffset={96}
			icons={{
				success: glyph("✓", "text-success-bright"),
				info: glyph("i", "text-white"),
				warning: glyph("!", "text-warning-line"),
				error: glyph("✕", "text-danger-line"),
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
