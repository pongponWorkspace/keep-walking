/**
 * Types for `config/content/copy-rules.json` (docs/tech/copy-schema.md section 6).
 * Numbers live only in the config file; this module carries no limit value itself.
 */

export interface CopyMessageLimit {
  readonly maxCells: number;
  readonly maxNewlines: number;
  readonly maxCellsPerLine: number;
}

export interface CopySimpleLimit {
  readonly maxCells: number;
  readonly maxNewlines: number;
}

/**
 * D-050 (uiux-designer, ACCEPTED, accepted after copy-schema round 2): a full-width primary
 * button with no paired button may use a wider limit than `limits.button`. Selection rule
 * (copy-rules.json#limits.buttonFullWidth): `kind: button` AND the key is listed in `keys`
 * uses this limit; every other button key uses `limits.button`.
 */
export interface CopyButtonFullWidthLimit {
  readonly maxCells: number;
  readonly maxNewlines: number;
  readonly keys: readonly string[];
}

export interface CopyPushLimit {
  readonly titleMaxCells: number;
  readonly maxNewlines: number;
}

export interface CopyDialogueLimit {
  readonly maxLines: number;
  readonly maxCellsPerLine: number;
  readonly speakerMaxChars: number;
}

export interface CopyLegalLimit {
  readonly summaryMaxCells: number;
}

export interface CopyLimits {
  readonly message: CopyMessageLimit;
  readonly button: CopySimpleLimit;
  /** Optional (D-050): see CopyButtonFullWidthLimit. */
  readonly buttonFullWidth?: CopyButtonFullWidthLimit;
  readonly label: CopySimpleLimit;
  readonly push: CopyPushLimit;
  readonly dialogue: CopyDialogueLimit;
  readonly command: CopySimpleLimit;
  /**
   * Optional (copy-schema 3.2, D-023): when HUMAN does not approve the `legal` exception,
   * this key is deleted and `voice: legal` + `kind: message` falls back to `limits.message`
   * without a code change.
   */
  readonly legal?: CopyLegalLimit;
}

export interface CopyFormats {
  readonly numberLocale: string;
  readonly distanceKmFrom_m: number;
  readonly distanceKmDecimals: number;
  readonly clockPattern: string;
}

/** Shape of `config/content/copy-rules.json` (docs/tech/copy-schema.md section 6). */
export interface CopyRules {
  readonly areas: readonly string[];
  readonly limits: CopyLimits;
  readonly formats: CopyFormats;
}
