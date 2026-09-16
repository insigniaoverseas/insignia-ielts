import "server-only";

import type {
	AttemptSection,
	AttemptSession,
	PlayerQuestion,
	QuestionGroup,
} from "@/lib/view-models/attempt";

/*
 * A running attempt, as fixtures (M2-15 / M3-01).
 *
 * Deliberately contains no correct answers — see the note at the top of
 * `lib/view-models/attempt.ts`. When the real loader replaces this, that
 * property has to survive: the query must select the question columns, never
 * the key, and `key.json` stays in R2 behind a Server Action.
 */

/** Numbered questions for a gap-fill group. */
function gaps(start: number, items: [string, string?][]): PlayerQuestion[] {
	return items.map(([promptHtml, hint], i) => ({
		id: `q${start + i}`,
		number: start + i,
		promptHtml,
		hint,
	}));
}

const LIMIT = "NO MORE THAN TWO WORDS AND/OR A NUMBER";

const SECTION_1: AttemptSection = {
	number: 1,
	label: "Section 1",
	passages: [],
	groups: [
		{
			id: "g1",
			heading: "Questions 1–5",
			instructionHtml: "<p>Complete the form below. Write <strong>ONE WORD AND/OR A NUMBER</strong> for each answer.</p>",
			widget: "text_gap",
			container: "form",
			questions: gaps(1, [
				["Name of caller: Helen <strong>______</strong>", "ONE WORD"],
				["Address: 41 <strong>______</strong> Road", "ONE WORD"],
				["Postcode: <strong>______</strong>", "A NUMBER"],
				["Best time to call: <strong>______</strong>", "ONE WORD AND/OR A NUMBER"],
				["Reason for the call: a problem with the <strong>______</strong>", "ONE WORD"],
			]),
		},
		{
			id: "g2",
			heading: "Questions 6–10",
			instructionHtml: "<p>Choose the correct letter, <strong>A</strong>, <strong>B</strong> or <strong>C</strong>.</p>",
			widget: "radio",
			container: "plain",
			questions: [6, 7, 8, 9, 10].map((n) => ({
				id: `q${n}`,
				number: n,
				promptHtml: `<p>What does the speaker say about item ${n - 5}?</p>`,
				options: [
					{ value: "A", label: "It will arrive on Monday." },
					{ value: "B", label: "It has already been sent." },
					{ value: "C", label: "It has been cancelled." },
				],
			})),
		},
	],
};

const SECTION_2: AttemptSection = {
	number: 2,
	label: "Section 2",
	passages: [],
	groups: [
		{
			id: "g3",
			heading: "Questions 11–15",
			instructionHtml:
				"<p>What does the speaker say about each facility? Choose <strong>FIVE</strong> answers from the box.</p>",
			widget: "dropdown_bank",
			container: "plain",
			bank: [
				{ value: "A", label: "A — free for members" },
				{ value: "B", label: "B — closed for repairs" },
				{ value: "C", label: "C — open at weekends only" },
				{ value: "D", label: "D — must be booked ahead" },
				{ value: "E", label: "E — recently extended" },
				{ value: "F", label: "F — for over-16s only" },
			],
			questions: [
				{ id: "q11", number: 11, promptHtml: "Swimming pool" },
				{ id: "q12", number: 12, promptHtml: "Tennis courts" },
				{ id: "q13", number: 13, promptHtml: "Gym" },
				{ id: "q14", number: 14, promptHtml: "Café" },
				{ id: "q15", number: 15, promptHtml: "Car park" },
			],
		},
		{
			id: "g4",
			heading: "Questions 16–20",
			instructionHtml: "<p>Complete the notes below. Write <strong>NO MORE THAN TWO WORDS</strong> for each answer.</p>",
			widget: "text_gap",
			container: "note",
			questions: gaps(16, [
				["Opening time on Sundays: <strong>______</strong>", "NO MORE THAN TWO WORDS"],
				["Cost of a day pass: <strong>______</strong>", "A NUMBER"],
				["Equipment provided: <strong>______</strong>", "NO MORE THAN TWO WORDS"],
				["Nearest bus stop: outside the <strong>______</strong>", "NO MORE THAN TWO WORDS"],
				["Contact for bookings: the <strong>______</strong>", "NO MORE THAN TWO WORDS"],
			]),
		},
	],
};

const SECTION_3: AttemptSection = {
	number: 3,
	label: "Section 3",
	passages: [],
	groups: [
		{
			id: "g5",
			heading: "Questions 21–24",
			instructionHtml: "<p>Choose <strong>TWO</strong> letters, A–E.</p>",
			widget: "checkbox_n",
			container: "plain",
			choose: 2,
			questions: [
				{
					id: "q21",
					number: 21,
					covers: [21, 22],
					promptHtml: "<p>Which <strong>two</strong> problems did the students have with the survey?</p>",
					options: [
						{ value: "A", label: "Too few people replied." },
						{ value: "B", label: "The questions were unclear." },
						{ value: "C", label: "It took longer than planned." },
						{ value: "D", label: "The software kept crashing." },
						{ value: "E", label: "Their tutor was unavailable." },
					],
				},
				{
					id: "q23",
					number: 23,
					covers: [23, 24],
					promptHtml: "<p>Which <strong>two</strong> changes will they make next time?</p>",
					options: [
						{ value: "A", label: "Start earlier in the term." },
						{ value: "B", label: "Use a shorter questionnaire." },
						{ value: "C", label: "Interview people in person." },
						{ value: "D", label: "Work in a larger group." },
						{ value: "E", label: "Ask for a different topic." },
					],
				},
			],
		},
		{
			id: "g6",
			heading: "Questions 25–30",
			instructionHtml: "<p>Complete the summary. Write <strong>ONE WORD ONLY</strong> for each answer.</p>",
			widget: "text_gap",
			container: "summary",
			questions: gaps(25, [
				["The students chose the topic because it was <strong>______</strong>.", "ONE WORD ONLY"],
				["They collected their data over <strong>______</strong> weeks.", "ONE WORD ONLY"],
				["Most replies came from the <strong>______</strong> department.", "ONE WORD ONLY"],
				["The results surprised their <strong>______</strong>.", "ONE WORD ONLY"],
				["They will present the findings in a <strong>______</strong>.", "ONE WORD ONLY"],
				["The deadline is at the end of <strong>______</strong>.", "ONE WORD ONLY"],
			]),
		},
	],
};

const SECTION_4: AttemptSection = {
	number: 4,
	label: "Section 4",
	passages: [],
	groups: [
		{
			id: "g7",
			heading: "Questions 31–40",
			instructionHtml: "<p>Complete the notes below. Write <strong>{LIMIT}</strong> for each answer.</p>".replace("{LIMIT}", LIMIT),
			widget: "text_gap",
			container: "note",
			questions: gaps(31, [
				["Early settlements grew near sources of <strong>______</strong>.", LIMIT],
				["The first bridges were built from <strong>______</strong>.", LIMIT],
				["Trade routes followed the <strong>______</strong> valley.", LIMIT],
				["The city wall was finished in <strong>______</strong>.", LIMIT],
				["Its main export was <strong>______</strong>.", LIMIT],
				["A fire destroyed the <strong>______</strong> quarter.", LIMIT],
				["Rebuilding took nearly <strong>______</strong> years.", LIMIT],
				["The museum opened in the old <strong>______</strong>.", LIMIT],
				["Visitor numbers rose by <strong>______</strong> per cent.", LIMIT],
				["Future work will focus on the <strong>______</strong>.", LIMIT],
			]),
		},
	],
};

const READING_SECTION_1: AttemptSection = {
	number: 1,
	label: "Passage 1",
	passages: [
		{
			title: "The return of the urban tram",
			html: `<p>For most of the twentieth century the tram was treated as an embarrassment. Cities that had spent decades laying track tore it up again, often in a matter of months, and replaced it with buses that were cheaper to buy and, it was assumed, more flexible. By 1970 the tram had disappeared from almost every British city. The few systems that survived did so largely by accident.</p>
<p>The reversal, when it came, was driven less by nostalgia than by arithmetic. A tram carries more people per driver than a bus, and it carries them in a vehicle that lasts thirty years rather than twelve. Once the cost of the track is spread across that lifetime, the sums begin to look different. Cities that had written the tram off as Victorian found themselves rebuilding it as modern infrastructure.</p>
<p>There is a second, subtler argument. A bus route can be moved, and everybody knows it. A tram line cannot, and everybody knows that too. Developers will build beside a tram line precisely because the rails are an expensive promise that the service will still be there in twenty years. Several studies have found property values rising along announced tram routes years before the first vehicle runs.</p>
<p>Critics point out that this promise is also a trap. A city that guesses wrong about where it will grow is left with rails in the wrong place and no cheap way to move them. The flexibility that made buses attractive in 1960 has not stopped being valuable; it has simply stopped being fashionable.</p>`,
		},
	],
	groups: [
		{
			id: "rg1",
			heading: "Questions 1–6",
			instructionHtml:
				"<p>Do the following statements agree with the information in the passage? Write <strong>TRUE</strong>, <strong>FALSE</strong> or <strong>NOT GIVEN</strong>.</p>",
			widget: "segmented_3",
			container: "plain",
			questions: [
				{ id: "r1", number: 1, promptHtml: "Most British cities had removed their trams by 1970." },
				{ id: "r2", number: 2, promptHtml: "Buses were cheaper to purchase than trams." },
				{ id: "r3", number: 3, promptHtml: "Trams last about twice as long as buses." },
				{ id: "r4", number: 4, promptHtml: "The writer thinks nostalgia was the main reason trams returned." },
				{ id: "r5", number: 5, promptHtml: "Property prices can rise before a tram line opens." },
				{ id: "r6", number: 6, promptHtml: "Every city that built a tram line has regretted it." },
			],
		},
		{
			id: "rg2",
			heading: "Questions 7–10",
			instructionHtml:
				"<p>Complete the sentences below. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.</p>",
			widget: "text_gap",
			container: "sentence",
			questions: gaps(7, [
				["A tram carries more people per <strong>______</strong> than a bus does.", "NO MORE THAN TWO WORDS"],
				["The cost of the <strong>______</strong> is spread over the vehicle's lifetime.", "NO MORE THAN TWO WORDS"],
				["Rails act as an expensive <strong>______</strong> that the service will continue.", "NO MORE THAN TWO WORDS"],
				["Critics argue that a city may guess wrong about where it will <strong>______</strong>.", "NO MORE THAN TWO WORDS"],
			]),
		},
	],
};

const LISTENING_SECTIONS = [SECTION_1, SECTION_2, SECTION_3, SECTION_4];

/** Every question number in a set of sections, in order. */
export function questionNumbers(sections: AttemptSection[]): number[] {
	return sections.flatMap((s) => s.groups.flatMap((g: QuestionGroup) => g.questions.map((q) => q.number)));
}

/**
 * The running attempt behind `/attempt/[attemptId]`.
 *
 * `secondsRemaining` is deliberately short of the full duration: a resumed
 * attempt is the normal case, not the exception, and a player that only ever
 * renders a full clock hides every bug in the resume path.
 */
export async function getAttemptSession(attemptId: string): Promise<AttemptSession | null> {
	if (attemptId === "a-p02" || attemptId.startsWith("r-")) {
		return {
			attemptId,
			test: {
				id: "t-reading-ac-3",
				title: "Academic Reading Mock Test 3",
				skill: "reading",
				variant: "academic",
				difficulty: "hard",
				questionCount: 10,
				durationMinutes: 20,
			},
			mode: "practice",
			secondsRemaining: 18 * 60 + 42,
			expiresAt: "2026-09-16T13:20:00Z",
			audio: null,
			sections: [READING_SECTION_1],
			answers: { r1: "True", q7: "driver" },
			flagged: [4],
		};
	}

	return {
		attemptId,
		test: {
			id: "t-listening-mock-2",
			title: "Listening Mock Test 2",
			skill: "listening",
			variant: "n_a",
			difficulty: "medium",
			questionCount: 40,
			durationMinutes: 30,
		},
		mode: "mock",
		secondsRemaining: 26 * 60 + 9,
		expiresAt: "2026-09-16T13:00:00Z",
		audio: { url: "/test-audio.mp3", durationSeconds: 1680 },
		sections: LISTENING_SECTIONS,
		answers: { q1: "Wentworth", q2: "Station", q6: "A" },
		flagged: [3, 11],
	};
}
