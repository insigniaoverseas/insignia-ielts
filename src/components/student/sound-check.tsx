"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * The headphone check on screen 05.
 *
 * This is the cheapest support call the product can prevent: a student who
 * cannot hear the clip finds out *before* a one-shot Listening timer starts,
 * while a teacher can still help. So it asks a question with a wrong answer,
 * and the wrong answer leads somewhere rather than just failing.
 *
 * It never blocks Start. A student who genuinely can't get sound out of a lab
 * machine must still be able to begin if their teacher tells them to.
 */
export function SoundCheck({ src }: { src: string }) {
	const audio = useRef<HTMLAudioElement>(null);
	const [played, setPlayed] = useState(false);
	const [heard, setHeard] = useState<boolean | null>(null);
	const [failed, setFailed] = useState(false);

	async function play() {
		setFailed(false);
		try {
			await audio.current?.play();
			setPlayed(true);
		} catch {
			// Autoplay refusal, a missing file, or no output device. Either way
			// the student needs the same words, not an error code.
			setFailed(true);
		}
	}

	return (
		<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-1">
				<h2 className="m-0 text-h3">Check your headphones</h2>
				<p className="m-0 text-ink-2">
					Put them on and press the button. You should hear a voice count to three.
				</p>
			</div>

			<audio ref={audio} src={src} preload="auto" />

			<Button variant="secondary" size="student" onClick={play} className="w-full sm:w-auto">
				Play test sound
			</Button>

			{played && heard === null && (
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button size="student" variant="secondary" onClick={() => setHeard(true)} className="flex-1">
						I heard it clearly
					</Button>
					<Button size="student" variant="secondary" onClick={() => setHeard(false)} className="flex-1">
						I heard nothing — help me
					</Button>
				</div>
			)}

			{heard === true && (
				<p className="m-0 flex items-center gap-2 font-semibold text-success">
					<span aria-hidden="true">✓</span> Your sound is working. You&rsquo;re ready.
				</p>
			)}

			{(heard === false || failed) && (
				<div className="flex flex-col gap-2 rounded-card border border-warning-line bg-warning-soft px-5 py-4">
					<p className="m-0 font-semibold">Try these, in order:</p>
					<ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
						<li>Check the headphone plug is pushed all the way in.</li>
						<li>Turn the volume up on the computer, not just on the headphones.</li>
						<li>Press &ldquo;Play test sound&rdquo; again.</li>
					</ol>
					<p className="m-0">
						Still nothing? <strong className="font-semibold">Put your hand up and tell your teacher</strong>{" "}
						before you start — once the timer begins it will not stop.
					</p>
				</div>
			)}
		</section>
	);
}
