/**
 * The raw score a band chart is read at.
 *
 * Every band chart in `band_scale_rows` is written out of 40, as IELTS
 * publishes them. A paper with a different count — the institute's Easy Test 1
 * Listening has 41 — is read at its score scaled to 40, rounded to the
 * nearest mark, so 41/41 is 40 (band 9) and 20/41 is 20. A 40-question paper
 * is read as-is. The stored raw score is always the real one.
 */
export const BAND_CHART_OUT_OF = 40;

/** The raw score to look up in a chart out of {@link BAND_CHART_OUT_OF}. */
export function bandLookupScore(rawScore: number, maxScore: number): number {
	if (!Number.isFinite(rawScore) || !Number.isFinite(maxScore) || maxScore <= 0) {
		throw new RangeError("rawScore and a positive maxScore are required");
	}
	if (maxScore === BAND_CHART_OUT_OF) return rawScore;
	return Math.min(BAND_CHART_OUT_OF, Math.max(0, Math.round((rawScore * BAND_CHART_OUT_OF) / maxScore)));
}
