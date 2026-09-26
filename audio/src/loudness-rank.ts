// Maps a cue's `loudnessRank` (1 quietest .. 8 loudest, direction.md 5's documented relative
// loudness order) to a concrete LUFS target inside the "-16 LUFS +/- 1 LU" band the direction doc
// sets — so cues stay perceptibly ordered by loudness while every one of them still lands inside
// that band (see cue-list.md 7 for the rationale). Shared by generate.ts (renders the actual audio)
// and write-manifest.ts (writes the committed audio/manifest.json), so the two never disagree.
const RANK_MIN = 1;
const RANK_MAX = 8;
const TARGET_LUFS_AT_RANK_MIN = -17.0; // quietest cues (run.tickDenied, qc.*, ...)
const TARGET_LUFS_AT_RANK_MAX = -15.0; // loudest cue (run.death)

export function targetLufsForRank(rank: number): number {
  const clamped = Math.min(RANK_MAX, Math.max(RANK_MIN, rank));
  const span = RANK_MAX - RANK_MIN;
  const lufsSpan = TARGET_LUFS_AT_RANK_MAX - TARGET_LUFS_AT_RANK_MIN;
  return TARGET_LUFS_AT_RANK_MIN + ((clamped - RANK_MIN) * lufsSpan) / span;
}
