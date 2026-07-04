import type { ProgressState } from './types';
import { api, isApiConfigured } from '@/services/api';
import type { ApiSaveProgressRequest } from '@/services/api';

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
 * Persists progress to the cloud API when user is authenticated.
 * This is a fire-and-forget operation that does not block the UI.
 * Falls back to localStorage-only when API is not configured or user is not authenticated.
 */
function persistToCloud(state: ProgressState): void {
  // Always persist locally first
  persist(state);

  // Attempt cloud sync if API is configured
  if (!isApiConfigured()) return;

  const stageId = state.currentStage;
  const userAnswers = state.userAnswersByStage[stageId] || [];

  const request: ApiSaveProgressRequest = {
    stageId,
    currentQuestionIndex: state.currentQuestionIndex,
    quizPhase: state.quizPhase,
    userAnswers: userAnswers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: a.isCorrect,
      answeredAt: a.answeredAt,
    })),
  };

  // Fire-and-forget: errors are silently ignored since localStorage is the fallback
  api.saveProgress(request).catch(() => {
    // Cloud sync failed - localStorage has the data as fallback
  });
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
  persistToCloud,
  restore,
  clear,
  isValid,
};
