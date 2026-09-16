import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import type { PlanStatus } from "@/lib/view-models/student";

/**
 * The plan-expiry banner shown above every student screen.
 *
 * Renders nothing while the plan is comfortably active — a banner that is
 * always there stops being read. It appears only when the answer to "can I
 * still use this?" has changed, and it always names the date and the next step.
 */
export function PlanBanner({ plan }: { plan: PlanStatus }) {
	if (plan.state === "active") return null;
	if (plan.state === "missing") {
		return (
			<Banner tone="danger">
				No access plan is attached to your account yet. Ask your teacher to add one before you start a test.
			</Banner>
		);
	}
	if (plan.state === "suspended") {
		return <Banner tone="danger">Your access is paused. Ask your teacher or the front desk to restore it.</Banner>;
	}

	if (plan.state === "expired") {
		return (
			<Banner tone="danger">
				Your access ended on <strong className="font-semibold">{plan.endsOnLabel}</strong>. Ask your teacher
				to extend it — your old results are still here.
			</Banner>
		);
	}

	const days = plan.daysRemaining;
	return (
		<Banner
			tone="warning"
			action={
				<Link href="/profile" className="font-semibold">
					See my plan
				</Link>
			}
		>
			Your access ends in <strong className="font-semibold">{days === 1 ? "1 day" : `${days} days`}</strong>,
			on {plan.endsOnLabel}. Ask your teacher to extend it.
		</Banner>
	);
}
