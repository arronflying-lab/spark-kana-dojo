# Spark data adapter boundary

This document defines the boundary for bringing Spark's vocabulary and
grammar data into the KanaDojo downstream. The first server-side adapter is
now implemented, but it remains a read-only integration contract; it is not a
course import or a production deployment.

## What the current repositories actually provide

The Spark repository currently defines these server-only projections:

- `v_public_vocabulary`: `slug`, `headword`, `reading`, `pos`, `meaning_zh`,
  `jlpt_level`, `updated_at`.
- `v_study_grammar_points`: `slug`, `name_ja`, `meaning_zh`, `level_code`,
  `examples`, `updated_at`, `syllabus_point_id`, plus the logged-in study
  facets `lecture_md`, `renkei_md`, and `comparison_md`.
- `v_public_grammar_points` remains the public projection and must not be
  treated as the logged-in study payload.

There is no `v_study_vocabulary` definition in the current Spark repository
snapshot. Vocabulary examples, collocations, and homograph-trap data are
stored as optional `kg_vocabulary` fields, but are not yet exposed by a
study-view contract. The adapter must not invent that view or silently use a
different source.

## Downstream contract

`features/SparkIntegration` keeps three distinctions explicit:

1. `vocabulary` and `grammar` are separate discriminated content kinds;
   question generation must never mix them accidentally.
2. Spark source identity (`slug` and, for grammar, `syllabus_point_id`) is
   retained outside KanaDojo's compact `IVocabObj` so progress can later be
   reconciled without guessing from displayed text.
3. KanaDojo's existing vocabulary engine receives only its expected
   `word`, `reading`, and `meanings[]` shape. Rich Spark fields remain in the
   source record for a later purpose-built question adapter.

The server provider reads these views through a trusted server boundary,
enforces the public vocabulary quality gate, resolves the Spark account from
the existing session, and never exposes service credentials to the browser.
This downstream contains the adapter and API route, but no migration,
production import, or production write.

## Implemented bridge

- `features/SparkIntegration/server/provider.ts` reads the two approved views
  with the server-only Supabase service-role client.
- The existing `spark_session` HMAC cookie is verified and matched against
  `spark_accounts`; no browser-provided account ID is accepted.
- `GET /api/spark-learning?kind=vocabulary|grammar&level=n1..n5` is a private,
  no-store endpoint. It returns only the selected content kind and a bounded
  level slice.
- `features/SparkIntegration/client.ts` is the browser-side fetch boundary;
  it does not import Supabase or session secrets.
- Invalid vocabulary rows (missing slug, headword, reading, or Chinese
  meaning) are rejected by the mapper instead of becoming quiz items.

The adapter intentionally uses only fields that are present in the verified
views. Examples, collocations, and homograph traps remain empty for
vocabulary until the database exposes an approved study-view contract.

The first user-facing framework slices are now present, still read-only:

- `/vocabulary/spark` feeds the approved Spark vocabulary into KanaDojo's
  existing vocabulary game.
- `/grammar/spark` reads grammar points as a separate expandable study shell;
  it does not convert grammar into vocabulary questions or invent a grammar
  answer key.

## Read-only live audit

On 2026-08-12, a service-role read-only audit of the actual Spark database
returned:

- `v_public_vocabulary`: 11,304 rows; N1/N2/N3/N4/N5 = 3,789 / 3,086 /
  2,224 / 970 / 1,235.
- `v_study_grammar_points`: 1,000 rows; N1/N2/N3/N4/N5 = 288 / 230 / 213 /
  176 / 93.
- Required-field failures: 0 in both views.
- Duplicate slugs: 0 in both views.
- Writes performed: 0.

The 1,000 grammar rows are grammar points, not the total JLPT question-bank
count. The question bank remains outside this KanaDojo adapter until a
separate mapping is approved.

## Next implementation gate

Before production exposure, Aaron must approve the final vocabulary/grammar
question mapping and complete the AGPL source-offer plan in
`docs/AGPL_DEPLOYMENT_CHECKLIST.md`. The remaining review must include a live
count audit, missing-field audit, pronunciation policy, and a decision about
the old Spark route. The framework is ready for authenticated integration
testing but does not write data, create course units, or replace the old
route.
