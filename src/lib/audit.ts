import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Writing the audit trail (`MVP-1.md` §8).
 *
 * `public.audit_log` is append-only — a trigger refuses UPDATE — and has no
 * foreign key on `actor_id`, so the trail outlives the erasure of the person
 * who acted (DPDP, M9-08).
 *
 * Written with the secret-key client because `authenticated` holds no INSERT
 * on the table: a trail a user can write to is not a trail.
 */

/** One privileged action worth remembering. */
export type AuditEntry = {
	/** The acting user's id, or `null` for something the system did alone. */
	actorId: string | null;
	branchId: string | null;
	/** `entity.verb`, lowercase — e.g. `invite.create`. Constrained by the table. */
	action: string;
	/** The table or concept acted on, e.g. `invitation`. */
	entity: string;
	entityId?: string | null;
	/**
	 * Context worth having later. **Never a token, password or other
	 * credential** — this row is readable by admins in the branch.
	 *
	 * Typed as `Json` rather than `Record<string, unknown>` so that anything
	 * which would not survive the round trip through jsonb is a compile error
	 * here, rather than a surprise in the audit screen.
	 */
	meta?: { [key: string]: Json | undefined };
};

/**
 * Appends one entry.
 *
 * Failure is logged, never thrown: losing the audit line for an invitation is
 * bad, but failing the invitation *because* the audit line failed is worse —
 * the student is the one who would pay for it. Deliberate, and the inverse of
 * how a financial ledger would treat this.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
	const { error } = await createAdminClient()
		.from("audit_log")
		.insert({
			actor_id: entry.actorId,
			branch_id: entry.branchId,
			action: entry.action,
			entity: entry.entity,
			entity_id: entry.entityId ?? null,
			meta: entry.meta ?? {},
		});

	if (error) console.error(`audit_log write failed for ${entry.action}:`, error.message);
}
