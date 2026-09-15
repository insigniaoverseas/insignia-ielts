import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint flat config.
 *
 * `eslint-config-next` 16 ships native flat configs — importing them directly is
 * required. Wrapping them in `FlatCompat` throws "Converting circular structure
 * to JSON". See PROJECT-MEMORY.md §5.
 *
 * `Design files/` is the reference prototype, not shipped code — it is read for
 * its design and its data, never built, so it is not linted.
 */
const eslintConfig = [
	...nextVitals,
	...nextTs,
	{
		ignores: [
			".next/**",
			".open-next/**",
			"cloudflare-env.d.ts",
			"Design files/**",
		],
	},
];

export default eslintConfig;
