// @keep-walking/shared/character — character-name filter + random-name generator (tech note
// docs/tech/F10-account-shell.md, P2-F10-T12). Pure: no DOM, no fetch/fs, no engine import
// (ADR 0003 C1-2) — Phase 2 calls this from apps/client only; Phase 3 runs the same module on the
// server (NN-1). The whole of `config/balance/character.json` is `CharacterNameParams`; the whole
// of `config/content/character-names.th.json` (or the vector fixture in the same shape) is a
// `Lexicon`, resolved by dotted path, never imported here.
export type {
  BannedAllowConfig,
  BannedConfig,
  BannedModeConfig,
  CharacterNameParams,
  CodePointRange,
  ContactConfig,
  ContactDetectionFormConfig,
  ContactEmailConfig,
  ContactPhoneConfig,
  ContactUrlConfig,
  Lexicon,
  NameConfig,
  NameNormalizeConfig,
  NameRng,
  NameSegmenterConfig,
  PassDef,
  PassOp,
  PassStep,
  RandomCharacterNameResult,
  RandomConfig,
  RejectReason,
  ValidateCharacterNameResult,
} from './types';
export { validateCharacterName } from './validate';
export { randomCharacterName } from './random';
export {
  resolveCategoryArraysFlat,
  resolveLexiconPath,
  resolveLexiconString,
  resolveStringList,
} from './lexicon';
