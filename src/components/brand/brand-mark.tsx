/**
 * The Insignia logo — the gold square with the "i" and the globe.
 *
 * Decorative: it always sits next to the words "Insignia IELTS", so screen
 * readers get the name from the text and the image has an empty `alt`.
 *
 * A plain `<img>`, not `next/image`: the file is a 3 KB WebP that Cloudflare
 * serves straight from static assets, so there is nothing to optimise and no
 * image loader to configure on Workers.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- see the note above
		<img
			src="/brand/logo.webp"
			alt=""
			width={size}
			height={size}
			className="flex-none rounded-control"
			decoding="async"
		/>
	);
}
