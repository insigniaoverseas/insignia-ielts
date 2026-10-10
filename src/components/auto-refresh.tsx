"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { REFRESH_MS, shouldRefreshOnActivity, shouldRefreshOnTick } from "@/lib/refresh-policy";

/*
 * Used by the student, teacher and admin layouts, which each load their pages'
 * data once (a "bundle") and keep it in the browser. This is what keeps that
 * data, and the session check that comes with it, fresh.
 */

/**
 * Re-renders the current layout every {@link REFRESH_MS} while someone is
 * actually using the app, and as soon as they come back to the tab after being
 * away longer than that.
 *
 * Each refresh re-runs the layout's guard, so a session ended elsewhere (a
 * sign-in on another device, a revoked device) is noticed within a minute,
 * and what someone else changed — a released result, a new test, a student
 * added at the front desk — appears.
 * An idle or hidden tab makes no requests — and the first touch after being
 * idle checks at once, so a device whose session ended while nobody was
 * using it signs out on that touch, not up to a minute later.
 */
export function AutoRefresh() {
	const router = useRouter();

	useEffect(() => {
		let lastActivity = Date.now();
		let lastRefresh = Date.now();

		const refresh = () => {
			lastRefresh = Date.now();
			router.refresh();
		};
		const onActivity = () => {
			const now = Date.now();
			const refreshNow = shouldRefreshOnActivity(now, lastActivity, lastRefresh);
			lastActivity = now;
			if (refreshNow) refresh();
		};
		const onVisible = () => {
			if (document.visibilityState === "visible" && Date.now() - lastRefresh > REFRESH_MS) refresh();
		};

		const timer = setInterval(() => {
			if (shouldRefreshOnTick(Date.now(), lastActivity, document.visibilityState === "visible")) refresh();
		}, REFRESH_MS);

		const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
		for (const event of events) window.addEventListener(event, onActivity, { passive: true });
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(timer);
			for (const event of events) window.removeEventListener(event, onActivity);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [router]);

	return null;
}
