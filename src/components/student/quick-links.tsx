import Link from "next/link";

/** One row in the quick-links list: icon, label, one line of context, chevron. */
export type QuickLink = { href: string; icon: string; label: string; detail: string };

/**
 * The three quiet destinations under the "Next up" card on Home (screen 03):
 * My Tests, My Progress, My Mistakes.
 *
 * Each row states *why* you'd tap it ("8 to look at"), so the screen answers
 * "what should I do next?" without the student opening anything to find out.
 */
export function QuickLinks({ links }: { links: QuickLink[] }) {
	return (
		<nav aria-label="Shortcuts" className="overflow-hidden rounded-card border border-line bg-surface">
			{links.map((link, i) => (
				<Link
					key={link.href}
					href={link.href}
					className={`flex min-h-[72px] items-center gap-4 px-4 text-ink no-underline hover:bg-bg hover:no-underline md:min-h-20 md:px-6 ${
						i < links.length - 1 ? "border-b border-line" : ""
					}`}
				>
					<span
						className="grid size-10 flex-none place-items-center rounded-control bg-brand-soft text-h3"
						aria-hidden="true"
					>
						{link.icon}
					</span>
					<span className="flex flex-1 flex-col gap-0.5">
						<span className="text-h3">{link.label}</span>
						<span className="text-small text-ink-2">{link.detail}</span>
					</span>
					<span className="text-h3 text-ink-3" aria-hidden="true">
						→
					</span>
				</Link>
			))}
		</nav>
	);
}
