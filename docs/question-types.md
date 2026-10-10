# Question types

The reference the importer, the player and the scorer are built against. **`src/lib/question-types.ts` is the single source of truth** — this page is generated from it; if they ever disagree, the code wins and this page is wrong.

## The canonical model

IELTS publishes 25 official type names across Listening, Academic Reading and General Training Reading. They collapse into **18 canonical types** rendered by **6 widgets**, without losing the official names analytics groups by. Each question group in a test has three fields:

- **`type`** — the official IELTS type. Persisted in R2 content and in `answer_marks.question_type`; it is what "True/False/Not Given — 41%" on My Progress groups by. **Renaming a key needs a data migration**; changing only its display name does not.
- **`widget`** — the control the player draws.
- **`container`** — the layout around a `text_gap` (completion types only).

## The matrix

✅ allowed · ⚠️ allowed with a warning in authoring (not on ielts.org's list for that variant) · — not allowed. Columns: **L** Listening, **AC** Academic Reading, **GT** General Training Reading.

| `type` | Official name | `widget` | `container` | L | AC | GT |
|---|---|---|---|:-:|:-:|:-:|
| `mcq_single` | Multiple choice | `radio` | — | ✅ | ✅ | ✅ |
| `mcq_multi` | Multiple choice (choose N) | `checkbox_n` | — | ✅ | ✅ | ✅ |
| `identifying_information` | Identifying information (T/F/NG) | `segmented_3` | — | — | ✅ | ✅ |
| `identifying_views_claims` | Identifying writer's views/claims (Y/N/NG) | `segmented_3` | — | — | ✅ | ⚠️ |
| `matching` | Matching | `dropdown_bank` | — | ✅ | — | — |
| `matching_information` | Matching information | `dropdown_bank` | — | — | ✅ | ✅ |
| `matching_headings` | Matching headings | `dropdown_bank` | — | — | ✅ | ✅ |
| `matching_features` | Matching features | `dropdown_bank` | — | — | ✅ | ✅ |
| `matching_sentence_endings` | Matching sentence endings | `dropdown_bank` | — | — | ✅ | ⚠️ |
| `form_completion` | Form completion | `text_gap` | `form` | ✅ | — | — |
| `note_completion` | Note completion | `text_gap` | `note` | ✅ | ✅ | ✅ |
| `table_completion` | Table completion | `text_gap` | `table` | ✅ | ✅ | ✅ |
| `flow_chart_completion` | Flow-chart completion | `text_gap` | `flow_chart` | ✅ | ✅ | ✅ |
| `summary_completion` | Summary completion | `text_gap` | `summary` | — | ✅ | ✅ |
| `sentence_completion` | Sentence completion | `text_gap` | `sentence` | ✅ | ✅ | ✅ |
| `short_answer` | Short-answer questions | `text_gap` | `plain` | ✅ | ✅ | ✅ |
| `plan_map_diagram_labelling` | Plan/map/diagram labelling | `image_label` | — | ✅ | — | — |
| `diagram_label_completion` | Diagram label completion | `image_label` | — | — | ✅ | ✅ |

**The official GT list omits Yes/No/Not Given and Matching sentence endings.** That is what ielts.org says, not a transcription error — they stay ⚠️, not —. Don't "fix" it. `isTypeAllowed(type, skill, variant)` returns `allowed`, `warning` or `disallowed` for exactly this reason.

## The six widgets

| Widget | What the student sees | Used by |
|---|---|---|
| `radio` | One choice from a list, 56 px rows | multiple choice |
| `checkbox_n` | Choose exactly N, with a live "1 of 2 chosen" count | multiple choice (choose N) |
| `segmented_3` | Three large buttons | T/F/NG and Y/N/NG |
| `dropdown_bank` | A dropdown per item, all drawing from one shared option bank | all five matching types |
| `text_gap` | A text box with a word limit; the `container` decides the layout around it | every completion type and short answer |
| `image_label` | Inputs or dropdowns positioned over a picture | the two labelling types |

Containers for `text_gap`: `form`, `note`, `table`, `flow_chart`, `summary`, `sentence`, `plain`. `summary_completion` may also carry a **`word_bank`** (summaries "with and without a word bank"); no other type may.

One control can answer several numbered questions: a choose-two `checkbox_n` "covers" two numbers, so the navigator counts 40 questions even when there are 38 controls.

## Test structure

| | Listening | Academic Reading | GT Reading |
|---|---|---|---|
| Questions | 40 | 40 | 40 |
| Sections | 4 parts | 3 passages | 3 sections (2–3 / 2 / 1 texts) |
| Time | ~30 min + 2 min to check | 60 min, no transfer time | 60 min, no transfer time |
| Audio | one file, heard once (mock and class) | — | — |

A Reading section can hold more than one text, so `content.json` sections carry `passages[]`. Labelling types need images, which travel as test assets (`tests.r2_assets_prefix`). Numbering must be contiguous from 1, but not necessarily 40 long — the institute's Easy Test 1 Listening has 41.

## How answers are marked

All in `src/lib/scoring.ts`, server-only. The key is validated by `answerKeySchema` both at import and before every marking.

- **One mark per question, no negative marking.**
- **Exact match after normalising** — Unicode NFKC, surrounding and repeated spaces removed, lower-cased. Nothing else is forgiven: **a plural or a different spelling is wrong unless it is listed** in the question's `accepted_variants` (that is where British/American spellings go).
- **Word limits are enforced.** "NO MORE THAN TWO WORDS" over the limit scores **zero**, even if the right words are in it. Words joined by a hyphen or apostrophe count as one ("check-in", "o'clock"); so do numbers written with separators ("1,500", "3.5").
- **An empty answer is wrong.**
- **Choose N:** the student must pick exactly N different options, in any order. Each correct option earns one of the N marks; picking the wrong count, or the same option twice, scores zero for all N.
- **Choice questions** (radio, segmented, dropdown) have exactly one right answer and no spelling variants.
- **Band:** the raw score is looked up in the assignment's band scale (`band_scales` / `band_scale_rows`, editable in admin, never hardcoded). Every chart is written out of 40, so a paper of another length is read at its score scaled to 40 and rounded (41/41 → 40 → 9.0); the stored raw score stays the real one. The lowest row of a chart may be **"Below 4"**: that stores `below_band` instead of `band` and is left out of band averages.
- **Re-marking:** correcting a key in the answer-key editor re-marks every finished attempt on that version; a mark a teacher gave by hand (`answer_marks.overridden_by`) survives.

## Where this lives in code

| File | Role |
|---|---|
| `src/lib/question-types.ts` | The matrix above, `isTypeAllowed`, widget and container keys |
| `src/lib/import/test-upload.schema.ts` | The upload format; rejects types not allowed for the test's skill/variant |
| `src/components/player/question-group.tsx`, `widgets/` | One component per widget |
| `src/lib/scoring.ts` | `answerKeySchema`, `normalizeAnswer`, `countWords`, `scoreQuestion`, `bandFor` |
| `src/lib/attempts/band.ts` | Reading a chart out of 40 |

Authoring format and worked examples: [`test-authoring.md`](test-authoring.md).
