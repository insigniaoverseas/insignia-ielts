"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { startAttemptAction } from "@/lib/actions/attempts";
import { downloadAudio } from "@/lib/audio-cache";

/** The audio to fetch before Start, for a Listening test. */
export type StartAudio = { src: string; cacheKey: string; ownerId: string };

type AudioState = { status: "loading"; fraction: number | null } | { status: "ready" } | { status: "failed" };

/**
 * The pre-test screen's one primary action (M2-05 → M2-07). Starting is a
 * write — it creates the attempt and starts the server clock — so it is a
 * form post, never a link a browser might prefetch.
 *
 * **Listening waits for its audio** (M2-06, `MVP-1.md` §12). The whole file
 * downloads while the student reads the rules, and Start stays unavailable
 * until it is in, so a slow connection costs waiting time, never test time.
 * A resumed test is not held back: its clock is already running, and the
 * player fetches the audio itself if this browser does not have it.
 */
export function StartTestForm({ refId, resume, audio }: { refId: string; resume: boolean; audio?: StartAudio | null }) {
	const [state, action, pending] = useActionState(startAttemptAction, null);
	const waitForAudio = Boolean(audio) && !resume;
	const [audioState, setAudioState] = useState<AudioState>(
		waitForAudio ? { status: "loading", fraction: null } : { status: "ready" },
	);

	/** Downloads the file. The caller has already shown "loading". */
	const fetchAudio = useCallback(
		(signal?: AbortSignal) => {
			if (!audio) return;
			downloadAudio(audio.ownerId, audio.cacheKey, audio.src, (fraction) => setAudioState({ status: "loading", fraction }), signal)
				.then(() => !signal?.aborted && setAudioState({ status: "ready" }))
				.catch(() => !signal?.aborted && setAudioState({ status: "failed" }));
		},
		[audio],
	);

	useEffect(() => {
		if (!waitForAudio) return;
		const controller = new AbortController();
		fetchAudio(controller.signal);
		return () => controller.abort();
	}, [waitForAudio, fetchAudio]);

	const ready = audioState.status === "ready";

	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="ref" value={refId} />

			{waitForAudio && audioState.status === "loading" && (
				<div className="flex flex-col gap-2" role="status">
					<span className="font-semibold">
						Getting your audio ready…
						{audioState.fraction !== null && ` ${Math.floor(audioState.fraction * 100)}%`}
					</span>
					<div
						className="h-3 overflow-hidden rounded-full bg-bg"
						role="progressbar"
						aria-label="Audio download"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={audioState.fraction === null ? undefined : Math.floor(audioState.fraction * 100)}
					>
						<div
							className="h-full rounded-full bg-brand transition-[width]"
							style={{ width: `${Math.floor((audioState.fraction ?? 0) * 100)}%` }}
						/>
					</div>
					<span className="text-small text-ink-2">The timer has not started. It starts when you press Start.</span>
				</div>
			)}

			{waitForAudio && audioState.status === "failed" && (
				<div className="flex flex-col gap-3">
					<Banner tone="warning">
						We couldn&rsquo;t get the audio. Check the internet, then try again. If it still doesn&rsquo;t work, tell
						your teacher. Your timer has not started.
					</Banner>
					<Button type="button" variant="secondary" size="student" onClick={() => {
							setAudioState({ status: "loading", fraction: null });
							fetchAudio();
						}}>
						Try again
					</Button>
				</div>
			)}

			{state && <Banner tone="warning">{state.message}</Banner>}
			<button
				type="submit"
				disabled={pending || !ready}
				className="flex h-primary cursor-pointer items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
			>
				{pending
					? "Starting…"
					: !ready
						? "Wait for the audio…"
						: resume
							? "Carry on with your test"
							: "I’m ready — Start"}
				{ready && <span aria-hidden="true">→</span>}
			</button>
		</form>
	);
}
