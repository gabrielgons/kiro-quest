import type { ProgressState } from './types';
import type { LearningStage, QuizPhase } from '@/engine/types';
import { api, isApiConfigured } from '@/services/api';
import type { ApiSaveProgressRequest, ApiProgressEntry } from '@/services/api';

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
 * Result of a cloud persistence attempt.
 */
export interface CloudPersistResult {
  synced: boolean;
  error?: string;
}

/**
 * Persists progress to the cloud API when user is authenticated.
 * Returns a promise that resolves with the sync result.
 * Falls back to localStorage-only when API is not configured or user is not authenticated.
 */
function persistToCloud(state: ProgressState): Promise<CloudPersistResult> {
  // Always persist locally first
  persist(state);

  // Attempt cloud sync if API is configured
  if (!isApiConfigured()) {
    return Promise.resolve({ synced: false, error: 'API not configured' });
  }

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

  return api
    .saveProgress(request)
    .then(() => ({ synced: true }))
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Cloud sync failed';
      return { synced: false, error: message };
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

/**
 * Result of a cloud restore attempt.
 */
export interface CloudRestoreResult {
  restored: boolean;
  state: ProgressState | null;
  error?: string;
}

/**
 * Restores progress from the cloud API when the user is authenticated
 * but has no local data. Fetches all progress entries and hydrates
 * a ProgressState from the most recently updated entry.
 */
async function restoreFromCloud(): Promise<CloudRestoreResult> {
  if (!isApiConfigured()) {
    return { restored: false, state: null, error: 'API not configured' };
  }

  try {
    const entries: ApiProgressEntry[] = await api.getProgress();

    if (!entries || entries.length === 0) {
      return { restored: false, state: null };
    }

    // Find the most recently updated entry to use as the current stage
    const sorted = [...entries].sort((a, b) => b.lastUpdated - a.lastUpdated);
    const latest = sorted[0]!;

    // Build userAnswersByStage from all entries
    const userAnswersByStage: Record<string, Array<{ questionId: string; selectedOptionId: string | string[]; isCorrect: boolean; answeredAt: number }>> = {};
    const completedStages: LearningStage[] = [];

    for (const entry of entries) {
      userAnswersByStage[entry.stageId] = entry.userAnswers || [];
      if (entry.quizPhase === 'stage-complete') {
        completedStages.push(entry.stageId as LearningStage);
      }
    }

    const state: ProgressState = {
      version: CURRENT_VERSION,
      currentStage: latest.stageId as LearningStage,
      currentQuestionIndex: latest.currentQuestionIndex,
      quizPhase: latest.quizPhase as QuizPhase,
      completedStages,
      stageResults: {},
      userAnswersByStage,
      lastUpdated: latest.lastUpdated,
    };

    // Persist restored state locally
    persist(state);

    return { restored: true, state };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cloud restore failed';
    return { restored: false, state: null, error: message };
  }
}

export const progressTracker = {
  persist,
  persistToCloud,
  restore,
  restoreFromCloud,
  clear,
  isValid,
};
