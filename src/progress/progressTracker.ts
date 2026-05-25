import type { ProgressState } from './types';

const STORAGE_KEY = 'kiro-quest:progress:v1';
const CURRENT_VERSION = 1;

export interface RestoreResult {
  state: ProgressState | null;
  wasCorrupted: boolean;
}

/**
 * Validates that the given value conforms to the ProgressState schema.
 */
function isValid(data: unknown): data is ProgressState {
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
function persist(state: ProgressState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage unavailable or quota exceeded — silently fail
  }
}

/**
 * Restores the ProgressState from localStorage.
 * Returns a discriminated result:
 * - { state: ProgressState, wasCorrupted: false } on success
 * - { state: null, wasCorrupted: false } when no data exists
 * - { state: null, wasCorrupted: true } when data exists but is invalid/corrupted
 */
function restore(): RestoreResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: null, wasCorrupted: false };

    const parsed = JSON.parse(raw);

    if (!isValid(parsed)) {
      return { state: null, wasCorrupted: true };
    }

    return { state: parsed, wasCorrupted: false };
  } catch {
    // JSON parse error or localStorage unavailable
    return { state: null, wasCorrupted: true };
  }
}

/**
 * Clears stored progress from localStorage.
 */
function clear(): void {
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
