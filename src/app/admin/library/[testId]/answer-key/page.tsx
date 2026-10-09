import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TestStatusControl } from "@/components/admin/test-status-control";
import { SKILL_LABEL } from "@/components/student/labels";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { getAnswerKeyView } from "@/lib/queries/answer-key";

export const metadata: Metadata = {
	title: "Answer key",
	robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROBLEM_TEXT = {
	missing: "This test's answer key is not in storage. Import the test again from “Create test”.",
	invalid: "This test's stored answer key could not be read. Import the test again from “Create test”.",
} as const;

/**
 * Screen 27 — the answer key, read from the test's private `key.json` in R2
 * and shown beside each question (M5-09, read half).
 *
 * Server-rendered for staff holding `test:author` only. The key is rendered
 * here as HTML and never handed to a client component — the one client piece,
 * the publish control, receives only the test id and status. Students are
 * stopped at the proxy, the admin layout, this permission check and RLS.
 * Editing is the other half of M5-09: it must write a new content version,
 * never overwrite `key.json` under an attempt in progress.
 */
export default async function AnswerKeyPage({ params }: { params: Promise<{ testId: string }> }) {
	const { testId } = await params;
	const actor = await requirePermissionOrRedirect("test:author", `/admin/library/${testId}/answer-key`);
	if (!UUID.test(testId)) notFound();
	const view = await getAnswerKeyView(testId);
	if (!view) notFound();

	const header = (
		<>
			<Link href="/admin/library" className="font-semibold">
				← Back to the test library
			</Link>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="m-0 text-h1">{view.test.title}</h1>
					<p className="m-0 text-ink-2">{SKILL_LABEL[view.test.skill]} · answer key</p>
				</div>
				<Button asChild variant="secondary">
					<Link href={`/admin/library/${view.test.id}/preview`}>Preview as a student</Link>
				</Button>
			</div>
		</>
	);

	if ("problem" in view) {
		return (
			<div className="flex flex-col gap-6">
				{header}
				<Banner tone="warning">{PROBLEM_TEXT[view.problem]}</Banner>
			</div>
		);
	}

	const complete = view.entered >= view.total;
	return (
		<div className="flex flex-col gap-6">
			{header}
			<div className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1">
					<span className="font-semibold">
						{view.test.status === "published" ? "Published" : view.test.status === "draft" ? "Draft" : "Archived"}
					</span>
					<span className="text-ink-2">
						{view.test.status === "published"
							? "Teachers can assign this test."
							: "Only staff can see it. Check the answers below and the preview, then publish."}
					</span>
				</div>
				{can(actor, "test:publish") && view.test.status !== "archived" && (
					<TestStatusControl testId={view.test.id} status={view.test.status} />
				)}
			</div>
			<Banner tone={complete ? "info" : "warning"}>
				{view.entered} of {view.total} answers entered. Read-only for now — to change an answer, fix the test file and
				import it again.
			</Banner>

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">Version {view.test.contentVersion}</span>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead className="w-16">Q</TableHead>
							<TableHead>Question</TableHead>
							<TableHead>Answer</TableHead>
							<TableHead>Also accepted</TableHead>
							<TableHead className="text-right">Marks</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{view.rows.map((row) => (
							<TableRow key={row.label}>
								<TableCell className="font-mono font-semibold">{row.label}</TableCell>
								<TableCell>
									<div>{row.prompt}</div>
									<div className="text-small text-ink-2">
										{view.test.skill === "listening" ? "Section" : "Passage"} {row.section} · {row.typeName}
										{row.wordLimit !== null &&
											` · max ${row.wordLimit} ${row.wordLimit === 1 ? "word" : "words"}`}
									</div>
								</TableCell>
								<TableCell className="font-semibold">{row.answer.join(" · ")}</TableCell>
								<TableCell className="text-small text-ink-2">
									{row.acceptedVariants.length > 0 ? row.acceptedVariants.join(" · ") : "—"}
								</TableCell>
								<TableCell className="text-right font-mono">{row.marks}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}
