import Link from "next/link";
import { TeacherNav, TeacherNavCompact } from "@/components/staff/teacher-nav";

/**
 * The teacher shell (M6) — screens 14–19, and the invigilator's monitor (17).
 *
 * Same visual language as admin, fewer destinations: a teacher works one batch
 * at a time, so the sidebar is about tests rather than the whole institute.
 *
 * As with the admin shell, this draws navigation and gates nothing. A teacher
 * sees their **own current students** only, and that is enforced by RLS and
 * `lib/rbac.ts` on the server.
 */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col bg-bg">
			<header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-6 border-b border-line bg-surface px-4 md:px-8">
				<Link href="/teacher/dashboard" className="flex items-center gap-3 text-ink no-underline hover:no-underline">
					<span
						className="grid size-8 place-items-center rounded-control bg-night font-bold text-white"
						aria-hidden="true"
					>
						I
					</span>
					<span className="text-h3">Insignia IELTS</span>
					<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">Teacher</span>
				</Link>
			</header>

			<div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
				<div className="lg:w-[260px] lg:flex-none">
					<TeacherNav />
					<TeacherNavCompact />
				</div>
				<main className="min-w-0 flex-1">{children}</main>
			</div>
		</div>
	);
}
