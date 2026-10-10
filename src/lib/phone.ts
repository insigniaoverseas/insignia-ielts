/**
 * Indian mobile numbers as staff type them — `98765 43210`, `+91-98765-43210`,
 * `098765 43210` — reduced to the ten digits we store, or `null`.
 *
 * **Pure.** Stored as `phone` (10 digits) + `country_code` (`+91`), the shape
 * invitations already use; `displayPhone` puts them back together.
 */
export function normaliseIndianMobile(input: string): string | null {
	const digits = input.replace(/\D/g, "");
	const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
	// Indian mobile numbers start 6–9.
	return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}
