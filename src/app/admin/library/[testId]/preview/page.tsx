import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerShell } from "@/components/player/player-shell";
import { Banner } from "@/components/ui/banner";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getTestPreview } from "@/lib/queries/test-preview";

export const metadata: Metadata = {
	title: "Preview test",
	robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROBLEM_TEXT = {
	missing_content: "This test's questions are not in storage. Import it again from “Create test”.",
	invalid_content: "This test's stored questions could not be read. Import it again from “Create test”.",
} as const;

/**
 * Staff preview of a test, drawn by the real student player from the test's
 * private `content.json` in R2 — exactly what a student will see, before it is
 * published or assigned.
 *
 * It is not an attempt. No row is created, answers stay in the browser tab,
 * and the clock is only drawn. Answers never reach this page: `content.json`
 * holds none, and `key.json` is not read.
 */
export default async function PreviewTestPage({ params }: { params: Promise<{ testId: string }> }) {
	const { testId } = await params;
	await requirePermissionOrRedirect("test:author", `/admin/library/${testId}/preview`);
	if (!UUID.test(testId)) notFound();
	const preview = await getTestPreview(testId);
	if (!preview) notFound();

	if ("problem" in preview) {
		return (
			<div className="flex flex-col gap-6">
				<Link href="/admin/library" className="font-semibold">
					← Back to the test library
				</Link>
				<Banner tone="warning">{PROBLEM_TEXT[preview.problem]}</Banner>
			</div>
		);
	}

	// Full screen over the admin shell, so it looks the way a student sees it.
	return (
		<div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg">
			<div className="flex flex-wrap items-center justify-between gap-3 bg-night px-4 py-2 text-white md:px-8">
				<span className="font-semibold">Preview — this is what students see. Nothing you enter is saved.</span>
				<Link href="/admin/library" className="font-semibold text-white">
					Close preview
				</Link>
			</div>
			<div className="flex-1">
				<PlayerShell session={preview.session} />
			</div>
		</div>
	);
}
