import Link from "next/link";
import { AdminNav, AdminNavCompact } from "@/components/staff/staff-nav";
import { requireRole } from "@/lib/auth/guard";

/**
 * The admin shell (M5-01) — screens 20–27.
 *
 * Denser than the student side, and allowed to be: these are power users doing
 * repetitive work. Same visual language, same tokens, same 48px targets — the
 * difference is information density, not a second design system.
 *
 * This layout repeats the proxy's Admin/Owner role gate. Page permissions and
 * database RLS remain the finer-grained independent gates underneath it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	await requireRole(["super_admin", "admin"]);
	return (
		<div className="flex min-h-screen flex-col bg-bg">
			<header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-6 border-b border-line bg-surface px-4 md:px-8">
				<Link href="/admin/overview" className="flex items-center gap-3 text-ink no-underline hover:no-underline">
					<span
						className="grid size-8 place-items-center rounded-control bg-night font-bold text-white"
						aria-hidden="true"
					>
						I
					</span>
					<span className="text-h3">Insignia IELTS</span>
					<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">Admin</span>
				</Link>
			</header>

			<div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
				<div className="lg:w-[260px] lg:flex-none">
					<AdminNav />
					<AdminNavCompact />
				</div>
				<main className="min-w-0 flex-1">{children}</main>
			</div>
		</div>
	);
}
