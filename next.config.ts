import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
	experimental: {
		/*
		 * How long the browser keeps a page it has already loaded.
		 *
		 * `static` covers pages loaded by a full prefetch — the nav tabs, which
		 * pass `prefetch` on their Links. They are fetched in the background and
		 * reused for a minute, so switching tabs needs no server round trip.
		 * The Server Actions behind those pages call `revalidatePath`, which
		 * clears this cache, so nobody sees their own change missing.
		 * What another person changes (a teacher releasing results) shows within
		 * a minute.
		 *
		 * `dynamic` stays at its default of 0 on purpose: it would also cache
		 * the test player, whose payload carries the saved answers and the
		 * seconds left at render time. A player reopened from cache could show
		 * answers from before the student left it.
		 */
		staleTimes: {
			static: 60,
		},
		serverActions: {
			/*
			 * A Listening test's MP3 is the whole recording — the supplied paper's
			 * is ~15 MB — and it is posted to the import Server Action together
			 * with the JSON and any labelling images. The 1 MB default refuses
			 * that before any of our code runs.
			 *
			 * The limit is on the raw multipart body, so this leaves roughly
			 * double the largest expected recording as headroom. Anything much
			 * larger should upload straight to R2 on a presigned PUT instead of
			 * travelling through the Worker (M8-04's `request_audio_upload`).
			 */
			bodySizeLimit: "32mb",
		},
	},
};

/**
 * `getCloudflareContext()` needs a local platform proxy under `next dev`
 * (https://opennext.js.org/cloudflare/bindings#local-access-to-bindings).
 *
 * Only there. The R2 bindings are `remote: true` so local runs read the real
 * buckets, and a remote proxy has to log in to Cloudflare — which `next build`
 * in CI cannot, and does not need: every page is dynamic, so nothing reads a
 * binding at build time.
 */
export default async function config(phase: string): Promise<NextConfig> {
	if (phase === PHASE_DEVELOPMENT_SERVER) {
		const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
		initOpenNextCloudflareForDev();
	}
	return nextConfig;
}
