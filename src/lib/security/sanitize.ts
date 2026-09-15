/**
 * Sanitises teacher- and MCP-authored passage HTML (MVP-1 §8: "the
 * highest-likelihood web vulnerability in this product"). Call it **on write**
 * (the importer, M0-17; the MCP, M8) **and on render** (the reading player,
 * M3-02) — defence in depth alongside the nonce CSP (`headers.ts`).
 *
 * The HTML is parsed into a syntax tree, filtered against a strict allowlist,
 * and re-serialised — so parser-confusion tricks (`<scr<script>ipt>`,
 * mismatched `<noscript>`, math/svg mutation XSS) come out as inert text.
 *
 * Tested in `tests/unit/sanitize.test.mjs`.
 */
import rehypeParse from "rehype-parse";
import rehypeSanitize, { type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

/**
 * What a reading passage may contain. Anything not listed is removed; an
 * unlisted element keeps its text, except those in `strip`, which vanish
 * with their contents. No links, images, ids, classes or inline styles —
 * labelling images come from R2 assets (`image_label`, §10), not passage HTML.
 */
export const PASSAGE_SCHEMA: SanitizeSchema = {
	tagNames: [
		"p", "br", "strong", "b", "em", "i", "u", "sub", "sup",
		"h3", "h4", "h5", "ul", "ol", "li", "blockquote",
		"table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
	],
	attributes: {
		// Paragraph letters for "Matching information" / "Matching headings": <p data-label="C">.
		p: [["dataLabel", /^[A-Z]{1,2}$/]],
		th: ["colSpan", "rowSpan", ["scope", "col", "row"]],
		td: ["colSpan", "rowSpan"],
	},
	ancestors: {
		li: ["ol", "ul"],
		caption: ["table"], thead: ["table"], tbody: ["table"], tfoot: ["table"],
		tr: ["table"], th: ["table"], td: ["table"],
	},
	// Removed together with everything inside them.
	strip: ["script", "style", "template", "noscript", "iframe", "object", "embed", "svg", "math", "textarea", "title", "select"],
	protocols: {},
	clobber: [],
	clobberPrefix: "",
	required: {},
	allowComments: false,
	allowDoctypes: false,
};

/** Refuse absurd inputs instead of burning Worker CPU on them (a long passage is ~15 KB). */
export const MAX_PASSAGE_HTML_LENGTH = 200_000;

const processor = unified()
	.use(rehypeParse, { fragment: true })
	.use(rehypeSanitize, PASSAGE_SCHEMA)
	.use(rehypeStringify)
	.freeze();

/**
 * Returns passage HTML with everything outside {@link PASSAGE_SCHEMA} removed.
 * Idempotent: sanitising the output again returns it unchanged.
 *
 * @throws RangeError if `html` is longer than {@link MAX_PASSAGE_HTML_LENGTH}.
 */
export function sanitizePassageHtml(html: string): string {
	if (html.length > MAX_PASSAGE_HTML_LENGTH) {
		throw new RangeError(`passage HTML is ${html.length} characters; the limit is ${MAX_PASSAGE_HTML_LENGTH}`);
	}
	return String(processor.processSync(html));
}
