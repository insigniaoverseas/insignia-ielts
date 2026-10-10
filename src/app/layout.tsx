import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/*
 * Fonts are self-hosted by next/font at build time — no runtime request to
 * Google, which keeps the Content-Security-Policy tight (M0-13).
 * Inter is the only family (DESIGN-PROMPT §A3); IBM Plex Mono is reserved for
 * timers, scores and phone numbers.
 */
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const plexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500"],
	variable: "--font-plex-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: {
		default: "Insignia IELTS",
		template: "%s · Insignia IELTS",
	},
	description: "IELTS Listening and Reading practice tests.",
	// Static files in public/ — Cloudflare serves them without running the Worker.
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "48x48" },
			{ url: "/brand/icon-32.png", type: "image/png", sizes: "32x32" },
		],
		apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
	},
};

export const viewport: Viewport = {
	themeColor: "#b42d7f",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	// Every page renders per request so it can carry this request's CSP nonce
	// (src/proxy.ts). A statically prerendered page would have no nonce, and
	// the strict script policy would block its scripts.
	await connection();

	return (
		<html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
			<body>
				{/* Screen 30 — browser unsupported (M9-04). Hidden unless the
				    browser fails the CSS check in globals.css, which then hides
				    everything else. Works with no JavaScript at all. */}
				<div id="browser-unsupported" className="edge-notice" role="alert">
					<h1>This browser is too old for Insignia IELTS</h1>
					<p>Please open this page in an up-to-date Chrome, Edge, Safari or Firefox.</p>
					<p>On a computer at the institute? Ask your teacher for help.</p>
				</div>
				<noscript>
					<div className="edge-notice edge-notice--strip" role="alert">
						<p>
							<strong>Please turn on JavaScript in this browser.</strong> Tests can&rsquo;t run without it.
						</p>
					</div>
				</noscript>
				{children}
				<Toaster />
			</body>
		</html>
	);
}
