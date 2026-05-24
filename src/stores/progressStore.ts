import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ProgressState } from '@/progress/types';
import { progressTracker } from '@/progress/progressTracker';
import { useQuizStore } from './quizStore';

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
      const loaded = progressTracker.load();

      // Detect if recovery happened (version mismatch or load returned initial state
      // when there was data in storage)
      if (loaded.lastUpdated === 0 || loaded.completedStages.length === 0) {
        // Could be fresh start or recovery - check if there was previous data
        try {
          const raw = localStorage.getItem('kiro-quest-progress');
          if (raw && loaded.completedStages.length === 0) {
            // Had data but loaded empty = corruption recovery happened
            hasRecoveryError.value = true;
          }
        } catch {
          // Storage not readable
        }
      }

      currentProgress.value = loaded;
    }
  }

  /**
   * Save current progress to local storage.
   * Requirement 6.3: Auto-save on answer submission and stage completion.
   */
  function save(): boolean {
    if (!isStorageAvailable.value) return false;

    const quizStore = useQuizStore();
    const state = quizStore.state;

    const progressState: ProgressState = {
      version: 1,
      completedStages: state.completedStages,
      currentStage: state.currentStage,
      currentQuestionIndex: state.currentQuestionIndex,
      questionsAnswered: Object.keys(state.answers).length,
      correctAnswerCount: Object.values(state.answers).filter((a) => a.isCorrect).length,
      totalScore: Object.values(state.stageResults).reduce((sum, r) => sum + r.correctCount, 0),
      stageResults: state.stageResults,
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
