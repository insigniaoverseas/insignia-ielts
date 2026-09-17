import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
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

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
