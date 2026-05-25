import type { ProgressState } from './types';

const STORAGE_KEY = 'kiro-quest:progress:v1';
const CURRENT_VERSION = 1;

/**
 * Validates that the given value conforms to the ProgressState schema.
 */
export function isValid(data: unknown): data is ProgressState {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  if (obj.version !== CURRENT_VERSION) return false;
  if (typeof obj.currentStage !== 'string') return false;
  if (typeof obj.currentQuestionIndex !== 'number') return false;
  if (typeof obj.quizPhase !== 'string') return false;
  if (!['answering', 'feedback', 'stage-complete'].includes(obj.quizPhase as string)) return false;
  if (!Array.isArray(obj.completedStages)) return false;
  if (!obj.stageResults || typeof obj.stageResults !== 'object') return false;
  if (!obj.userAnswersByStage || typeof obj.userAnswersByStage !== 'object') return false;
  if (typeof obj.lastUpdated !== 'number') return false;

  return true;
}

/**
 * Persists the ProgressState to localStorage.
 * Wraps in try/catch for environments where localStorage is unavailable.
 */
export function persist(state: ProgressState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage unavailable or quota exceeded — silently fail
  }
}

/**
 * Restores the ProgressState from localStorage.
 * Returns null if:
 * - localStorage is unavailable
 * - No data stored
 * - Data is not valid JSON
 * - Data does not conform to the ProgressState schema
 * - Version mismatch
 */
export function restore(): ProgressState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!isValid(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears stored progress from localStorage.
 */
export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — nothing to clear
  }
}

export const progressTracker = {
  persist,
  restore,
  clear,
  isValid,
};
