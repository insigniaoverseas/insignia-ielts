import type { Metadata } from "next";
import Link from "next/link";

import { PRIVACY_NOTICE_VERSION, privacyContactEmail, privacyNotice } from "@/lib/privacy";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Privacy" };

/**
 * The privacy notice (DPDP Act 2023) — public, so it can be read before
 * agreeing, from the link beside the checkbox on the accept-invitation screen.
 */
export default function PrivacyPage() {
	const sections = privacyNotice(privacyContactEmail());
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-6 bg-bg px-4 py-10 md:py-16">
			<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">How we look after your information</h1>
			<p className="m-0 text-ink-2">Insignia IELTS keeps a small amount of information about you so you can take tests here.</p>
			{sections.map((section) => (
				<section key={section.heading} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
					<h2 className="m-0 text-h3">{section.heading}</h2>
					<ul className="m-0 flex flex-col gap-2 pl-5">
						{section.points.map((point) => (
							<li key={point}>{point}</li>
						))}
					</ul>
				</section>
			))}
			<p className="m-0 text-small text-ink-2">Version {PRIVACY_NOTICE_VERSION}</p>
			<Link href="/login" className="font-semibold">
				<Icon name="arrow-left" className="mr-1.5" />
				Go to sign in
			</Link>
		</main>
	);
}
