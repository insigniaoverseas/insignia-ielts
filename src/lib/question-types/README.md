# `lib/question-types.ts`

**One responsibility:** define the canonical IELTS Listening and Reading
question taxonomy once for the importer, authoring UI, player and scorer.

## Public contract

- `QUESTION_TYPES` is the full 18-type matrix from `MVP-1.md` §10.
- `QUESTION_TYPE_KEYS` is the ordered key list for upload-schema enums and UI
  menus.
- `getQuestionTypeDefinition(type)` returns the official name, renderer,
  completion container and format availability.
- `isTypeAllowed(type, skill, variant)` returns `allowed`, `warning` or
  `disallowed`. It is deliberately not boolean: General Training permits
  Y/N/NG and matching sentence endings only after an authoring warning.
- `isQuestionType(value)` narrows untrusted strings before indexing the map.

Question-type keys are persisted in R2 content and database rows. Renaming a
key requires a content/data migration; changing only `officialName` does not.

The player view-model re-exports `WidgetKey` and `ContainerKey` from this
module for compatibility. Do not recreate those unions elsewhere.
