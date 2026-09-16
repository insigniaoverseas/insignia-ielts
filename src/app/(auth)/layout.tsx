/**
 * The auth shell — login and invitation acceptance.
 *
 * No navigation at all. Someone on these screens has exactly one thing to do,
 * and a nav bar offers them ways to fail at it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
			<main className="flex w-full max-w-[440px] flex-col gap-6">{children}</main>
		</div>
	);
}
