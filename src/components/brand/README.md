# Brand

The Insignia logo and where it comes from.

- `brand-mark.tsx` — `<BrandMark size={32} />`, the logo image used in every header and on the sign-in screens.

## Files

All in `public/`, served by Cloudflare as static assets (no Worker run, no R2 round-trip):

| File | Size | Used for |
| --- | --- | --- |
| `brand/logo.webp` | 192 px | `BrandMark` (sharp up to 64 px on a 3× screen) |
| `favicon.ico` | 16 / 32 / 48 px | Browser tab, older browsers |
| `brand/icon-32.png` | 32 px | Browser tab, modern browsers |
| `brand/apple-touch-icon.png` | 180 px | iPhone / iPad home screen |

They were made from the original `logo.jpg` (1001 px square) with Pillow, using Lanczos resizing and WebP at quality 88. To change the logo, make new copies at the same sizes **with the same names**. `/brand/*` is cached for a day (see `public/_headers`), so a new logo reaches everyone within 24 hours.

## Colours

The `--brand` tokens in `src/app/globals.css` come from the logo's magenta, darkened to `#b42d7f` so white button text has 5.8:1 contrast (WCAG AA). The logo's own `#c93b8d` only reaches 4.67:1.
