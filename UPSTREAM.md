# KanaDojo downstream provenance

This directory is a local downstream application based on the upstream
repository [lingdojo/kana-dojo](https://github.com/lingdojo/kana-dojo).

- Upstream repository: `https://github.com/lingdojo/kana-dojo.git`
- Imported commit: `5b034742a6d794f6a443b35e87c54d8370e536fc`
- Imported on: `2026-08-11`
- Source archive SHA-256: `19165592BC5D54B1D180DBF448407C355D68B28E332B0B06D180010DA0995BE0`
- Upstream license: `AGPL-3.0-or-later` (see `LICENSE.md`)

The upstream application was copied into an isolated downstream directory so
that the Spark portal's private repository is not mixed with AGPL source.
This is an engineering boundary, not a license exemption. Before any network
deployment or user access, the downstream source-offer and attribution
requirements must be reviewed and implemented.

No production database, Spark account, or existing `/portal/my/word-quest`
route is connected by this snapshot. The old Spark implementation remains a
separate deployed system until a later, separately approved replacement.

## Baseline verification

- `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund`: passed
- `npm run check`: passed with 0 errors and 482 upstream ESLint warnings
- `npm test`: failed in upstream Conjugator/Resources property tests; no Spark
  integration code is involved in those failures
- `npm run build`: intentionally not used because the upstream `AGENTS.md`
  explicitly says not to use it as verification
