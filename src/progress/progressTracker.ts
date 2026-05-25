import type { ProgressState } from './types';

const STORAGE_KEY = 'kiro-quest-progress';
const CURRENT_VERSION = 1;

/**
 * Creates a fresh initial ProgressState.
 */
function createInitialState(): ProgressState {
  return {
    version: CURRENT_VERSION,
    completedStages: [],
    currentStage: 'kiro-basics',
    currentQuestionIndex: 0,
    questionsAnswered: 0,
    correctAnswerCount: 0,
    totalScore: 0,
    stageResults: {},
    lastUpdated: Date.now(),
  };
}

/**
 * Validates that the given value conforms to the ProgressState schema.
 * Returns true if valid, false otherwise.
 */
function isValidProgressState(value: unknown): value is ProgressState {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  if (typeof obj.version !== 'number') return false;
  if (!Array.isArray(obj.completedStages)) return false;
  if (typeof obj.currentStage !== 'string') return false;
  if (typeof obj.currentQuestionIndex !== 'number') return false;
  if (typeof obj.questionsAnswered !== 'number') return false;
  if (typeof obj.correctAnswerCount !== 'number') return false;
  if (typeof obj.totalScore !== 'number') return false;
  if (!obj.stageResults || typeof obj.stageResults !== 'object') return false;
  if (typeof obj.lastUpdated !== 'number') return false;

  return true;
}

export interface LoadResult {
  state: ProgressState;
  wasRecovered: boolean;
}

export interface ProgressTracker {
  /**
   * Detects whether local storage is available.
   * Requirement 6.1: Local storage availability detection via try/catch.
   */
  isAvailable(): boolean;

  /**
   * Serializes and saves ProgressState to local storage.
   * Requirement 6.2: JSON serialization with version field.
   */
  save(state: ProgressState): boolean;

  /**
   * Loads and validates stored progress data.
   * Returns the state and whether recovery from corruption occurred.
   * Requirement 6.4: Deserialization and validation.
   * Requirement 6.7: Returns fresh initial state on corruption.
   */
  load(): LoadResult;

  /**
   * Clears stored progress, resetting to initial state.
   * Requirement 6.5: Reset functionality.
   */
  reset(): void;

  /**
   * Returns a fresh initial ProgressState.
   */
  getInitialState(): ProgressState;
}

/**
 * Progress Tracker implementation with local storage persistence.
 *
 * Requirements covered:
 * - 6.1: Local storage availability detection via try/catch
 * - 6.2: JSON serialization with version field for schema migration
 * - 6.3: Auto-save on answer submission and stage completion (via store integration)
 * - 6.4: Deserializes and validates stored progress data
 * - 6.5: Reset clears stored progress
 * - 6.6: Handles storage unavailability gracefully
 * - 6.7: Corruption recovery - catches JSON parse errors or schema validation failures, resets to initial state
 */
export const progressTracker: ProgressTracker = {
  isAvailable(): boolean {
    try {
      const testKey = '__kiro_quest_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  save(state: ProgressState): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify({
        ...state,
        lastUpdated: Date.now(),
      });
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch {
      return false;
    }
  },

  load(): LoadResult {
    if (!this.isAvailable()) {
      return { state: createInitialState(), wasRecovered: false };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { state: createInitialState(), wasRecovered: false };
      }

      const parsed = JSON.parse(raw);

      if (!isValidProgressState(parsed)) {
        // Corruption recovery: invalid schema, reset to initial state
        this.reset();
        return { state: createInitialState(), wasRecovered: true };
      }

      // Future: handle schema migration based on version field
      return { state: parsed, wasRecovered: false };
    } catch {
      // Corruption recovery: JSON parse error, reset to initial state
      this.reset();
      return { state: createInitialState(), wasRecovered: true };
    }
  },

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable, nothing to clear
    }
  },

  getInitialState(): ProgressState {
    return createInitialState();
  },
};
