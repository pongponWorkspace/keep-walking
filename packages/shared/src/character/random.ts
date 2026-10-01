/**
 * `randomCharacterName` — the random-name button (tech note F10 section 7.1, `random._note`).
 * One attempt draws one uniform value per `random.template` part, picks `floor(u * list.length)`
 * of that list, joins with `random.joiner`, and validates; the first passing attempt wins. After
 * `random.maxAttempts` failed attempts, one more draw picks a cyclic start index into the
 * `random.fallbackKey` list, walked until an entry passes (every fallback entry must pass on its
 * own — config-lint's job, not this function's — so this only throws on a genuinely broken
 * config).
 */
import { resolveStringList } from './lexicon';
import { validateCharacterName } from './validate';
import type { CharacterNameParams, Lexicon, NameRng, RandomCharacterNameResult } from './types';

function pickFloorUniform<T>(rng: NameRng, list: readonly T[]): T {
  const index = Math.floor(rng() * list.length);
  const item = list[index];
  if (item === undefined) throw new Error('character random: pick index out of range');
  return item;
}

export function randomCharacterName(
  rng: NameRng,
  lexicon: Lexicon,
  params: CharacterNameParams,
): RandomCharacterNameResult {
  const cfg = params.random;
  const templateLists = cfg.template.map((path) => resolveStringList(lexicon, path));
  let draws = 0;
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    const parts = templateLists.map((list) => {
      draws += 1;
      return pickFloorUniform(rng, list);
    });
    const candidate = parts.join(cfg.joiner);
    const result = validateCharacterName(candidate, params, lexicon);
    if (result.ok) {
      return { name: result.normalized, attempts: attempt, fallback: false, draws };
    }
  }
  const fallbackList = resolveStringList(lexicon, cfg.fallbackKey);
  if (fallbackList.length === 0) {
    throw new Error('character random: fallback list is empty (config error)');
  }
  draws += 1;
  const startIndex = Math.floor(rng() * fallbackList.length);
  for (let step = 0; step < fallbackList.length; step += 1) {
    const index = (startIndex + step) % fallbackList.length;
    const candidate = fallbackList[index] as string;
    const result = validateCharacterName(candidate, params, lexicon);
    if (result.ok) {
      return { name: result.normalized, attempts: cfg.maxAttempts, fallback: true, draws };
    }
  }
  throw new Error('character random: no fallback name passes validate (config error)');
}
