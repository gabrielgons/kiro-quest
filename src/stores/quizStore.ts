import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { LearningStage, QuizState, StageResult, AnswerResult } from '@/engine/types';
import type { QuestionPresentation } from '@/data/types';
import { quizEngine } from '@/engine/quizEngine';
import { randomizeOptions, randomizeOrderingItems } from '@/engine/randomizer';
import { calculateScorePercentage, calculatePerformanceLevel, formatScore } from '@/engine/scoring';
import { formatProgressIndicator } from '@/engine/formatters';

export const useQuizStore = defineStore('quiz', () => {
  // --- State ---
  const state = ref<QuizState>({
    currentStage: 'kiro-basics',
    currentQuestionIndex: 0,
    answers: {},
    stageResults: {} as Record<LearningStage, StageResult>,
    completedStages: [],
    sessionSeed: Date.now(),
  });

  const questions = ref<QuestionPresentation[]>([]);
  const lastResult = ref<AnswerResult | null>(null);
  const isStageComplete = ref(false);
  const isFinalStageComplete = ref(false);
  const nextStage = ref<LearningStage | undefined>(undefined);

  // --- Getters ---

  const currentQuestion = computed<QuestionPresentation | undefined>(() => {
    return questions.value[state.value.currentQuestionIndex];
  });

  const currentQuestionWithRandomizedOptions = computed(() => {
    const q = currentQuestion.value;
    if (!q) return undefined;

    if (q.type === 'ordering') {
      const { items } = randomizeOrderingItems(
        q.options,
        state.value.sessionSeed,
        q.id
      );
      return { ...q, options: items };
    }

    if (q.type === 'multiple-choice' || q.type === 'scenario') {
      const { items } = randomizeOptions(
        q.options,
        state.value.sessionSeed,
        q.id
      );
      return { ...q, options: items };
    }

    // true-false: no randomization needed
    return q;
  });

  const stageProgress = computed(() => {
    const current = state.value.currentQuestionIndex + 1;
    const total = questions.value.length;
    return {
      current,
      total,
      formatted: formatProgressIndicator(current, total),
      percentage: total > 0 ? (current / total) * 100 : 0,
    };
  });

  const overallScore = computed(() => {
    const results = Object.values(state.value.stageResults);
    const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
    const totalQuestions = results.reduce((sum, r) => sum + r.totalCount, 0);
    const percentage = calculateScorePercentage(totalCorrect, totalQuestions);
    return {
      correctCount: totalCorrect,
      totalCount: totalQuestions,
      percentage,
      performanceLevel: calculatePerformanceLevel(percentage),
      formatted: formatScore(totalCorrect, totalQuestions),
    };
  });

  const currentStageScore = computed(() => {
    const result = state.value.stageResults[state.value.currentStage];
    if (!result) return null;
    const percentage = calculateScorePercentage(result.correctCount, result.totalCount);
    return {
      ...result,
      percentage,
      performanceLevel: calculatePerformanceLevel(percentage),
      formatted: formatScore(result.correctCount, result.totalCount),
    };
  });

  // --- Actions ---

  function startStage(stage: LearningStage): void {
    const { state: newState, questions: stageQuestions } = quizEngine.startStage(stage, {
      ...state.value,
      sessionSeed: state.value.sessionSeed,
    });

    state.value = newState;
    questions.value = stageQuestions;
    lastResult.value = null;
    isStageComplete.value = false;
    isFinalStageComplete.value = false;
    nextStage.value = undefined;
  }

  function submitAnswer(questionId: string, selectedAnswer: string | string[]): AnswerResult {
    const { state: newState, result } = quizEngine.submitAnswer(
      state.value,
      questionId,
      selectedAnswer
    );

    state.value = newState;
    lastResult.value = result;
    return result;
  }

  function advanceToNext(): void {
    const { state: newState, isStageComplete: stageComplete, isFinalStageComplete: finalComplete, nextStage: next } =
      quizEngine.nextQuestion(state.value, questions.value);

    state.value = newState;
    isStageComplete.value = stageComplete;
    isFinalStageComplete.value = finalComplete;
    nextStage.value = next;
    lastResult.value = null;
  }

  function resetQuiz(): void {
    state.value = {
      currentStage: 'kiro-basics',
      currentQuestionIndex: 0,
      answers: {},
      stageResults: {} as Record<LearningStage, StageResult>,
      completedStages: [],
      sessionSeed: Date.now(),
    };
    questions.value = [];
    lastResult.value = null;
    isStageComplete.value = false;
    isFinalStageComplete.value = false;
    nextStage.value = undefined;
  }

  function restoreState(savedState: Partial<QuizState>): void {
    state.value = { ...state.value, ...savedState };
  }

  return {
    // State
    state,
    questions,
    lastResult,
    isStageComplete,
    isFinalStageComplete,
    nextStage,

    // Getters
    currentQuestion,
    currentQuestionWithRandomizedOptions,
    stageProgress,
    overallScore,
    currentStageScore,

    // Actions
    startStage,
    submitAnswer,
    advanceToNext,
    resetQuiz,
    restoreState,
  };
});
