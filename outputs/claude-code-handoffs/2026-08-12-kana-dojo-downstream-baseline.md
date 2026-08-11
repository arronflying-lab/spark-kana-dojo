# Claude Code handoff: KanaDojo downstream baseline

## Scope

This handoff covers the first implementation step for the Spark vocabulary
and grammar learning module. The user explicitly required using a mature GitHub
project first, and supplied `https://github.com/lingdojo/kana-dojo` as the
framework source.

This is an isolated local downstream of KanaDojo. It is not a fork of the
private Spark portal. Its server adapter can read the approved Spark views only
when the deployment supplies the existing server-side credentials; no
production import, write, or route replacement has happened.

## Repository truth

- Local downstream: `C:\Users\arron\Documents\Codex\spark-kana-dojo`
- Branch: `codex/spark-integration`
- Upstream remote: `https://github.com/lingdojo/kana-dojo.git`
- Imported upstream commit: `5b034742a6d794f6a443b35e87c54d8370e536fc`
- Baseline commit: `592aa1f6f314ae576ea4c47dc0d55acae39e5647`
- Windows compatibility commit: `aa70b2f fix: pin Windows Next SWC to matching version`
- License: upstream `AGPL-3.0-or-later`; source-offer and attribution review
  is required before any network deployment or user access.
- Release checklist: `docs/AGPL_DEPLOYMENT_CHECKLIST.md`.

## What is implemented

- Full KanaDojo upstream source is present as the runnable framework.
- `features/SparkIntegration/types.ts` defines separate vocabulary and grammar
  records and maps vocabulary records to KanaDojo's `IVocabObj` shape.
- `docs/SPARK_ADAPTER_BOUNDARY.md` records the actual Spark view contracts:
  `v_public_vocabulary` and server-only `v_study_grammar_points`.
- The adapter explicitly preserves vocabulary/grammar separation and source
  identity; no question generator is allowed to mix the two kinds.
- The Windows Next SWC package is pinned to the matching official
  `@next/swc-win32-x64-msvc@16.3.0` package instead of the upstream
  `npm:null@*` alias.
- `features/SparkIntegration/server/provider.ts` and
  `app/api/spark-learning/route.ts` now provide the first read-only Spark
  content bridge. It verifies the existing `spark_session` cookie, matches it
  to `spark_accounts`, and never accepts a browser-supplied account ID.
- `features/SparkIntegration/components/SparkVocabularyGame.tsx` is a thin
  vertical slice that feeds approved Spark vocabulary into KanaDojo's existing
  `VocabularyGame`; grammar remains a separate data kind and is not silently
  converted into vocabulary questions.
- `features/SparkIntegration/components/SparkGrammarStudy.tsx` and
  `/grammar/spark` provide a separate, read-only grammar study shell using
  Spark's `v_study_grammar_points` view. It displays existing examples and
  stored lecture text only; it does not generate grammar questions.

## Verification evidence

- `npm ci --ignore-scripts --no-audit --no-fund`: passed; 1171 packages added.
- `node_modules/@next/swc-win32-x64-msvc/package.json`: verified as
  `@next/swc-win32-x64-msvc@16.3.0` after local official tarball recovery.
- `npm run dev`: Next 16.3.0 reached `Ready` on localhost after SWC recovery.
- Targeted local ESLint for `features/SparkIntegration`: passed.
- `package.json` and `package-lock.json`: parsed successfully as JSON.
- `npm run check`: currently fails on three upstream TypeScript errors in
  `features/CrazyMode/store/useCrazyModeStore.ts` and
  `shared/ui-composite/Decorations/Decorations.tsx`; none is in the Spark
  adapter.
- `npm test`: has existing upstream Conjugator/Resources property-test
  failures; no Spark integration code is involved.
- `npm run check`: passed with 0 errors and 482 upstream warnings after the
  adapter was added.
- Spark live read-only audit on 2026-08-12: `v_public_vocabulary` returned
  11,304 rows with 0 invalid required-field rows and 0 duplicate slugs;
  `v_study_grammar_points` returned 1,000 rows with the same 0/0 quality
  result. No writes were performed.
- Anonymous local request to
  `/api/spark-learning?kind=vocabulary&level=n5`: HTTP 401 with no data.
- `npm run build`: not run because upstream `AGENTS.md` explicitly excludes it
  from verification.
- Local home-route probing still returns an upstream locale middleware 307
  redirect; this is recorded in `UPSTREAM.md` and is separate from Spark data
  integration.

## Do not do next

- Do not import Spark production data yet.
- Do not add credentials, migrations, production writes, or production
  deployment in this baseline. The server-only Supabase adapter and private
  read route are already implemented for controlled integration testing.
- Do not copy KanaDojo authentication or database code into the Spark portal.
- Do not fix unrelated upstream CrazyMode, Decorations, Conjugator, or
  Resources failures unless Aaron separately approves that scope.

## Next controlled step

Run authenticated integration tests for `/vocabulary/spark` and
`/grammar/spark`. Before any production route replacement, migration, or
deployment, Aaron must approve the pronunciation/content mapping, complete
the AGPL source-offer checklist, and decide whether the old Spark route
remains visible during the replacement trial.
