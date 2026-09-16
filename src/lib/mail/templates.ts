/**
 * Email bodies. Pure functions of their inputs — no I/O, so they unit-test
 * without a mail provider.
 *
 * These are written for a student who may never have been sent a link by a
 * school before (`CLAUDE.md`, the design rule). Plain sentences, one action,
 * the deadline stated in words rather than an ISO timestamp, and no images —
 * an invitation that renders as a broken-image icon in Gmail reads as a scam.
 */

/** Escapes text for interpolation into HTML. Names and branch names are user input. */
function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** What the invitation email needs to know. */
export type InvitationEmail = {
	/** The invited person's name, as the admin typed it. */
	name: string;
	/** The institute branch that invited them. */
	branchName: string;
	/** "Student", "Teacher", … — shown so a wrong role is caught before it is used. */
	roleLabel: string;
	/** The absolute, single-use acceptance URL. */
	url: string;
	/** How long the link lasts, already in words, e.g. "7 days". */
	validFor: string;
};

/** Subject, HTML and plain-text alternative for one invitation. */
export function invitationEmail(invite: InvitationEmail): { subject: string; html: string; text: string } {
	const firstName = invite.name.trim().split(/\s+/)[0] || "there";
	const subject = `Set up your ${invite.branchName} account`;

	// A text/plain alternative is not optional: sending HTML alone is one of
	// the strongest spam signals there is, and an invite in spam blocks
	// enrolment outright (BUILD-STEPS step 34).
	const text = [
		`Hello ${firstName},`,
		"",
		`${invite.branchName} has set up an IELTS practice account for you as a ${invite.roleLabel.toLowerCase()}.`,
		"",
		"Open this link to pick a password and sign in:",
		invite.url,
		"",
		`The link works once, and only for the next ${invite.validFor}.`,
		"If it stops working, ask your teacher to send a new one — it takes a minute.",
		"",
		"If you weren't expecting this, you can ignore it.",
		"",
		invite.branchName,
	].join("\n");

	const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
<tr><td>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Hello ${escapeHtml(firstName)},</h1>
<p style="margin:0 0 16px;">${escapeHtml(invite.branchName)} has set up an IELTS practice account for you as a ${escapeHtml(invite.roleLabel.toLowerCase())}.</p>
<p style="margin:0 0 24px;">Pick a password and you&rsquo;re in. It takes a minute.</p>
<p style="margin:0 0 24px;">
<a href="${escapeHtml(invite.url)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">Set up my account</a>
</p>
<p style="margin:0 0 16px;color:#57534e;font-size:14px;">The link works once, and only for the next ${escapeHtml(invite.validFor)}. If it stops working, ask your teacher to send a new one.</p>
<p style="margin:0 0 8px;color:#57534e;font-size:14px;">If the button doesn&rsquo;t work, copy this address into your browser:</p>
<p style="margin:0 0 24px;color:#57534e;font-size:13px;word-break:break-all;">${escapeHtml(invite.url)}</p>
<p style="margin:0;color:#78716c;font-size:13px;border-top:1px solid #e7e5e4;padding-top:16px;">If you weren&rsquo;t expecting this, you can ignore it.<br>${escapeHtml(invite.branchName)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	return { subject, html, text };
}

/** What the password-reset email needs to know. */
export type PasswordResetEmail = {
	name: string;
	branchName: string;
	/** The absolute, single-use reset URL. */
	url: string;
	/** How long the link lasts, in words, e.g. "60 minutes". */
	validFor: string;
};

/**
 * Subject, HTML and plain text for a password reset (M1-15).
 *
 * Says plainly what to do if they did **not** ask for it. A reset email nobody
 * requested is the first sign an address has been targeted, and "ignore this"
 * alone leaves them with no way to tell anyone.
 */
export function passwordResetEmail(reset: PasswordResetEmail): { subject: string; html: string; text: string } {
	const firstName = reset.name.trim().split(/\s+/)[0] || "there";
	const subject = `Reset your ${reset.branchName} password`;

	const text = [
		`Hello ${firstName},`,
		"",
		"Someone asked to reset the password on your account. If that was you, open this link:",
		reset.url,
		"",
		`It works once, and only for the next ${reset.validFor}.`,
		"",
		"If it wasn't you, you can ignore this email — your password has not changed.",
		"Tell your teacher if you keep getting these.",
		"",
		reset.branchName,
	].join("\n");

	const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
<tr><td>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Hello ${escapeHtml(firstName)},</h1>
<p style="margin:0 0 24px;">Someone asked to reset the password on your ${escapeHtml(reset.branchName)} account. If that was you, choose a new one here.</p>
<p style="margin:0 0 24px;">
<a href="${escapeHtml(reset.url)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">Choose a new password</a>
</p>
<p style="margin:0 0 16px;color:#57534e;font-size:14px;">It works once, and only for the next ${escapeHtml(reset.validFor)}.</p>
<p style="margin:0 0 8px;color:#57534e;font-size:14px;">If the button doesn&rsquo;t work, copy this address into your browser:</p>
<p style="margin:0 0 24px;color:#57534e;font-size:13px;word-break:break-all;">${escapeHtml(reset.url)}</p>
<p style="margin:0;color:#78716c;font-size:13px;border-top:1px solid #e7e5e4;padding-top:16px;">If it wasn&rsquo;t you, you can ignore this &mdash; your password has not changed. Tell your teacher if you keep getting these.<br>${escapeHtml(reset.branchName)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	return { subject, html, text };
}
