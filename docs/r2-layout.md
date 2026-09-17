# R2 layout — exact paths, names and types

Everything the two private buckets hold, as the code actually builds it.
The authority is [`src/lib/r2-keys.ts`](../src/lib/r2-keys.ts); this page is
that file in prose. If the two disagree, the file is right.

Both buckets are **private**, the R2 public dev URL is **off**, and every key is
**server-generated** — no part of a path ever comes from a file name, a form
field or anything else a person typed.

## The two buckets

| Binding | Bucket | Holds |
|---|---|---|
| `CONTENT_BUCKET` | `insignia-ielts-content` | Questions, answers, transcripts, images |
| `AUDIO_BUCKET` | `insignia-ielts-audio` | The one MP3 per Listening test |

## Every object

`{testId}` is the `tests.id` UUID, **lowercased**. `{n}` is `content_version`, a
positive integer starting at 1. A new version never overwrites an old one, so a
test that is being re-cut stays readable to attempts already in progress.

```
insignia-ielts-content
└── tests/{testId}/v{n}/
    ├── content.json          questions, passages, audio markers — NO answers
    ├── key.json              answers, accepted variants, marks
    ├── transcript.json       timestamped cues (Listening only, optional)
    └── assets/
        ├── 1.png             labelling images, numbered by position
        ├── 2.jpg
        └── 3.webp

insignia-ielts-audio
└── audio/{testId}/v{n}/
    └── test.mp3              ONE file for the whole test
```

### Exact names and types

| Key | Content-Type | Required | Notes |
|---|---|---|---|
| `tests/{testId}/v{n}/content.json` | `application/json` | Always | Sanitised HTML. Never contains an answer. |
| `tests/{testId}/v{n}/key.json` | `application/json` | Always | Answers, `accepted_variants`, marks. |
| `tests/{testId}/v{n}/transcript.json` | `application/json` | Listening only, optional | Cues timed against `test.mp3`. |
| `tests/{testId}/v{n}/assets/{ordinal}.{ext}` | `image/png`, `image/jpeg`, `image/webp` | Only if the test has `image_label` questions | `{ordinal}` is 1, 2, 3… by position in `assets[]` — **not** the author's id or file name. `{ext}` is one of `png`, `jpg`, `jpeg`, `webp`. |
| `audio/{testId}/v{n}/test.mp3` | `audio/mpeg` | Listening only | Exactly one per test. Section changes seek within it; they never fetch again. |

There is no other key shape. `parseR2ObjectKey` refuses anything that does not
match these patterns exactly, including a wrong case in the UUID, a `v0`, or an
asset extension outside that set.

## What may be signed to a browser

`lib/r2-keys.ts` decides this before any credential is touched, so a mistake
upstream cannot leak an object.

| Object | Signed? | Conditions |
|---|---|---|
| `test.mp3` | ✅ | Attempt is `in_progress`, and the object's `testId` + version match the attempt's. 300-second URL. |
| `assets/*` | ✅ | Same as audio. |
| `transcript.json` | ⚠️ | Attempt is `submitted` **and** its results are released. |
| `content.json` | ❌ never | Read through the binding, rendered by the server. |
| `key.json` | ❌ never, under any condition | Read through the binding inside a Server Action, for scoring only. Refused before attempt context is even considered, and CI greps the client bundle for the literal. |

Signed URLs last **300 seconds** (`R2_SIGNED_URL_TTL_SECONDS`) and are scoped to
one attempt.

## Where the pieces come from

One upload JSON becomes all of the above. `prepareTestImport` performs the split:

```
your-test.json ─┬─> content.json      questions with the answers stripped out
                ├─> key.json          the answers that were stripped
                ├─> transcript.json   if the JSON has a transcript
                ├─> assets/{n}.{ext}  each entry in assets[], renumbered
                └─> test.mp3          the file named by audio.file
                └─> a row in public.tests (status: draft)
```

The author never chooses a key. `assets[].file` and `audio.file` name files
**next to the JSON on disk**; they are read, validated and then written to
server-generated keys. A file the JSON does not reference is refused rather than
ignored, and a referenced file that is missing fails the import.

See [`test-authoring.md`](test-authoring.md) for the JSON format itself.
