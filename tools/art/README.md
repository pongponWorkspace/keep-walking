# tools/art

Asset build and validator for art, fonts and audio (P2-F06-T07). Owner: tech-lead.
Contract and client loading rules: `docs/tech/asset-delivery.md`. Rules: `art/direction/asset-pipeline.md`.

No `package.json` (ADR 0003 8.1): uses `@resvg/resvg-js` from the root devDependencies.

```
pnpm exec tsx tools/art/src/cli.ts validate              # V1–V13 (also inside pnpm test)
pnpm exec tsx tools/art/src/cli.ts build [--write]       # avatar sheets → art/assets + manifest.build.json
pnpm exec tsx tools/art/src/cli.ts stage [--out <dir>]   # client bundle → tools/art/out/client
pnpm exec tsx tools/art/src/cli.ts prebuild              # audio → validate → stage (apps/client dev/build scripts)
pnpm exec tsx tools/art/src/cli.ts split-manifest [--write] # move entries to art/assets/manifest.<key>.json
```

Every tunable value lives in `pipeline.config.json`. The artist manifest is `art/assets/manifest.json` (index) plus one `art/assets/manifest.<key>.json` per key in `manifestRoots` (docs/tech/asset-delivery.md 10.1); every rule reads the merged view. A key is a root (`badge`) or a root.group (`icon.ui`); an entry lives in the part of the most specific key that matches its id, so `icon.ui.*` goes to `manifest.icon.ui.json` and an icon group with no key of its own (e.g. `icon.qc`) goes to `manifest.icon.json` (P2-H67). To split a root that passes `budgets.manifestBytes` (V13): add its `root.group` keys to `manifestRoots`, run `split-manifest --write`, then delete the root part if it is left with `assets: []`. It is never written by this tool except by `split-manifest --write`.
