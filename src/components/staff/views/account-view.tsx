import { DeviceSignOutButton } from "@/components/auth/device-sign-out-button";
import { LogOutButton } from "@/components/auth/log-out-button";
import { SignOutEverywhereElse } from "@/components/staff/sign-out-everywhere-else";
import { StatusPill } from "@/components/ui/status-pill";
import type { StaffAccount } from "@/lib/view-models/staff";

/**
 * My account for teachers and admins (M10-12) — the same "where you're signed
 * in" list students have on Profile.
 *
 * Staff may be signed in on several devices at once (a laptop and a phone);
 * students may not. That flexibility is why staff need this page: without it
 * an admin who forgot to log out of a lab PC had no way to see it, or close it.
 */
export function AccountView({ account }: { account: StaffAccount }) {
	const others = account.devices.filter((d) => !d.current).length;

	return (
		<div className="flex max-w-3xl flex-col gap-6">
			<h1 className="m-0 text-h1">My account</h1>

			<section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col">
					<span className="text-h2">{account.name}</span>
					<span className="text-ink-2">{account.email}</span>
				</div>
				<div className="flex flex-wrap gap-x-6 gap-y-1 text-ink-2">
					<span>
						Role: <strong className="font-semibold text-ink">{account.roleLabel}</strong>
					</span>
					{account.branchName && (
						<span>
							Centre: <strong className="font-semibold text-ink">{account.branchName}</strong>
						</span>
					)}
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">Signed in on</h2>
						<p className="m-0 text-ink-2">
							{others === 0
								? "Only this device."
								: `This device and ${others === 1 ? "1 other" : `${others} others`}. If you don't recognise one, sign it out and change your password.`}
						</p>
					</div>
					{others > 0 && <SignOutEverywhereElse others={others} />}
				</div>

				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{account.devices.map((d) => (
						<li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-4 last:border-b-0">
							<span className="flex flex-col">
								<span className="font-semibold">{d.label}</span>
								<span className="text-small text-ink-2">Last used {d.lastUsedLabel}</span>
							</span>
							{d.current ? (
								<StatusPill status="active" size="sm" label="This device" />
							) : (
								<DeviceSignOutButton
									sessionId={d.id}
									label={d.label}
									note="Whoever is using it will need your email and password to get back in."
								/>
							)}
						</li>
					))}
				</ul>
			</section>

			<div>
				<LogOutButton variant="secondary" size="admin" className="" />
			</div>
		</div>
	);
}
