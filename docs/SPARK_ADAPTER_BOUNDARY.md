# Spark data adapter boundary

This document defines the boundary for bringing Spark's vocabulary and
grammar data into the KanaDojo downstream. It is deliberately an adapter
contract, not a production data connection.

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

The future server provider must read these views through a trusted server
boundary, enforce the public vocabulary quality gate, resolve the Spark
account from the existing session, and never expose service credentials to
the browser. This snapshot contains no Supabase client, API route, migration,
production read, or production write.

## Next implementation gate

Before connecting real data, Aaron must approve the exact server endpoint and
the final vocabulary/grammar question mapping. That review must include a
live count audit, missing-field audit, pronunciation policy, and the AGPL
source-offer plan. Until then, the upstream KanaDojo content remains the
only runnable data source.
