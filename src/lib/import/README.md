# `lib/import`

**One responsibility:** accept one versioned authoring format, validate it, and
(in M0-17) split it into browser-safe content and server-only answer keys.

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
