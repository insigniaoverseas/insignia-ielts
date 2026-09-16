# `lib/import`

**One responsibility:** accept one versioned authoring format, validate it,
split it into browser-safe content and server-only answer keys, and upload the
result through caller-supplied storage/catalogue adapters.

## `test-upload.schema.ts`

`testUploadSchema` is the boundary used by the future CLI, admin screen and MCP.
It is strict at every object level: a typo such as `anwser` is an error, not a
field Zod silently removes. `TestUpload` and `TestUploadInput` are inferred from
the schema; never create parallel interfaces.

The schema imports question keys, widgets, containers and format availability
from `lib/question-types.ts`. It validates:

- Listening vs Reading variant, audio, transcript, marker and passage rules;
- widget/container/type agreement and widget-specific fields;
- answer membership for choice, bank and segmented questions;
- one mark per numbered question, including multi-answer controls;
- contiguous, unique question and section numbers;
- practice sets containing exactly their declared question type;
- safe file names, unique asset ids and valid image references; and
- precise nested issue paths for authoring tools to display beside a question.

General Training Y/N/NG and matching sentence endings intentionally validate:
`lib/question-types.ts` labels them `warning`, not `disallowed`. The authoring
caller is responsible for showing that warning before publication.

Worked payloads and field documentation are in `docs/test-authoring.md`. Unit
tests parse those code blocks directly, making the documentation executable.

## `import-test.ts`

`prepareTestImport()` is the only content/key split. `importTest()` wraps it in
the upload transaction used by the CLI and, later, the admin UI and MCP. A
caller supplies R2 `put`/`delete` and catalogue `createDraft` adapters; it must
not reproduce the split.

The pipeline, in order:

1. validates the full JSON before any write;
2. checks that every referenced file exists and no unreferenced file was sent;
3. checks declared MIME plus PNG/JPEG/WebP or MP3 magic bytes, caps images at
   5 MiB and audio at 20 MiB, and rejects stereo or MP3 bitrate above 64 kbps;
4. sanitises every instruction, prompt and passage, refusing fields that
   become empty;
5. generates the UUID/version R2 layout and splits `answer`,
   `accepted_variants`, `marks` and `word_limit` into `key.json` only;
6. uploads private objects, then creates a `draft` catalogue row; and
7. attempts reverse-order object cleanup if any upload/catalogue step fails.

Asset source names are used only to load local files. `content.json` gets
`{ id, alt, ordinal }`; the object name is the server-generated ordinal and
allowlisted extension. The output can never inherit an author-controlled path.

## Legacy Listening converter

`legacy-listening.ts` converts a source paper written in the design prototype's
`ielts-data.js` shape into the same upload contract. It checks that all 40
questions are sequential, assigned to the expected four sections, have non-empty
answers and use Listening-valid canonical types.

It derives the structure from the paper instead of assuming a fixed layout:

- Consecutive questions collapse into the longest run one canonical group can
  hold. A run breaks on a changed word limit, container, matching bank or
  multi-answer prompt, so the groups match the printed paper's question ranges.
- Each text group takes its `word_limit` from the source instruction line
  ("Write ONE WORD ONLY", "NO MORE THAN THREE WORDS"). Scoring enforces that
  limit, so an instruction the converter cannot read is a hard error rather than
  a guessed default.
- A `container` of `form`, `note` or `table` picks the matching completion type.
- A "choose TWO letters" run is one control covering both numbers and worth one
  mark per number, which is the shape scoring expects for partial credit.
- T/F/NG maps to `identifying_information`, which the upload schema then rejects
  for Listening. An earlier draft laundered it into plain multiple choice; a
  Listening paper containing it is wrong and must fail loudly.
- `duration_seconds` is at least the audio duration. The server owns the timer
  (MVP-1 §7), so a clock shorter than the recording would cut off every
  candidate mid-test.

A source paper includes answers but no recording or audio markers. The converter
therefore requires a real MP3 duration and four contiguous section endpoints; it
refuses to invent them.

`scripts/import-legacy-tests.ts` loads the paper from `--source`, writes the
local upload JSON, and delegates any dry-run or remote import to the canonical
CLI. Keep both the source paper and the generated JSON outside this repository:
they contain the answer key, and this repository is public. `Sample test/` is
gitignored for exactly that reason.
