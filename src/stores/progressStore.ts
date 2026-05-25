import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ProgressState } from '@/progress/types';
import type { QuizState } from '@/engine/types';
import { progressTracker } from '@/progress/progressTracker';

export const useProgressStore = defineStore('progress', () => {
  // --- State ---
  const isStorageAvailable = ref(false);
  const hasRecoveryError = ref(false);
  const currentProgress = ref<ProgressState>(progressTracker.getInitialState());

  // --- Actions ---

  /**
   * Initialize: detect storage availability and load existing progress.
   * Requirement 6.1, 6.4
   */
  function initialize(): void {
    isStorageAvailable.value = progressTracker.isAvailable();

    if (isStorageAvailable.value) {
      const { state, wasRecovered } = progressTracker.load();
      hasRecoveryError.value = wasRecovered;
      currentProgress.value = state;
    }
  }

  /**
   * Save current progress to local storage.
   * Receives the quiz state as parameter to avoid circular store dependency.
   * Requirement 6.3: Auto-save on answer submission and stage completion.
   */
  function save(quizState: QuizState): boolean {
    if (!isStorageAvailable.value) return false;

    const progressState: ProgressState = {
      version: 1,
      completedStages: quizState.completedStages,
      currentStage: quizState.currentStage,
      currentQuestionIndex: quizState.currentQuestionIndex,
      questionsAnswered: Object.keys(quizState.answers).length,
      correctAnswerCount: Object.values(quizState.answers).filter((a) => a.isCorrect).length,
      totalScore: Object.values(quizState.stageResults).reduce((sum, r) => sum + r.correctCount, 0),
      stageResults: quizState.stageResults,
      lastUpdated: Date.now(),
    };

    const success = progressTracker.save(progressState);
    if (success) {
      currentProgress.value = progressState;
    }
    return success;
  }

  /**
   * Save with explicit progress state (for restoring on app load).
   */
  function saveState(progressState: ProgressState): boolean {
    if (!isStorageAvailable.value) return false;
    const success = progressTracker.save(progressState);
    if (success) {
      currentProgress.value = progressState;
    }
    return success;
  }

  /**
   * Reset all progress.
   * Requirement 6.5
   */
  function reset(): void {
    progressTracker.reset();
    currentProgress.value = progressTracker.getInitialState();
    hasRecoveryError.value = false;
  }

  /**
   * Dismiss the recovery error notification.
   */
  function dismissRecoveryError(): void {
    hasRecoveryError.value = false;
  }

  return {
    // State
    isStorageAvailable,
    hasRecoveryError,
    currentProgress,

    // Actions
    initialize,
    save,
    saveState,
    reset,
    dismissRecoveryError,
  };
});
