import Link from "next/link";

/*
 * Temporary landing page. Replaced by the student home screen (03) in M2-02,
 * once login exists (M1).
 */
export default function Home() {
	return (
		<main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-6 px-6 py-16">
			<div className="grid size-12 place-items-center rounded-card bg-brand text-h2 font-bold text-white">I</div>
			<h1 className="m-0 text-h1">Insignia IELTS</h1>
			<p className="m-0 text-ink-2">
				The practice-test platform is being built. Nothing here is ready for students yet.
			</p>
			<Link href="/dev/components" className="font-semibold">
				See the design system →
			</Link>
		</main>
	);
}
