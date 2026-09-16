import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SKILL_LABEL } from "@/components/student/labels";
import { Banner } from "@/components/ui/banner";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getAnswerKeyMetadata } from "@/lib/queries/admin";

export const metadata: Metadata = {
	title: "Answer key",
	robots: { index: false, follow: false },
};

/**
 * Test identity is loaded from Supabase. Correct answers stay out of the page
 * until the server-only private R2 key reader is implemented.
 */
export default async function AnswerKeyPage({ params }: { params: Promise<{ testId: string }> }) {
	const { testId } = await params;
	await requirePermissionOrRedirect("test:author", `/admin/library/${testId}/answer-key`);
	const test = await getAnswerKeyMetadata(testId);
	if (!test) notFound();

	return (
		<div className="flex flex-col gap-6">
			<Link href="/admin/library" className="font-semibold">
				← Back to the test library
			</Link>
			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{test.title}</h1>
				<p className="m-0 text-ink-2">{SKILL_LABEL[test.skill]} · answer key</p>
			</div>
			<Banner tone="info">
				This test comes from Supabase. Its private answer key will be editable here after the Cloudflare R2 key reader
				is implemented; fixture answers have been removed.
			</Banner>
		</div>
	);
}
