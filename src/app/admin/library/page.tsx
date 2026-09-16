import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { StatusPill } from "@/components/ui/status-pill";
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
import { SKILL_LABEL } from "@/components/student/labels";
import { getTestLibrary } from "@/lib/mock/admin";
import type { Variant } from "@/lib/view-models/student";

export const metadata: Metadata = { title: "Test library" };

const VARIANT_LABEL: Record<Variant, string> = {
	academic: "Academic",
	general: "General Training",
	n_a: "—",
};

/**
 * Screen 26 — Test library (M5-08).
 *
 * The column that matters is **keys**. A published test with a missing key
 * silently scores a student zero on that question, so the count is shown for
 * every row and called out in words the moment it is short — not hidden behind
 * a Draft pill that a tired admin reads as "fine, not live yet".
 */
export default async function LibraryPage({
	searchParams,
}: {
	searchParams: Promise<{ skill?: string; status?: string }>;
}) {
	const { skill, status } = await searchParams;
	let rows = await getTestLibrary();
	if (skill === "listening" || skill === "reading") rows = rows.filter((r) => r.skill === skill);
	if (status === "draft" || status === "published") rows = rows.filter((r) => r.status === status);

	const FILTERS = [
		{ href: "/library", label: "All", on: !skill && !status },
		{ href: "/library?skill=listening", label: "Listening", on: skill === "listening" },
		{ href: "/library?skill=reading", label: "Reading", on: skill === "reading" },
		{ href: "/library?status=draft", label: "Drafts", on: status === "draft" },
		{ href: "/library?status=published", label: "Published", on: status === "published" },
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">Test library</h1>
				<Button asChild>
					<Link href="/admin/library/new">Create test</Link>
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{FILTERS.map((f) => (
					<Link
						key={f.href}
						href={f.href}
						aria-pressed={f.on}
						className={`flex min-h-10 items-center rounded-full border px-4 text-small font-semibold no-underline hover:no-underline ${
							f.on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
						}`}
					>
						{f.label}
					</Link>
				))}
			</div>

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">
						{rows.length} {rows.length === 1 ? "test" : "tests"}
					</span>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Test</TableHead>
							<TableHead>Skill</TableHead>
							<TableHead>Variant</TableHead>
							<TableHead>Difficulty</TableHead>
							<TableHead>Answer keys</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Updated</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((t) => {
							const complete = t.keysEntered >= t.questionCount;
							return (
								<TableRow key={t.id}>
									<TableCell>
										<Link href={`/admin/library/${t.id}/answer-key`} className="font-semibold">
											{t.title}
										</Link>
										{t.tags.length > 0 && (
											<div className="text-small text-ink-2">{t.tags.join(" · ")}</div>
										)}
									</TableCell>
									<TableCell className="text-ink-2">{SKILL_LABEL[t.skill]}</TableCell>
									<TableCell className="text-ink-2">{VARIANT_LABEL[t.variant]}</TableCell>
									<TableCell>
										<DifficultyBadge level={t.difficulty} />
									</TableCell>
									<TableCell>
										<span className={`font-mono ${complete ? "" : "font-semibold text-warning"}`}>
											{t.keysEntered} of {t.questionCount}
										</span>
										{!complete && (
											<div className="text-small text-warning">
												{t.questionCount - t.keysEntered} missing
											</div>
										)}
									</TableCell>
									<TableCell>
										<StatusPill
											status={t.status === "published" ? "active" : t.status === "draft" ? "not_started" : "locked"}
											size="sm"
											label={t.status === "published" ? "Published" : t.status === "draft" ? "Draft" : "Archived"}
										/>
									</TableCell>
									<TableCell className="text-right text-small text-ink-2">{t.updatedLabel}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}
