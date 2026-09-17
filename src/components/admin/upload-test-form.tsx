"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { checkTestAction, importTestAction, type TestUploadState } from "@/lib/actions/tests";

/**
 * Screen 26a — add a test (M0-17).
 *
 * Two buttons on one form, on purpose. **Check** validates the upload and
 * prints every R2 key it would create, writing nothing; **Import** does it.
 * Importing is the one action in this product that puts an answer key into
 * storage, and the split means an author can see exactly what is about to
 * happen while it is still free to be wrong.
 *
 * The JSON can be pasted or chosen as a file. Pasting is what you want while
 * iterating on a test by hand; the file picker is what you want when the
 * converter has just written one.
 */
export function UploadTestForm() {
	const [state, formAction] = useActionState<TestUploadState, FormData>(checkTestAction, null);
	const [importState, importAction] = useActionState<TestUploadState, FormData>(importTestAction, null);
	const [json, setJson] = useState("");
	const [mediaNames, setMediaNames] = useState<string[]>([]);

	const result = importState ?? state;
	const imported = result && "imported" in result ? result : null;
	const preview = result && result.ok && !("imported" in result) ? result : null;
	const failure = result && !result.ok ? result : null;

	if (imported) {
		return (
			<div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<Banner tone="success">
					{imported.title} was imported as a <strong>draft</strong>.
				</Banner>
				<p className="m-0 text-ink-2">
					Nothing reaches a student until it is published. Check the questions and the answer key first.
				</p>
				<div className="flex flex-wrap gap-3">
					<Button asChild>
						<Link href="/admin/library">Back to the library</Link>
					</Button>
					<Button variant="secondary" asChild>
						<Link href={`/admin/library/${imported.testId}/answer-key`}>Review the answer key</Link>
					</Button>
				</div>
			</div>
		);
	}

	/** Reads a chosen .json file into the textarea, so one field is the source. */
	async function loadJsonFile(file: File | undefined) {
		if (!file) return;
		setJson(await file.text());
	}

	return (
		<form className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			{failure && (
				<Banner tone="danger">
					<span className="font-semibold">{failure.message}</span>
					{failure.issues.length > 0 && (
						<ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5">
							{failure.issues.slice(0, 12).map((issue) => (
								<li key={issue}>{issue}</li>
							))}
							{failure.issues.length > 12 && <li>…and {failure.issues.length - 12} more.</li>}
						</ul>
					)}
				</Banner>
			)}

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="jsonFile">Test JSON</Label>
				<input
					id="jsonFile"
					type="file"
					accept=".json,application/json"
					onChange={(event) => loadJsonFile(event.target.files?.[0])}
					className="text-body file:mr-3 file:cursor-pointer file:rounded-control file:border file:border-line file:bg-bg file:px-3 file:py-1.5 file:text-body"
				/>
				<span className="text-small text-ink-2">
					Choose a file, or paste below. The format is in{" "}
					<code className="font-mono text-small">docs/test-authoring.md</code>.
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="json">…or paste it</Label>
				<textarea
					id="json"
					name="json"
					rows={10}
					value={json}
					onChange={(event) => setJson(event.target.value)}
					spellCheck={false}
					placeholder='{ "title": "Listening Test 1", "skill": "listening", … }'
					className="rounded-control border border-line bg-surface px-3 py-2 font-mono text-small"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="media">Audio and images</Label>
				<input
					id="media"
					name="media"
					type="file"
					multiple
					accept=".mp3,.png,.jpg,.jpeg,.webp,audio/mpeg,image/png,image/jpeg,image/webp"
					onChange={(event) => setMediaNames([...(event.target.files ?? [])].map((file) => file.name))}
					className="text-body file:mr-3 file:cursor-pointer file:rounded-control file:border file:border-line file:bg-bg file:px-3 file:py-1.5 file:text-body"
				/>
				<span className="text-small text-ink-2">
					The file names must match <code className="font-mono text-small">audio.file</code> and{" "}
					<code className="font-mono text-small">assets[].file</code> in the JSON. A Reading test needs none.
					Keep the total under 32 MB.
				</span>
				{mediaNames.length > 0 && (
					<ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-small text-ink-2">
						{mediaNames.map((name) => (
							<li key={name}>{name}</li>
						))}
					</ul>
				)}
			</div>

			{preview && <Preview preview={preview} />}

			<div className="flex flex-wrap gap-3">
				<CheckButton formAction={formAction} />
				{preview && <ImportButton formAction={importAction} />}
				<Button variant="secondary" asChild>
					<Link href="/admin/library">Cancel</Link>
				</Button>
			</div>
		</form>
	);
}

/** What importing would create. Shown before anything is written. */
function Preview({ preview }: { preview: Extract<TestUploadState, { objects: unknown }> }) {
	return (
		<div className="flex flex-col gap-4 rounded-card border border-brand-line bg-brand-soft p-5">
			<div className="flex flex-col gap-1">
				<h2 className="m-0 text-h3">Check this before you import</h2>
				<p className="m-0 text-passage">
					<strong>{preview.title}</strong> — {preview.skill} ({preview.variant}), {preview.difficulty},{" "}
					{preview.totalQuestions} questions, {preview.durationLabel}.
				</p>
			</div>

			<div className="flex flex-col gap-1.5">
				<span className="text-small font-semibold">These objects would be written:</span>
				<ul className="m-0 flex list-none flex-col gap-1 p-0">
					{preview.objects.map((object) => (
						<li key={object.key} className="flex flex-wrap items-baseline gap-2 font-mono text-small">
							<span className="font-semibold">{object.key}</span>
							<span className="text-ink-2">
								{object.bucket} · {object.contentType} · {object.sizeLabel}
							</span>
						</li>
					))}
				</ul>
			</div>

			<p className="m-0 text-small text-ink-2">
				The answer key ({preview.answerKeySizeLabel}) is split into its own private object, written server-side.
				It is deliberately not listed above: it is never signed, never put in a response, and never reaches a
				browser. The test is created as a draft.
			</p>
		</div>
	);
}

/** Separate so `useFormStatus` reports on this form, not the page. */
function CheckButton({ formAction }: { formAction: (formData: FormData) => void }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" variant="secondary" formAction={formAction} disabled={pending}>
			{pending ? "Checking…" : "Check it"}
		</Button>
	);
}

/** Only rendered once a check has passed, so import is never the first click. */
function ImportButton({ formAction }: { formAction: (formData: FormData) => void }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" formAction={formAction} disabled={pending}>
			{pending ? "Importing…" : "Import as a draft"}
		</Button>
	);
}
