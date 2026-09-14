import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
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
};

export const viewport: Viewport = {
	themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body>{children}</body>
		</html>
	);
}
