/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Provides deterministic randomization within a session.
 * Requirement 4.6: same seed + same question = same order.
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a unique seed for a specific question within a session.
 * Combines the session seed with a hash of the question ID for uniqueness.
 */
function questionSeed(sessionSeed: number, questionId: string): number {
  let hash = sessionSeed;
  for (let i = 0; i < questionId.length; i++) {
    hash = ((hash << 5) - hash + questionId.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Fisher-Yates shuffle using a seeded PRNG.
 * Requirement 4.6: deterministic - same seed always produces same order.
 */
function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface ShuffledOptions<T> {
  items: T[];
}

/**
 * Randomizes option order for multiple-choice and scenario questions.
 * Uses a seeded PRNG for deterministic results within a session.
 *
 * Requirements:
 * - 4.5: Option randomization with session seed
 * - 4.6: Consistent randomization (same seed + same question = same order)
 */
export function randomizeOptions<T>(
  options: T[],
  sessionSeed: number,
  questionId: string
): ShuffledOptions<T> {
  const seed = questionSeed(sessionSeed, questionId);
  const rng = mulberry32(seed);
  return { items: seededShuffle(options, rng) };
}

/**
 * Randomizes ordering question items ensuring the presented order
 * differs from the correct sequence.
 *
 * Requirement 4.5: presented order differs from correct sequence.
 * For items with 3+ elements, retries shuffle until order differs.
 * For 1-2 elements, reverses (guaranteed different for 2, same for 1).
 */
export function randomizeOrderingItems<T>(
  items: T[],
  sessionSeed: number,
  questionId: string
): ShuffledOptions<T> {
  if (items.length <= 1) {
    return { items: [...items] };
  }

  if (items.length === 2) {
    // Always reverse for 2 items (guaranteed different)
    return { items: [...items].reverse() };
  }

  const seed = questionSeed(sessionSeed, questionId);
  // 10 attempts is more than sufficient: for n>=3 items,
  // probability of same order is 1/n! (≈16% for 3 items, <5% for 4+).
  // After 10 attempts the cumulative failure probability is negligible.
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = mulberry32(seed + attempt);
    const shuffled = seededShuffle(items, rng);

    // Check if order differs from original
    const isDifferent = shuffled.some((item, index) => item !== items[index]);
    if (isDifferent) {
      return { items: shuffled };
    }
  }

  // Fallback: rotate by 1 position (always different for 3+ items)
  const rotated = [...items.slice(1), items[0]];
  return { items: rotated };
}
