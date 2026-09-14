import { cn } from "@/lib/utils";

/**
 * Empty state — a friendly one-line explanation plus exactly one way forward.
 * Every list in the product has one (DESIGN-PROMPT §A5.15).
 *
 * @param icon  A decorative glyph; hidden from screen readers.
 * @param action The one next step — usually a primary button or link.
 *
 * @example
 * <EmptyState icon="📄" title="No tests for you right now"
 *   action={<Link href="/practice">Practice at Home</Link>}>
 *   Your teacher will add one soon. Until then you can practise on your own.
 * </EmptyState>
 */
export function EmptyState({
	icon,
	title,
	children,
	action,
	className,
}: {
	icon?: React.ReactNode;
	title: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-12 text-center",
				className,
			)}
		>
			{icon && (
				<div className="grid size-14 place-items-center rounded-full bg-brand-soft text-h1" aria-hidden="true">
					{icon}
				</div>
			)}
			<h3 className="m-0 text-h3">{title}</h3>
			{children && <p className="m-0 max-w-[40ch] text-ink-2">{children}</p>}
			{action}
		</div>
	);
}
