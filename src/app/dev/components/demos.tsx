"use client";

/*
 * Interactive demos for the /dev/components gallery. Each holds its own state
 * so the controlled components can be exercised by hand. Demo content only —
 * nothing here touches real tests or answers.
 */

import { useEffect, useState } from "react";
import { PinInput } from "@/components/ui/pin-input";
import { AudioPlayer } from "@/components/player/audio-player";
import { QuestionNavigator, type NavQuestion } from "@/components/player/question-navigator";
import { SingleChoice } from "@/components/player/widgets/radio";
import { ChooseN } from "@/components/player/widgets/checkbox-n";
import { SegmentedChoice, YNNG } from "@/components/player/widgets/segmented-3";
import { MatchingSelect } from "@/components/player/widgets/dropdown-bank";
import { GapInput, TextAnswer } from "@/components/player/widgets/text-gap";

const card = "flex flex-col gap-4 rounded-card border border-line bg-surface p-6";
const caption = "font-mono text-small text-ink-3";

export function PinDemo() {
	const [pin, setPin] = useState("48");
	const [six, setSix] = useState("");
	const [wrong, setWrong] = useState("1234");
	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
			<div className={card}>
				<span className={caption}>PIN — try typing, Backspace, arrow keys, or pasting 4821</span>
				<PinInput value={pin} onChange={setPin} />
			</div>
			<div className={card}>
				<span className={caption}>6-digit PIN — recommended (MVP-1 §9); fits a 390px phone</span>
				<PinInput value={six} onChange={setSix} length={6} />
			</div>
			<div className={card}>
				<span className={caption}>PIN — error state</span>
				<PinInput value={wrong} onChange={setWrong} error="That PIN is not right. 2 tries left." />
			</div>
		</div>
	);
}

const NAV_SEED: NavQuestion[] = Array.from({ length: 40 }, (_, i) => ({
	n: i + 1,
	answered: i < 3 || (i > 9 && i < 14),
	flagged: i === 2 || i === 12,
}));

export function NavigatorDemo() {
	const [current, setCurrent] = useState(5);
	return (
		<div className={card}>
			<QuestionNavigator questions={NAV_SEED} current={current} onSelect={setCurrent} />
		</div>
	);
}

export function WidgetsDemo() {
	const [short, setShort] = useState("9 p.m.");
	const [single, setSingle] = useState<string | null>("family");
	const [multi, setMulti] = useState<string[]>(["hire"]);
	const [tfng, setTfng] = useState<string | null>("True");
	const [ynng, setYnng] = useState<string | null>(null);
	const [match, setMatch] = useState<Record<string, string | null>>({ m31: "b", m32: null, m33: null });
	const [gap36, setGap36] = useState("1974");
	const [gap37, setGap37] = useState("");

	const bank = [
		{ value: "a", label: "A — Statistics" },
		{ value: "b", label: "B — Rainfall" },
		{ value: "c", label: "C — Interview design" },
	];

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
			<div className={card}>
				<span className={caption}>text_gap · TextAnswer</span>
				<TextAnswer id="demo-q7" number={7} prompt="The library closes at" value={short} onChange={setShort} />
			</div>

			<div className={card}>
				<span className={caption}>radio · mcq_single</span>
				<SingleChoice
					name="demo-q12"
					legend={
						<>
							<strong className="font-semibold">12.</strong> Why did the speaker move to Leeds?
						</>
					}
					options={[
						{ value: "job", label: "For a new job" },
						{ value: "family", label: "To be near family" },
						{ value: "rent", label: "The rent was cheaper" },
					]}
					value={single}
					onChange={setSingle}
				/>
			</div>

			<div className={card}>
				<span className={caption}>checkbox_n · mcq_multi</span>
				<ChooseN
					name="demo-q18"
					choose={2}
					legend={
						<>
							<strong className="font-semibold">18–19.</strong> Choose <strong className="font-semibold">two</strong>{" "}
							things the club provides.
						</>
					}
					options={[
						{ value: "hire", label: "Equipment hire" },
						{ value: "transport", label: "Free transport" },
						{ value: "coaching", label: "Weekend coaching" },
					]}
					value={multi}
					onChange={setMulti}
				/>
			</div>

			<div className={card}>
				<span className={caption}>segmented_3 · True / False / Not Given</span>
				<SegmentedChoice
					name="demo-q24"
					legend={
						<>
							<strong className="font-semibold">24.</strong> City hives produce more honey than rural ones.
						</>
					}
					value={tfng}
					onChange={setTfng}
				/>
				<span className={caption}>segmented_3 · Yes / No / Not Given</span>
				<SegmentedChoice
					name="demo-q25"
					options={YNNG}
					legend={
						<>
							<strong className="font-semibold">25.</strong> The writer believes councils should fund hives.
						</>
					}
					value={ynng}
					onChange={setYnng}
				/>
			</div>

			<div className={card}>
				<span className={caption}>dropdown_bank · matching</span>
				<p className="m-0 text-passage">
					<strong className="font-semibold">31–33.</strong> Match each person to what they advise on.
				</p>
				{(
					[
						["m31", "31. Dr Malik"],
						["m32", "32. Prof Osei"],
						["m33", "33. Ms Reyes"],
					] as const
				).map(([key, label]) => (
					<MatchingSelect
						key={key}
						id={`demo-${key}`}
						label={label}
						options={bank}
						value={match[key]}
						onChange={(v) => setMatch((m) => ({ ...m, [key]: v }))}
					/>
				))}
			</div>

			<div className={card}>
				<span className={caption}>text_gap · GapInput inside a paragraph</span>
				<p className="m-0 text-passage leading-[2.2]">
					The first city apiary opened in <GapInput number={36} value={gap36} onChange={setGap36} /> and was funded
					by the <GapInput number={37} value={gap37} onChange={setGap37} width="w-32" /> council.
				</p>
			</div>
		</div>
	);
}

/** Simulates playback so the progress bar can be seen moving. */
function useFakePlayback(duration: number, start: number) {
	const [playing, setPlaying] = useState(false);
	const [elapsed, setElapsed] = useState(start);
	useEffect(() => {
		if (!playing) return;
		const t = setInterval(() => setElapsed((e) => (e >= duration ? duration : e + 1)), 1000);
		return () => clearInterval(t);
	}, [playing, duration]);
	return { playing, setPlaying, elapsed, setElapsed };
}

export function AudioDemo() {
	const mock = useFakePlayback(1800, 684);
	const practice = useFakePlayback(425, 120);
	const [mockVol, setMockVol] = useState(0.7);
	const [pracVol, setPracVol] = useState(0.7);
	const [speed, setSpeed] = useState(1);

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
			<div className={card}>
				<h3 className="m-0 text-h3">Audio player — mock mode</h3>
				<p className="m-0 text-small text-ink-2">
					Press play: once it starts, it can&apos;t be paused. One play, straight through.
				</p>
				<AudioPlayer
					mode="mock"
					playing={mock.playing}
					elapsed={mock.elapsed}
					duration={1800}
					volume={mockVol}
					onPlay={() => mock.setPlaying(true)}
					onVolumeChange={setMockVol}
				/>
			</div>
			<div className={card}>
				<h3 className="m-0 text-h3">Audio player — practice mode</h3>
				<p className="m-0 text-small text-ink-2">Full controls and speed.</p>
				<AudioPlayer
					mode="practice"
					title="Section 1 — A phone call about a sports club"
					playing={practice.playing}
					elapsed={practice.elapsed}
					duration={425}
					volume={pracVol}
					onPlay={() => practice.setPlaying(true)}
					onPause={() => practice.setPlaying(false)}
					onVolumeChange={setPracVol}
					onBack10={() => practice.setElapsed((e) => Math.max(0, e - 10))}
					onReplay={() => practice.setElapsed(0)}
					speed={speed}
					onSpeedChange={setSpeed}
				/>
			</div>
		</div>
	);
}
