import "server-only";

import { sanitizePassageHtml } from "@/lib/security/sanitize";
import type { AttemptSession } from "@/lib/view-models/attempt";

/**
 * Sanitise every piece of authored HTML in an attempt, **on the server**,
 * before any of it reaches a client component.
 *
 * Why this exists rather than calling `sanitizePassageHtml` where the HTML is
 * rendered: the player is a client component, and importing the sanitiser
 * there would pull `unified` and three `rehype` packages into the browser
 * bundle — for a module whose output is identical every time, on a screen with
 * a ~200 KB budget (`MVP-1.md` §4). Sanitising once per request on the server
 * satisfies the same rule (`MVP-1.md` §8 rule 8: on write *and* on render) at
 * no cost to the student's phone.
 *
 * Everything downstream of this function may be trusted as already sanitised.
 * **Nothing downstream may import the sanitiser** — if you find yourself
 * wanting to, the HTML took a path that skipped this call, and that is the bug.
 */
export function sanitizeAttemptSession(session: AttemptSession): AttemptSession {
	return {
		...session,
		sections: session.sections.map((section) => ({
			...section,
			passages: section.passages.map((p) => ({ ...p, html: sanitizePassageHtml(p.html) })),
			groups: section.groups.map((group) => ({
				...group,
				instructionHtml: sanitizePassageHtml(group.instructionHtml),
				questions: group.questions.map((q) => ({ ...q, promptHtml: sanitizePassageHtml(q.promptHtml) })),
			})),
		})),
	};
}
