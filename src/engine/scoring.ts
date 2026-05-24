import type { PerformanceLevel } from './types';

/**
 * Calculates the performance level based on score percentage.
 *
 * Thresholds (Requirement 7.4):
 * - 0-49%  = "Iniciante em Kiro"
 * - 50-74% = "Praticante de Kiro"
 * - 75-89% = "Especialista em Kiro"
 * - 90-100% = "Mestre em Kiro"
 */
export function calculatePerformanceLevel(scorePercentage: number): PerformanceLevel {
  if (scorePercentage >= 90) {
    return 'Mestre em Kiro';
  }
  if (scorePercentage >= 75) {
    return 'Especialista em Kiro';
  }
  if (scorePercentage >= 50) {
    return 'Praticante de Kiro';
  }
  return 'Iniciante em Kiro';
}

/**
 * Formats a score as "X/Y" format.
 * Requirement 7.1: Score display format.
 */
export function formatScore(correctCount: number, totalCount: number): string {
  return `${correctCount}/${totalCount}`;
}

/**
 * Calculates score percentage from correct and total counts.
 * Returns 0 if totalCount is 0 to avoid division by zero.
 */
export function calculateScorePercentage(correctCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return (correctCount / totalCount) * 100;
}
