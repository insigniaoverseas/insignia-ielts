/**
 * Screen 22's CSV import sends rows to the server this many at a time (M5-04).
 *
 * Each invitation costs about five subrequests — the duplicate checks, the
 * insert, the email and the audit row — and Workers Free allows 50 per
 * request, so a whole batch can never go in one call. Five leaves headroom.
 */
export const CSV_INVITE_CHUNK = 5;
