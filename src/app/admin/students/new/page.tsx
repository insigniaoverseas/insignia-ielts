import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStudentsList } from "@/lib/mock/admin";

export const metadata: Metadata = { title: "Invite a student" };

/**
 * Screen 22a — invite one student (M5-04).
 *
 * Called "Invite", not "Add", because that is literally what happens: there is
 * no public signup, so every account starts as an admin invitation
 * (`CLAUDE.md` rule 7). Naming the button "Add student" would imply the account
 * exists the moment the form is submitted, and it does not — the student still
 * has to accept.
 *
 * The form action lands with M1-02.
 */
export default async function NewStudentPage() {
	const { batches } = await getStudentsList();

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/students" className="font-semibold">
				← Back to students
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Invite a student</h1>
				<p className="m-0 text-ink-2">
					They&rsquo;ll get a link to set their own password and PIN. Nothing is active until they accept.
				</p>
			</div>

			<form className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Full name</Label>
					<Input id="name" name="name" size="admin" required />
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="phone">Phone number</Label>
					<PhoneInput id="phone" name="phone" size="admin" required />
					<span className="text-small text-ink-2">This is how they log in. Check it twice.</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input id="email" name="email" type="email" size="admin" required />
					<span className="text-small text-ink-2">The invitation goes here.</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="batch">Batch</Label>
					<select
						id="batch"
						name="batch"
						className="h-10 rounded-control border border-line bg-surface px-3 text-body"
					>
						<option value="">No batch yet</option>
						{batches.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-wrap gap-4">
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="planStart">Plan starts</Label>
						<Input id="planStart" name="planStart" type="date" size="admin" />
					</div>
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="planMonths">Plan length</Label>
						<select
							id="planMonths"
							name="planMonths"
							defaultValue="3"
							className="h-10 rounded-control border border-line bg-surface px-3 text-body"
						>
							<option value="1">1 month</option>
							<option value="3">3 months</option>
							<option value="6">6 months</option>
							<option value="12">12 months</option>
						</select>
					</div>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button type="submit">Send the invitation</Button>
					<Button variant="secondary" asChild>
						<Link href="/admin/students">Cancel</Link>
					</Button>
				</div>
			</form>
		</div>
	);
}
