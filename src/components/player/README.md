# `components/player` — the test player's parts

**One responsibility:** the controls a student uses *during* a test — the timer, the question navigator, the audio player and the answer widgets.

## Every component here is presentational

They receive state and report changes. They **never**:

- know or compare against a correct answer,
- decide when time is up,
- score anything,
- read from or write to the network.

That is deliberate and enforced by review: the answer key must never reach a browser, and the server owns the clock (`MVP-1.md` §7). The parent — the player shell built in M2-15 — owns state and talks to the server through Server Actions.

## Files

| File | Is | Notes |
|---|---|---|
| `countdown.tsx` | The big timer | Calm → warning < 5 min → danger + gentle pulse < 1 min. Takes `seconds` derived from the server's `expires_at`. |
| `question-navigator.tsx` | The 1–40 grid | Four states, distinguishable without colour. Legend always visible. |
| `audio-player.tsx` | Audio controls | **Mock:** start-only, no pause, no seek, "You can't rewind". **Practice:** pause, Back 10s, Play again, speed. One file per test (MVP-1 D8). |
| `widgets/*.tsx` | Answer widgets | One file per widget key in `MVP-1.md` §10 |

### Widgets ↔ `MVP-1.md` §10

| File | Widget key | Serves question types |
|---|---|---|
| `widgets/radio.tsx` → `SingleChoice` | `radio` | `mcq_single` |
| `widgets/checkbox-n.tsx` → `ChooseN` | `checkbox_n` | `mcq_multi` |
| `widgets/segmented-3.tsx` → `SegmentedChoice` | `segmented_3` | `identifying_information` (T/F/NG), `identifying_views_claims` (Y/N/NG) |
| `widgets/dropdown-bank.tsx` → `MatchingSelect` | `dropdown_bank` | `matching`, `matching_information`, `matching_headings`, `matching_features`, `matching_sentence_endings` |
| `widgets/text-gap.tsx` → `TextAnswer`, `GapInput` | `text_gap` | every completion type + `short_answer` |
| *not built yet* | `image_label` | `plan_map_diagram_labelling`, `diagram_label_completion` — no design exists; M2-14 |

Layout **containers** for completion types (`form`, `note`, `table`, `flow_chart`, `summary`, `sentence`) are built with the player in M2-10.

## Accessibility

All widgets use **native form controls** underneath (radio, checkbox, select, text input) with custom visuals drawn from their state. That keeps keyboard navigation, screen readers and phone pickers working without extra ARIA. Keep it that way — don't replace them with `div`s and click handlers.
