"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
	interface Window {
		turnstile?: { render(container: HTMLElement, options: Record<string, unknown>): string; remove(widgetId: string): void };
	}
}

/** Browser half only; the Server Action verifies the submitted token. */
export function Turnstile({ siteKey, action, resetKey }: { siteKey: string; action: string; resetKey?: string }) {
	const container = useRef<HTMLDivElement>(null);
	const [loaded, setLoaded] = useState(false);
	const [token, setToken] = useState("");
	useEffect(() => {
		if (!loaded || !container.current || !window.turnstile) return;
		const widgetId = window.turnstile.render(container.current, {
			sitekey: siteKey, action, callback: (value: string) => setToken(value),
			"expired-callback": () => setToken(""), "error-callback": () => setToken(""),
		});
		return () => window.turnstile?.remove(widgetId);
	}, [action, loaded, resetKey, siteKey]);
	return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div ref={container} /><input type="hidden" name="cf-turnstile-response" value={token} /></>;
}
