import type { Metadata } from "next";
import Link from "next/link";

import { UploadTestForm } from "@/components/admin/upload-test-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Add a test" };

/**
 * Screen 26a — add a test (M0-17).
 *
 * Screen 26's "Add test" button has linked here since the library was built;
 * the page did not exist, so the only way a test could enter the catalogue was
 * `npm run import:test` from a terminal with the R2 credentials to hand.
 *
 * Guarded on `test:author`. The screen drives the same `importTest` pipeline as
 * the CLI: one validate → split → upload path, so a test uploaded here and a
 * test uploaded from a terminal cannot end up shaped differently.
 */
export default async function NewTestPage() {
	await requirePermissionOrRedirect("test:author", "/admin/library/new");

	return (
		<div className="flex max-w-[840px] flex-col gap-6">
			<Link href="/admin/library" className="font-semibold">
				← Back to the library
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Add a test</h1>
				<p className="m-0 text-ink-2">
					Upload a test in the authoring format. It arrives as a draft, and nothing reaches a student until you
					publish it.
				</p>
			</div>

			<UploadTestForm />
		</div>
	);
}
