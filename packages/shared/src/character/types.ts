/**
 * @keep-walking/shared/character — types mirroring `config/balance/character.json` version 2
 * (schema: `packages/shared/schemas/config/balance/character.schema.json`, tech note
 * docs/tech/F10-account-shell.md section 7). Structure only: the cross-field rules (range
 * `from <= to`, lexicon paths resolve, etc.) are config-lint's job
 * (`tools/config-lint/src/character.ts`), not this module's.
 *
 * `CharacterNameParams` is deliberately permissive about extra keys (`_meta`, `_source`, `_note`
 * on every nested object): the caller passes the parsed JSON file straight through, unmodified
 * (P2-F10-T12 acceptance: "ค่าทั้งหมดจาก config ไม่มีฝัง" — nothing here re-declares a value the
 * config already owns).
 */

/** `{from: "U+0E01", to: "U+0E3A", label}` — an inclusive Unicode code point range. */
export interface CodePointRange {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
}

export interface NameSegmenterConfig {
  readonly api: 'Intl.Segmenter';
  readonly locale: string;
  readonly granularity: 'grapheme';
}

export interface NameNormalizeConfig {
  readonly form: 'NFC' | 'NFKC';
  readonly stripCodePoints: readonly CodePointRange[];
  readonly mapToSpace: readonly CodePointRange[];
  readonly trimSpaces: boolean;
  readonly collapseSpaces: boolean;
}

/** The 11 fixed reasons `validateCharacterName` can fail with (schema `$defs.rejectReason`). */
export type RejectReason =
  | 'empty'
  | 'email'
  | 'url'
  | 'phone'
  | 'charset'
  | 'misplacedMark'
  | 'stackedMarks'
  | 'noLetter'
  | 'tooShort'
  | 'tooLong'
  | 'banned';

export interface NameConfig {
  readonly minGraphemes: number;
  readonly maxGraphemes: number;
  readonly lengthUnit: 'graphemeCluster';
  readonly segmenter: NameSegmenterConfig;
  readonly normalize: NameNormalizeConfig;
  readonly allowed: readonly CodePointRange[];
  readonly letters: readonly CodePointRange[];
  readonly requireLetter: boolean;
  readonly thaiMarks: readonly CodePointRange[];
  readonly thaiMarkBases: readonly CodePointRange[];
  readonly toneMarks: readonly CodePointRange[];
  readonly maxCodePointsPerGrapheme: number;
  readonly maxToneMarksPerGrapheme: number;
  readonly rejectRepeatedMarkInGrapheme: boolean;
  readonly checkOrder: readonly RejectReason[];
}

export interface ContactDetectionFormConfig {
  readonly form: 'NFC' | 'NFKC';
  readonly lowercase: boolean;
}
export interface ContactPhoneConfig {
  readonly digits: readonly CodePointRange[];
  readonly separators: readonly string[];
  readonly maxDigitRun: number;
  readonly maxTotalDigits: number;
}
export interface ContactEmailConfig {
  readonly markers: readonly string[];
}
export interface ContactUrlConfig {
  readonly markers: readonly string[];
  readonly tlds: readonly string[];
  readonly spelledMarkers: readonly string[];
}
export interface ContactConfig {
  readonly detectionForm: ContactDetectionFormConfig;
  readonly phone: ContactPhoneConfig;
  readonly email: ContactEmailConfig;
  readonly url: ContactUrlConfig;
}

/** One step of a `banned.passes.*` pipeline (schema `$defs.passStep`). Every field beyond `op` is
 * optional in the type because which ones are present depends on `op` (schema's own `allOf`
 * conditionals); `passes.ts` reads only the fields its `op` needs. */
export type PassOp =
  | 'nameNormalize'
  | 'lowercaseLatin'
  | 'removeCodePoints'
  | 'latinRunMap'
  | 'removeChars'
  | 'mapCodePointRange'
  | 'collapseRepeats';

export interface PassStep {
  readonly op: PassOp;
  readonly ranges?: readonly CodePointRange[];
  readonly runCodePoints?: readonly CodePointRange[];
  readonly letterCodePoints?: readonly CodePointRange[];
  readonly runChars?: readonly string[];
  readonly chars?: readonly string[];
  readonly map?: readonly { readonly from: string; readonly to: string }[];
  readonly from?: string;
  readonly to?: string;
  readonly toStart?: string;
}

export interface PassDef {
  readonly base?: string;
  readonly steps: readonly PassStep[];
}

export interface BannedModeConfig {
  readonly pass: string;
  readonly termsKey: string;
  readonly collect: 'array' | 'categoryArrays';
  readonly match: 'contains' | 'wholeOrToken';
}
export interface BannedAllowConfig {
  readonly key: string;
  readonly removal: 'longestAtPosition';
}
export interface BannedConfig {
  readonly lexiconRef: string;
  readonly termCharset: string;
  readonly passes: Readonly<Record<string, PassDef>>;
  readonly modes: Readonly<Record<string, BannedModeConfig>>;
  readonly allow: Readonly<Record<string, BannedAllowConfig>>;
}

export interface RandomConfig {
  readonly lexiconRef: string;
  readonly patternKey: string;
  readonly pattern: string;
  readonly template: readonly string[];
  readonly joiner: string;
  readonly fallbackKey: string;
  readonly maxAttempts: number;
  readonly pick: 'floorUniform';
}

/** The whole of `config/balance/character.json` version 2 (tech note F10 section 7.1). */
export interface CharacterNameParams {
  readonly name: NameConfig;
  readonly contact: ContactConfig;
  readonly banned: BannedConfig;
  readonly random: RandomConfig;
}

/** A parsed `config/content/character-names.th.json` (or the vector fixture in the same shape,
 * design/systems/test-vectors/character-name.json#lexicon) — an arbitrary JSON value, resolved by
 * dotted path (`lexicon.ts`). Never imported/fetched by this module (ADR 0003 C1-2): the caller
 * loads the file and passes it in. */
export type Lexicon = unknown;

/** `validateCharacterName`'s result (tech note F10 section 1 / systems-designer contract). */
export type ValidateCharacterNameResult =
  | { readonly ok: true; readonly normalized: string; readonly graphemes: number }
  | { readonly ok: false; readonly reason: RejectReason };

/** A caller-supplied uniform random source: each call returns the next draw in `[0, 1)`. Matches
 * `packages/shared/src/formulas/rng.ts`'s `Rng` shape without importing it (`random._note`: "the
 * rng is injected by the caller; the name is cosmetic, so it needs no server stream in Phase 2"). */
export type NameRng = () => number;

/** `randomCharacterName`'s result (systems-designer contract: `{name, attempts, fallback,
 * draws}`). `attempts` is attempts actually spent on the template (capped at `maxAttempts`, same
 * value whether a later attempt would have passed or not — the fallback vector 4 fixture: attempts
 * reported stays at `maxAttempts` once the fallback list is reached). */
export interface RandomCharacterNameResult {
  readonly name: string;
  readonly attempts: number;
  readonly fallback: boolean;
  readonly draws: number;
}
