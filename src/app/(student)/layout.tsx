import Link from "next/link";
import { StudentBottomNav, StudentTopNav } from "@/components/student/student-nav";
import { requireRole } from "@/lib/auth/guard";

/**
 * The student app shell (M2-01) — screens 03, 04, 11, 12, 13.
 *
 * Navigation is four labelled destinations and nothing else: a top bar on
 * desktop, a bottom tab bar on the phone. No hamburger, no icon-only controls,
 * nothing more than two taps from Home (`CLAUDE.md`, the design rule).
 *
 * The test player (`/attempt/[id]`) deliberately sits **outside** this layout:
 * during a test there is no navigation to anywhere, only the test.
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
	await requireRole(["student"]);
	return (
		<div className="flex min-h-screen flex-col bg-bg">
			<header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-6 border-b border-line bg-surface px-4 md:min-h-[72px] md:px-8">
				<Link href="/home" className="flex items-center gap-3 text-ink no-underline hover:no-underline">
					<span
						className="grid size-8 place-items-center rounded-control bg-night font-bold text-white"
						aria-hidden="true"
					>
						I
					</span>
					<span className="text-h3">Insignia IELTS</span>
				</Link>
				<StudentTopNav />
			</header>

			<main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-8 md:px-8 md:pt-12 md:pb-16">
				{children}
			</main>

			<StudentBottomNav />
		</div>
	);
}
