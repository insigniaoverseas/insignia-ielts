# Authoring IELTS tests

This is the author-facing contract for test upload JSON. The same schema is
used by the command-line importer, admin interface and authoring MCP, so a file
that validates here behaves the same through every entry point.

The format is currently `schema_version: 1`. Objects are strict: misspelled or
unknown fields are rejected. HTML in `prompt`, `instructions` and passage
`html` is sanitised when the importer writes it; use only the passage markup
listed in `src/lib/security/README.md`.

## Top-level fields

| Field | Required | Meaning |
|---|---:|---|
| `schema_version` | yes | Must be `1`. |
| `title` | yes | Test or practice-set title. |
| `skill` | yes | `listening` or `reading`. |
| `variant` | yes | Listening uses `n_a`; Reading uses `academic` or `general`. |
| `difficulty` | yes | `easy`, `medium` or `hard`. |
| `duration_seconds` | yes | Main test time. |
| `transfer_seconds` | yes | Listening check/transfer time; Reading must use `0`. |
| `kind` | yes | `mock`, `class` or `practice`. |
| `practice_question_type` | practice only | One canonical key from `lib/question-types.ts`. Every group in a practice set must use it. |
| `tags` | yes | Unique lowercase identifiers such as `cambridge-18`; use hyphens, not spaces. |
| `audio` | Listening only | One MP3 for the entire test: `{ "file", "duration_seconds" }`. |
| `assets` | yes | Images used by `image_label` groups. PNG, JPEG and WebP only. May be empty. |
| `sections` | yes | One or more sections in numeric order, starting at 1. |
| `transcript` | Listening only | Optional ordered cues: `{ "at_seconds", "speaker", "text" }`. |

File fields contain names only, never directories. The importer generates all
R2 paths; an uploaded JSON file cannot choose an object key.

## Validate or import from the command line

Keep the referenced MP3/images beside the JSON, then run a write-free check:

```bash
npm run import:test -- ./path/to/test.json --actor <active-author-uuid> --dry-run
```

After reviewing the result, remove `--dry-run` to write a remote R2 draft and
its audited Supabase catalogue row. The write command requires a logged-in
Cloudflare CLI plus `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the gitignored
`.dev.vars`. It never publishes the test. The actor must be active and hold
`test:author`; their id is stored on both the draft and audit record.

Images are limited to 5 MiB and must match their PNG/JPEG/WebP extension and
MIME. The single MP3 is limited to 20 MiB, must be mono, and must not exceed
64 kbps. The importer sanitises all authored HTML and refuses a field that is
empty after sanitising.

## Sections

| Field | Required | Meaning |
|---|---:|---|
| `n` | yes | Consecutive section number, starting at 1. |
| `title` | yes | Student-facing section or passage title. |
| `starts_at_seconds`, `ends_at_seconds` | Listening only | Non-overlapping offsets into the one MP3. |
| `passages` | yes | Empty for Listening. Reading uses 1–3 `{ "title", "html" }` objects; Academic uses exactly one per section. |
| `question_groups` | yes | One or more groups sharing a type and instruction. |

Question numbers are consecutive across every section. The first is 1. A
multi-answer control can cover consecutive numbers with `covers`, for example
`"n": 2, "covers": [2, 3]`.

## Question groups

Every `type`, `widget` and `container` combination is defined by
`lib/question-types.ts`; the upload schema refuses mismatches.

| Field | Used by | Meaning |
|---|---|---|
| `type` | all | Canonical IELTS type key. |
| `widget` | all | `radio`, `checkbox_n`, `segmented_3`, `dropdown_bank`, `text_gap` or `image_label`. |
| `container` | completion types | Exact layout for the type: `form`, `note`, `table`, `flow_chart`, `summary`, `sentence` or `plain`. Omit for other types. |
| `instructions` | all | Student-facing instruction; basic safe HTML is allowed. |
| `word_limit` | text entry | Maximum scored words. Required for `text_gap`, and for an `image_label` without an option bank. |
| `word_bank` | summary only | Optional shared words for `summary_completion`. |
| `option_bank` | matching/image labels | Required for matching; optional for image labels that use dropdowns. |
| `choose` | multiple-answer MCQ | Number of choices required. Each control must cover and award that many question marks. |
| `asset_id` | image labels | Must match an object in top-level `assets`. |
| `questions` | all | One or more question objects. |

The official General Training list omits `identifying_views_claims` and
`matching_sentence_endings`. They validate with an authoring warning rather
than being blocked. All other types outside their official skill/variant are
errors.

## Questions and answer keys

| Field | Required | Meaning |
|---|---:|---|
| `n` | yes | First question number represented by this control. |
| `covers` | multi-answer only | Consecutive question numbers covered by one `checkbox_n` control. |
| `prompt` | yes | Student-facing prompt; basic safe HTML is allowed. |
| `options` | MCQ only | Unique choices for `radio` or `checkbox_n`. |
| `marks` | yes | One per numbered question. Normally `1`; a control covering `[2, 3]` uses `2`. |
| `answer` | yes | Canonical answer(s). Choice answers must exactly match an option or bank entry. |
| `accepted_variants` | no | Extra accepted spellings or representations, such as `colour` / `color` or `20` / `twenty`. |

`answer`, `accepted_variants`, `marks` and group `word_limit` are removed from
browser content and written to server-only `key.json` by M0-17. Do not put an
answer in a prompt, instruction, option label, passage or asset filename.

## Worked sample: Listening

This compact, valid test demonstrates every type that is unique to or valid
for Listening. A production mock normally has four sections and 40 numbered
questions; publication performs that completeness check separately.

<!-- sample:listening:start -->
```json
{
  "schema_version": 1,
  "title": "Listening authoring example",
  "skill": "listening",
  "variant": "n_a",
  "difficulty": "medium",
  "duration_seconds": 600,
  "transfer_seconds": 60,
  "kind": "class",
  "tags": ["authoring-example", "listening"],
  "audio": { "file": "test.mp3", "duration_seconds": 600 },
  "assets": [
    { "id": "club-map", "file": "club-plan.png", "alt": "Plan of the sports club" }
  ],
  "sections": [
    {
      "n": 1,
      "title": "A phone call about a sports club",
      "starts_at_seconds": 0,
      "ends_at_seconds": 600,
      "passages": [],
      "question_groups": [
        {
          "type": "mcq_single",
          "widget": "radio",
          "instructions": "Choose the correct answer.",
          "questions": [
            {
              "n": 1,
              "prompt": "How did the caller hear about the club?",
              "options": ["A poster", "A friend", "The website"],
              "marks": 1,
              "answer": ["A friend"]
            }
          ]
        },
        {
          "type": "mcq_multi",
          "widget": "checkbox_n",
          "instructions": "Choose TWO answers.",
          "choose": 2,
          "questions": [
            {
              "n": 2,
              "covers": [2, 3],
              "prompt": "Which TWO facilities are free?",
              "options": ["Pool", "Gym", "Cafe", "Parking"],
              "marks": 2,
              "answer": ["Pool", "Parking"]
            }
          ]
        },
        {
          "type": "matching",
          "widget": "dropdown_bank",
          "instructions": "Match the facility to its location.",
          "option_bank": ["A - ground floor", "B - first floor", "C - outside"],
          "questions": [
            { "n": 4, "prompt": "Reception", "marks": 1, "answer": ["A - ground floor"] }
          ]
        },
        {
          "type": "form_completion",
          "widget": "text_gap",
          "container": "form",
          "instructions": "Write ONE WORD for each answer.",
          "word_limit": 1,
          "questions": [
            { "n": 5, "prompt": "Riverside ___ Club", "marks": 1, "answer": ["Tennis"], "accepted_variants": ["tennis"] }
          ]
        },
        {
          "type": "note_completion",
          "widget": "text_gap",
          "container": "note",
          "instructions": "Complete the notes.",
          "word_limit": 2,
          "questions": [
            { "n": 6, "prompt": "Open on ___ mornings", "marks": 1, "answer": ["Saturday"] }
          ]
        },
        {
          "type": "table_completion",
          "widget": "text_gap",
          "container": "table",
          "instructions": "Complete the table.",
          "word_limit": 2,
          "questions": [
            { "n": 7, "prompt": "Annual fee: ___", "marks": 1, "answer": ["85 pounds"], "accepted_variants": ["£85"] }
          ]
        },
        {
          "type": "flow_chart_completion",
          "widget": "text_gap",
          "container": "flow_chart",
          "instructions": "Complete the flow chart.",
          "word_limit": 1,
          "questions": [
            { "n": 8, "prompt": "Complete form, then contact the ___", "marks": 1, "answer": ["manager"] }
          ]
        },
        {
          "type": "sentence_completion",
          "widget": "text_gap",
          "container": "sentence",
          "instructions": "Complete the sentence.",
          "word_limit": 2,
          "questions": [
            { "n": 9, "prompt": "Lessons begin in ___.", "marks": 1, "answer": ["early April"] }
          ]
        },
        {
          "type": "short_answer",
          "widget": "text_gap",
          "container": "plain",
          "instructions": "Answer using ONE WORD.",
          "word_limit": 1,
          "questions": [
            { "n": 10, "prompt": "Who confirms the booking?", "marks": 1, "answer": ["receptionist"] }
          ]
        },
        {
          "type": "plan_map_diagram_labelling",
          "widget": "image_label",
          "instructions": "Choose the correct letter for the reception desk.",
          "option_bank": ["A", "B", "C"],
          "asset_id": "club-map",
          "questions": [
            { "n": 11, "prompt": "Reception desk", "marks": 1, "answer": ["B"] }
          ]
        }
      ]
    }
  ],
  "transcript": [
    { "at_seconds": 12, "speaker": "Receptionist", "text": "Riverside Tennis Club, how may I help?" }
  ]
}
```
<!-- sample:listening:end -->

## Worked sample: Academic Reading

This sample covers the Reading-only type families, including a summary with a
word bank and an image label completed with text.

<!-- sample:academic:start -->
```json
{
  "schema_version": 1,
  "title": "Academic Reading authoring example",
  "skill": "reading",
  "variant": "academic",
  "difficulty": "hard",
  "duration_seconds": 1200,
  "transfer_seconds": 0,
  "kind": "mock",
  "tags": ["academic", "authoring-example"],
  "assets": [
    { "id": "tram-parts", "file": "tram-parts.webp", "alt": "Labelled diagram of a modern tram" }
  ],
  "sections": [
    {
      "n": 1,
      "title": "The return of the urban tram",
      "passages": [
        {
          "title": "The return of the urban tram",
          "html": "<p data-label=\"A\">Modern tram systems have returned to many cities.</p>"
        }
      ],
      "question_groups": [
        {
          "type": "identifying_information",
          "widget": "segmented_3",
          "instructions": "Write TRUE, FALSE or NOT GIVEN.",
          "questions": [
            { "n": 1, "prompt": "Every city removed its trams by 1970.", "marks": 1, "answer": ["False"] }
          ]
        },
        {
          "type": "identifying_views_claims",
          "widget": "segmented_3",
          "instructions": "Write YES, NO or NOT GIVEN.",
          "questions": [
            { "n": 2, "prompt": "The writer believes fixed rails encourage investment.", "marks": 1, "answer": ["Yes"] }
          ]
        },
        {
          "type": "matching_information",
          "widget": "dropdown_bank",
          "instructions": "Choose the paragraph containing the information.",
          "option_bank": ["A", "B", "C"],
          "questions": [
            { "n": 3, "prompt": "A comparison of vehicle lifetimes", "marks": 1, "answer": ["B"] }
          ]
        },
        {
          "type": "matching_headings",
          "widget": "dropdown_bank",
          "instructions": "Choose the correct heading.",
          "option_bank": ["i - A permanent promise", "ii - A cheaper vehicle", "iii - An old fashion"],
          "questions": [
            { "n": 4, "prompt": "Paragraph C", "marks": 1, "answer": ["i - A permanent promise"] }
          ]
        },
        {
          "type": "matching_features",
          "widget": "dropdown_bank",
          "instructions": "Match each claim to a transport type.",
          "option_bank": ["A - tram", "B - bus"],
          "questions": [
            { "n": 5, "prompt": "Its route can be changed.", "marks": 1, "answer": ["B - bus"] }
          ]
        },
        {
          "type": "matching_sentence_endings",
          "widget": "dropdown_bank",
          "instructions": "Complete each sentence with the correct ending.",
          "option_bank": ["A - before services start", "B - after thirty years", "C - without new track"],
          "questions": [
            { "n": 6, "prompt": "Property values may rise", "marks": 1, "answer": ["A - before services start"] }
          ]
        },
        {
          "type": "summary_completion",
          "widget": "text_gap",
          "container": "summary",
          "instructions": "Choose ONE WORD from the box.",
          "word_limit": 1,
          "word_bank": ["rails", "drivers", "buses"],
          "questions": [
            { "n": 7, "prompt": "Developers see fixed ___ as a long-term promise.", "marks": 1, "answer": ["rails"] }
          ]
        },
        {
          "type": "diagram_label_completion",
          "widget": "image_label",
          "instructions": "Write ONE WORD from the passage.",
          "word_limit": 1,
          "asset_id": "tram-parts",
          "questions": [
            { "n": 8, "prompt": "Power collector", "marks": 1, "answer": ["pantograph"] }
          ]
        }
      ]
    }
  ]
}
```
<!-- sample:academic:end -->

## Worked sample: General Training Reading

GT sections may contain multiple short texts. This practice set deliberately
contains only its declared question type.

<!-- sample:general:start -->
```json
{
  "schema_version": 1,
  "title": "GT matching information practice",
  "skill": "reading",
  "variant": "general",
  "difficulty": "easy",
  "duration_seconds": 600,
  "transfer_seconds": 0,
  "kind": "practice",
  "practice_question_type": "matching_information",
  "tags": ["authoring-example", "general-training"],
  "assets": [],
  "sections": [
    {
      "n": 1,
      "title": "Community notices",
      "passages": [
        { "title": "Notice A", "html": "<p>The library closes at 6 p.m. on Fridays.</p>" },
        { "title": "Notice B", "html": "<p>The sports hall is closed for repairs this week.</p>" }
      ],
      "question_groups": [
        {
          "type": "matching_information",
          "widget": "dropdown_bank",
          "instructions": "Which notice contains the following information?",
          "option_bank": ["A", "B"],
          "questions": [
            { "n": 1, "prompt": "A change caused by maintenance", "marks": 1, "answer": ["B"] },
            { "n": 2, "prompt": "An earlier closing time", "marks": 1, "answer": ["A"] }
          ]
        }
      ]
    }
  ]
}
```
<!-- sample:general:end -->

## Reading validation errors

Zod issues carry the complete JSON path. Authoring tools should place an issue
beside that field instead of showing one generic “invalid test” message. For
example:

```text
sections.0.question_groups.2.questions.4.answer.0
Answer must exist in the question options or group bank
```

Fix every reported path, validate again, and only then import. Validation does
not write to Postgres or R2.
