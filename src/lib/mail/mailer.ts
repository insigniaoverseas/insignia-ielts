import "server-only";

import { isDevelopment, mailFrom, resendApiKey } from "@/lib/env";

/**
 * Sending email (M1-03).
 *
 * One narrow interface with two implementations, chosen by whether a Resend key
 * is configured. That split exists so the invitation flow is walkable —
 * end to end, by a real person — before the institute's sending domain and
 * API key are provisioned, and so swapping to real delivery is configuration
 * rather than a code change.
 *
 * **The Resend account connected to Supabase does not cover this.** That
 * connection is SMTP for Supabase Auth's *own* emails (confirmation, recovery).
 * Our invitation carries our own token from `public.invitations`, with a role,
 * branch, batch and plan attached, and we must be able to revoke it — none of
 * which Supabase's built-in invite can express. So we send it ourselves.
 */

/** One email to one person. */
export type Message = {
	to: string;
	subject: string;
	html: string;
	text: string;
};

/** Anything that can deliver a {@link Message}. */
export type Mailer = {
	send(message: Message): Promise<void>;
};

/** Raised when the provider rejected the send. The caller decides what the user sees. */
export class MailError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = "MailError";
	}
}

/**
 * Delivers through Resend's REST API.
 *
 * `fetch` rather than the `resend` SDK: this is one POST, and the SDK pulls a
 * dependency into a Worker bundle for no benefit.
 */
function resendMailer(apiKey: string): Mailer {
	return {
		async send(message) {
			const response = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from: mailFrom(),
					to: [message.to],
					subject: message.subject,
					html: message.html,
					text: message.text,
				}),
			});

			if (!response.ok) {
				// Read the provider's reason for the log, but never surface it to
				// the browser — it can name whether an address exists.
				const detail = await response.text().catch(() => "");
				throw new MailError(`Resend rejected the send (${response.status}): ${detail.slice(0, 500)}`, response.status);
			}
		},
	};
}

/**
 * Development only: writes the message to the server console instead of
 * sending it, so the invitation link can be copied out of the terminal.
 *
 * Deliberately **not** a production fallback. Silently not sending an invite in
 * production would look like success to the admin and leave the student with
 * nothing, which is worse than a visible failure.
 */
function consoleMailer(): Mailer {
	return {
		async send(message) {
			console.info(
				["", "─".repeat(72), "✉  DEV MAILER — not sent. Set RESEND_API_KEY to deliver for real.", `   To:      ${message.to}`, `   Subject: ${message.subject}`, "", message.text, "─".repeat(72), ""].join(
					"\n",
				),
			);
		},
	};
}

/**
 * The mailer for this environment.
 *
 * @throws Error in production when no `RESEND_API_KEY` is set — a deployment
 *   that cannot send invitations should fail loudly, not quietly.
 */
export function getMailer(): Mailer {
	const apiKey = resendApiKey();
	if (apiKey) return resendMailer(apiKey);

	if (isDevelopment()) return consoleMailer();

	throw new MailError("RESEND_API_KEY is not set, so invitations cannot be sent. Run `npx wrangler secret put RESEND_API_KEY`.");
}
