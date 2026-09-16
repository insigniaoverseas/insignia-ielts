"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The Reading player's split view (screen 07, M3-01).
 *
 * Desktop: passage left, questions right, each scrolling independently, with a
 * divider the student can drag. Independent scrolling is the point — a reader
 * checking paragraph 3 against question 9 must not lose their place in either.
 *
 * Tablet and phone: the two panes become one, behind a Passage/Questions
 * toggle. A split view below about 1024px gives two columns too narrow to read,
 * and legibility is the product on a reading test.
 *
 * The divider is a `separator` with keyboard support, because a student who
 * cannot use a mouse still needs to widen the passage.
 */
export function ReadingSplit({
	passage,
	questions,
}: {
	passage: React.ReactNode;
	questions: React.ReactNode;
}) {
	// Percentage of the width given to the passage.
	const [split, setSplit] = useState(50);
	const [pane, setPane] = useState<"passage" | "questions">("passage");
	const frame = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);

	const moveTo = useCallback((clientX: number) => {
		const box = frame.current?.getBoundingClientRect();
		if (!box) return;
		const pct = ((clientX - box.left) / box.width) * 100;
		// Never let either side collapse to an unreadable sliver.
		setSplit(Math.min(75, Math.max(25, pct)));
	}, []);

	useEffect(() => {
		function onMove(e: MouseEvent) {
			if (dragging.current) moveTo(e.clientX);
		}
		function onUp() {
			dragging.current = false;
			document.body.style.userSelect = "";
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [moveTo]);

	return (
		<>
			{/* Below lg, one pane at a time. */}
			<div className="flex gap-1 self-start rounded-full border border-line bg-surface p-1 lg:hidden">
				{(["passage", "questions"] as const).map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => setPane(p)}
						aria-pressed={pane === p}
						className={cn(
							"min-h-touch cursor-pointer rounded-full px-5 font-semibold capitalize",
							pane === p ? "bg-brand-soft text-brand" : "text-ink-2 hover:text-ink",
						)}
					>
						{p}
					</button>
				))}
			</div>

			<div ref={frame} className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-0">
				<div
					className={cn(
						"min-w-0 lg:overflow-y-auto lg:pr-6",
						pane === "passage" ? "flex flex-col" : "hidden",
						"lg:flex lg:max-h-[calc(100vh-15rem)]",
					)}
					style={{ flexBasis: `${split}%` }}
				>
					{passage}
				</div>

				<div
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize the passage"
					aria-valuenow={Math.round(split)}
					aria-valuemin={25}
					aria-valuemax={75}
					tabIndex={0}
					onMouseDown={() => {
						dragging.current = true;
						// Otherwise the drag selects passage text under the cursor.
						document.body.style.userSelect = "none";
					}}
					onKeyDown={(e) => {
						if (e.key === "ArrowLeft") setSplit((s) => Math.max(25, s - 5));
						if (e.key === "ArrowRight") setSplit((s) => Math.min(75, s + 5));
					}}
					className="hidden w-3 flex-none cursor-col-resize items-center justify-center lg:flex"
				>
					<span className="h-16 w-1 rounded-full bg-line" aria-hidden="true" />
				</div>

				<div
					className={cn(
						"min-w-0 flex-1 lg:overflow-y-auto lg:pl-6",
						pane === "questions" ? "flex flex-col" : "hidden",
						"lg:flex lg:max-h-[calc(100vh-15rem)]",
					)}
				>
					{questions}
				</div>
			</div>
		</>
	);
}
