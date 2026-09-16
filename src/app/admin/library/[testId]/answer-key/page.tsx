import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AnswerKeyTable } from "@/components/staff/answer-key-table";
import { SKILL_LABEL } from "@/components/student/labels";
import { getAnswerKey } from "@/lib/mock/admin";

export const metadata: Metadata = {
	title: "Answer key",
	// Never index or preview a page that holds the key.
	robots: { index: false, follow: false },
};

/**
 * Screen 27 — Answer key editor (M5-09).
 *
 * The one screen that legitimately puts correct answers in a browser. Three
 * things keep that from becoming the leak `MVP-1.md` §7 is about:
 *
 * 1. it is an admin route, gated by `lib/rbac.ts` and RLS, both server-side;
 * 2. its view-model (`AnswerKeyEditor`) is used by nothing else, so a student
 *    screen cannot accidentally join onto it;
 * 3. the saved key is written to `key.json` in R2 and read back only inside a
 *    Server Action — it is never signed and never in a response body.
 *
 * The save action lands with M5; the table edits local state until then.
 */
export default async function AnswerKeyPage({ params }: { params: Promise<{ testId: string }> }) {
	const { testId } = await params;
	const data = await getAnswerKey(testId);
	if (!data) notFound();

	const missing = data.rows.filter((r) => r.answer.trim() === "").length;

	return (
		<div className="flex flex-col gap-6">
			<Link href="/admin/library" className="font-semibold">
				← Back to the test library
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{data.testTitle}</h1>
				<p className="m-0 text-ink-2">{SKILL_LABEL[data.skill]} · answer key</p>
			</div>

			{missing > 0 && (
				<Banner tone="warning">
					<strong className="font-semibold">
						{missing} {missing === 1 ? "question has" : "questions have"} no answer yet.
					</strong>{" "}
					A published test with a missing key scores every student zero on that question, so this test
					can&rsquo;t be published until they&rsquo;re all filled in.
				</Banner>
			)}

			<AnswerKeyTable initialRows={data.rows} />
		</div>
	);
}
