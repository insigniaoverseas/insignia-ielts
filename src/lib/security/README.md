# `lib/security`

**One responsibility:** browser-facing defences — response headers now; passage HTML sanitising next (BUILD-STEPS step 9, M0-13).

| File | What it is |
|---|---|
| `headers.ts` | `generateNonce()`, `contentSecurityPolicy()`, `securityHeaders()`, `STATIC_SECURITY_HEADERS`. Pure; used by `src/proxy.ts` on every page and API response. Tested in `tests/unit/security-headers.test.mjs`. |

## How the CSP works here

- `src/proxy.ts` makes a fresh nonce per request and sets the CSP on **both** the request (Next.js reads the nonce from it and stamps its own scripts) and the response.
- Scripts: `'nonce-…' 'strict-dynamic'`, **never `'unsafe-inline'`** — an injected `<script>` is blocked (verified in Chrome, 2026-09-15).
- Styles: `'unsafe-inline'` on purpose — nonces can't cover `style=""` attributes, and CSS can't run code.
- **Every page renders per request** (`await connection()` in the root layout). A prerendered page has no nonce, so its scripts would be blocked. Don't add `export const dynamic = "force-static"` anywhere.
- Static files skip the Worker; `public/_headers` gives them the non-CSP headers. Keep it in step with `STATIC_SECURITY_HEADERS` (a unit test checks).

**Adding a third party** (Turnstile M1-11, Sentry, R2 audio M2-06) means adding its origin to the right directive in `headers.ts` — and a test line saying why.
