# IELTS Practice Platform — project notes

- Typography: sans-serif only (Inter), plus IBM Plex Mono for timers, scores, phone numbers. No serif or display face.
- Difficulty is a fixed three-level scale: Easy / Medium / Hard. Always shown as the word plus a three-bar indicator, never colour alone.
- Tokens follow the brief's palette and map 1:1 to the Tailwind config block in `00 Design System.dc.html`. The user builds in Tailwind, so keep every value on Tailwind's scale (spacing 4/8/12/16/24/32/48/64, radius 8/12/full).
- One file per screen, numbered to match the brief's screen list.
- Shared question content and band scoring live in `ielts-data.js`.
