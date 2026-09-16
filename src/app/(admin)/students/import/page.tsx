import type { Metadata } from "next";
import Link from "next/link";
import { CsvImporter } from "@/components/staff/csv-importer";

export const metadata: Metadata = { title: "Import students" };

/**
 * Screen 22b — bulk invite from a CSV (M5-04).
 *
 * The screen is mostly the *preview*, not the upload. An import that silently
 * drops eight rows is worse than one that refuses: the admin believes 28
 * students were invited, and finds out when eight of them cannot log in on the
 * morning of a mock.
 */
export default function ImportStudentsPage() {
	return (
		<div className="flex flex-col gap-6">
			<Link href="/students" className="font-semibold">
				← Back to students
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Import students</h1>
				<p className="m-0 text-ink-2">
					Upload a CSV, check the columns line up, then send the invitations. Nothing is created until you
					press the last button.
				</p>
			</div>

			<CsvImporter />
		</div>
	);
}
