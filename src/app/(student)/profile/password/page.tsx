import type { Metadata } from "next";
import Link from "next/link";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
	title: "Change my password",
	robots: { index: false, follow: false },
};

/**
 * Change my password — reached from Profile's "Change my password" button.
 *
 * The student layout has already required a signed-in student with a live
 * session; the action checks again, because a Server Action is its own
 * endpoint.
 */
export default function ChangePasswordPage() {
	return (
		<div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
			<Link href="/profile" className="font-semibold">
				<Icon name="arrow-left" className="mr-1.5" />
				Back to my profile
			</Link>
			<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">Change my password</h1>
			<ChangePasswordForm />
		</div>
	);
}
