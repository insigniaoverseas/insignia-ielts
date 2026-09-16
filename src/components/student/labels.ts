import type { Mode, Skill } from "@/lib/view-models/student";

/*
 * The words the student side uses. Kept in one file so the same thing is never
 * called two names on two screens — "Mock test" here and "Assessment" there is
 * exactly the confusion the design rule forbids.
 */

/** "Listening" / "Reading". */
export const SKILL_LABEL: Record<Skill, string> = {
	listening: "Listening",
	reading: "Reading",
};

/** Short form for a chip. */
export const MODE_LABEL: Record<Mode, string> = {
	mock: "Mock test",
	class: "Class test",
	practice: "Practice",
};

/** The long form, which says what the mode *means* for the student's band. */
export const MODE_EXPLAINED: Record<Mode, string> = {
	mock: "Mock test — counts towards your band",
	class: "Class test — counts towards your band",
	practice: "Practice — does not count towards your band",
};
