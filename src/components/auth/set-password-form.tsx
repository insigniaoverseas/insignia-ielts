"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The minimum this product accepts. Stated up front, never as an error after the fact. */
const MIN_LENGTH = 8;

/**
 * Set a password while accepting an invitation (M1-06).
 *
 * Two deliberate choices:
 *
 * - **The rules are printed before you type**, and tick as you satisfy them.
 *   A student meeting this screen once should not discover the requirements by
 *   failing them.
 * - **A show/hide toggle, not a "confirm password" field.** Retyping catches
 *   typos by accident; being able to read what you typed catches them on
 *   purpose, and on a phone keyboard it is far less frustrating.
 *
 * The strength check here is for the person typing. The server checks again,
 * including against known-breached passwords (Supabase leaked-password
 * protection is already on — M1-01).
 */
export function SetPasswordForm({ token }: { token: string }) {
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);

	const checks = [
		{ label: `At least ${MIN_LENGTH} characters`, ok: password.length >= MIN_LENGTH },
		{ label: "A letter", ok: /[a-zA-Z]/.test(password) },
		{ label: "A number or symbol", ok: /[^a-zA-Z]/.test(password) },
	];
	const ready = checks.every((c) => c.ok);

	return (
		<form className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<input type="hidden" name="token" value={token} />

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-3">
					<Label htmlFor="password">Choose a password</Label>
					<button
						type="button"
						onClick={() => setShow((s) => !s)}
						className="min-h-touch cursor-pointer font-semibold text-brand"
					>
						{show ? "Hide" : "Show"}
					</button>
				</div>
				<Input
					id="password"
					name="password"
					type={show ? "text" : "password"}
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</div>

			{/* The rules, before you need them — not as an error afterwards. */}
			<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
				{checks.map((c) => (
					<li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-success" : "text-ink-2"}`}>
						<span aria-hidden="true">{c.ok ? "✓" : "○"}</span>
						{c.label}
						<span className="sr-only">{c.ok ? " — done" : " — not yet"}</span>
					</li>
				))}
			</ul>

			<Button type="submit" size="student" disabled={!ready}>
				Save my password and start
			</Button>

			<p className="m-0 text-small text-ink-2">
				Write it somewhere safe. If you forget it, your teacher has to send you a new invitation.
			</p>
		</form>
	);
}
