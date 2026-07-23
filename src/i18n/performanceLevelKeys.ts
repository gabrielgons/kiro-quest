import type { PerformanceLevel } from '@/engine/types';

/**
 * Maps each internal PerformanceLevel value to its corresponding i18n
 * translation key. Co-located with i18n utilities so changes to
 * PerformanceLevel are easy to spot and update.
 *
 * NOTE: Keys must exactly match the PerformanceLevel union values.
 * The `satisfies` constraint enforces this at compile time — if a level
 * is added or renamed, this file will produce a type error.
 *
 * Usage:
 * ```ts
 * const key = getPerformanceLevelKey(level);
 * const localized = key ? t(key) : level;
 * ```
 */
const PERFORMANCE_LEVEL_KEYS = {
  'Iniciante em Kiro': 'performance.iniciante',
  'Praticante de Kiro': 'performance.praticante',
  'Especialista em Kiro': 'performance.especialista',
  'Mestre em Kiro': 'performance.mestre',
} as const satisfies Record<PerformanceLevel, string>;

/**
 * Returns the i18n translation key for a given PerformanceLevel.
 * Returns `undefined` if the level is not mapped (graceful degradation).
 */
export function getPerformanceLevelKey(level: PerformanceLevel): string | undefined {
  return PERFORMANCE_LEVEL_KEYS[level];
}

export { PERFORMANCE_LEVEL_KEYS };
