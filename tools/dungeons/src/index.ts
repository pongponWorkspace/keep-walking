// tools/dungeons (P2-F04-T26). Owner: location-engineer.
// Validator for data/dungeons/ (design/levels/dungeon-rules.md) and the client artifact build
// (polygon, polylabel label point, navigation target, property whitelist, normalized hours).
// Contract: docs/adr/0003-client-first-game-core.md 9, docs/tech/F04-dungeon-presence.md 8, 13.
// Never imported by apps/* or packages/*.
export * from './types';
export { buildArtifact, canonicalJson, serializeArtifact, sourceSha256 } from './artifact';
export { loadBuildConfig, loadContext, REPO_ROOT } from './context';
export type { BuildConfig, CoverageRules, RuleContext, Way, Zone } from './context';
export { mergeIntervals, normalizeTable, parseOpeningHours } from './opening-hours';
export { checkCommitted, runBuild } from './pipeline';
export { checkSource, compileSchemas, loadSource } from './source';
export { analyzeRecord, labelPointOf, tagMatches, validateRecords } from './validate';
