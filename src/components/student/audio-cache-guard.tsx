"use client";

import { useEffect } from "react";

import { purgeAllAudio, purgeOtherOwners } from "@/lib/audio-cache";

/**
 * The owner-bound purge (M2-06, D10), run on every student page and on the
 * sign-in screen. Renders nothing.
 *
 * With an `ownerId`, deletes every cached recording that is not theirs — so
 * on a shared lab PC, student B never has student A's copy of a test B has not
 * sat. Without one (the sign-in screen), deletes them all. Reads purge too
 * (`readAudio`), so this is the sweep that clears the disk, not the only gate.
 */
export function AudioCacheGuard({ ownerId }: { ownerId?: string }) {
	useEffect(() => {
		void (ownerId ? purgeOtherOwners(ownerId) : purgeAllAudio());
	}, [ownerId]);
	return null;
}
