"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

/** The fields an invitation needs. `required` drives the per-row checks. */
const FIELDS = [
	{ key: "name", label: "Full name", required: true },
	{ key: "phone", label: "Phone number", required: true },
	{ key: "email", label: "Email", required: true },
	{ key: "batch", label: "Batch", required: false },
	{ key: "planMonths", label: "Plan length (months)", required: false },
] as const;

type ParsedRow = { line: number; cells: string[]; problems: string[] };

/**
 * CSV import (screen 22): upload → map columns → per-row preview → confirm.
 *
 * Parsing happens in the browser purely so the admin sees the preview
 * instantly. **It is not validation** — the real checks run server-side when
 * the invitations are created, because anything a browser decides can be
 * skipped. What this does is stop an admin discovering eight bad rows *after*
 * the import.
 */
export function CsvImporter() {
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<ParsedRow[]>([]);
	const [mapping, setMapping] = useState<Record<string, number>>({});
	const [fileName, setFileName] = useState("");

	/** Split one CSV line, honouring quoted fields containing commas. */
	function splitLine(line: string): string[] {
		const out: string[] = [];
		let cur = "";
		let quoted = false;
		for (let i = 0; i < line.length; i++) {
			const c = line[i];
			if (c === '"') {
				if (quoted && line[i + 1] === '"') {
					cur += '"';
					i++;
				} else quoted = !quoted;
			} else if (c === "," && !quoted) {
				out.push(cur.trim());
				cur = "";
			} else cur += c;
		}
		out.push(cur.trim());
		return out;
	}

	async function onFile(file: File) {
		setFileName(file.name);
		const text = await file.text();
		const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
		if (lines.length === 0) return;

		const head = splitLine(lines[0]);
		setHeaders(head);

		// Guess the mapping from the header names, so the common case needs no clicks.
		const guessed: Record<string, number> = {};
		for (const f of FIELDS) {
			const i = head.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, "").includes(f.key.toLowerCase().replace(/[^a-z]/g, "")));
			if (i >= 0) guessed[f.key] = i;
		}
		setMapping(guessed);
		setRows(lines.slice(1).map((l, i) => ({ line: i + 2, cells: splitLine(l), problems: [] })));
	}

	/** Check one row against the current mapping. Recomputed as mapping changes. */
	function problemsFor(row: ParsedRow): string[] {
		const problems: string[] = [];
		for (const f of FIELDS) {
			const i = mapping[f.key];
			const value = i === undefined ? "" : (row.cells[i] ?? "").trim();
			if (f.required && value === "") {
				problems.push(`${f.label} is missing`);
				continue;
			}
			if (f.key === "phone" && value !== "") {
				const digits = value.replace(/\D/g, "").replace(/^91/, "");
				if (digits.length !== 10) problems.push("Phone number is not 10 digits");
			}
			if (f.key === "email" && value !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
				problems.push("Email doesn't look right");
			}
		}
		return problems;
	}

	const checked = rows.map((r) => ({ ...r, problems: problemsFor(r) }));
	const good = checked.filter((r) => r.problems.length === 0);
	const bad = checked.filter((r) => r.problems.length > 0);

	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
				<span className="grid size-14 place-items-center rounded-full bg-brand-soft text-h1" aria-hidden="true">
					📄
				</span>
				<h2 className="m-0 text-h3">Choose a CSV file</h2>
				<p className="m-0 max-w-[46ch] text-ink-2">
					One row per student. A header row with <strong className="font-semibold">name</strong>,{" "}
					<strong className="font-semibold">phone</strong> and <strong className="font-semibold">email</strong>{" "}
					is enough — batch and plan length are optional.
				</p>
				<label className="cursor-pointer">
					<span className="flex min-h-10 items-center rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-hover">
						Choose file
					</span>
					<input
						type="file"
						accept=".csv,text/csv"
						className="sr-only"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void onFile(f);
						}}
					/>
				</label>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="m-0 text-h3">Which column is which?</h2>
					<span className="font-mono text-small text-ink-2">{fileName}</span>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{FIELDS.map((f) => (
						<label key={f.key} className="flex flex-col gap-1.5">
							<span className="text-small font-semibold">
								{f.label}
								{f.required && <span className="text-danger"> *</span>}
							</span>
							<select
								value={mapping[f.key] ?? ""}
								onChange={(e) =>
									setMapping((m) => {
										const next = { ...m };
										if (e.target.value === "") delete next[f.key];
										else next[f.key] = Number(e.target.value);
										return next;
									})
								}
								className="h-10 rounded-control border border-line bg-surface px-3 text-body"
							>
								<option value="">Not in this file</option>
								{headers.map((h, i) => (
									<option key={`${h}-${i}`} value={i}>
										{h || `Column ${i + 1}`}
									</option>
								))}
							</select>
						</label>
					))}
				</div>
			</section>

			<TableCard>
				<TableToolbar>
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">
							{good.length} {good.length === 1 ? "student" : "students"} ready to invite
						</h2>
						<p className="m-0 text-small text-ink-2">
							{bad.length === 0
								? "Every row looks good."
								: `${bad.length} ${bad.length === 1 ? "row has a problem" : "rows have problems"} and will be skipped. Fix them in the file and upload it again.`}
						</p>
					</div>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							onClick={() => {
								setRows([]);
								setHeaders([]);
								setFileName("");
							}}
						>
							Choose a different file
						</Button>
						<Button disabled={good.length === 0}>Invite {good.length}</Button>
					</div>
				</TableToolbar>

				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead className="w-16 text-right">Row</TableHead>
							{FIELDS.map((f) => (
								<TableHead key={f.key}>{f.label}</TableHead>
							))}
							<TableHead>Check</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{checked.map((r) => (
							<TableRow key={r.line}>
								<TableCell className="text-right font-mono text-ink-2">{r.line}</TableCell>
								{FIELDS.map((f) => {
									const i = mapping[f.key];
									const value = i === undefined ? "" : (r.cells[i] ?? "");
									const broken = r.problems.some((p) => p.startsWith(f.label) || (f.key === "phone" && p.startsWith("Phone")) || (f.key === "email" && p.startsWith("Email")));
									return (
										<TableCell key={f.key} className={broken ? "bg-danger-soft font-semibold text-danger" : ""}>
											{value || <span className="text-ink-3">—</span>}
										</TableCell>
									);
								})}
								<TableCell>
									{r.problems.length === 0 ? (
										<StatusPill status="submitted" size="sm" label="Ready" />
									) : (
										// The reason, in the row, not in a summary at the top.
										<span className="flex flex-col gap-0.5 text-small font-semibold text-danger">
											{r.problems.map((p) => (
												<span key={p}>✕ {p}</span>
											))}
										</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}
