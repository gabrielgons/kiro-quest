import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type {
  LearningStage,
  QuizPhase,
  UserAnswer,
  StageResult,
  AnswerResult,
  VerificationResult,
  PerformanceLevel,
} from '@/engine/types';
import type { QuestionPresentation, AnswerOption, OrderingItem } from '@/data/types';
import {
  verifyAnswer,
  calculateStageResult,
  calculatePercentage,
  calculatePerformanceLevel,
  canShowFinalPerformance,
  getRecommendedNextStage,
} from '@/engine/quizEngine';
import { randomizeOptions, randomizeOrderingItems } from '@/engine/randomizer';
import { questionStore } from '@/data/questionStore';
import { progressTracker } from '@/progress/progressTracker';
import type { ProgressState } from '@/progress/types';
import { useAuthStore } from '@/stores/authStore';

export const useQuizStore = defineStore('quiz', () => {
  // --- State ---
  const currentStage = ref<LearningStage>('kiro-basics');
  const currentQuestionIndex = ref(0);
  const quizPhase = ref<QuizPhase>('answering');
  const questions = ref<QuestionPresentation[]>([]);
  const completedStages = ref<LearningStage[]>([]);
  const stageResults = ref<Record<string, StageResult>>({});
  const userAnswersByStage = ref<Record<string, UserAnswer[]>>({});
  const lastAnswerResult = ref<AnswerResult | null>(null);
  const errorMessage = ref<string | null>(null);
  const sessionSeed = ref(Date.now());
  const cloudSyncFailed = ref(false);

  // --- Computed Getters ---

  const currentQuestion = computed<QuestionPresentation | undefined>(() => {
    return questions.value[currentQuestionIndex.value];
  });

  const currentQuestionWithRandomizedOptions = computed(() => {
    const q = currentQuestion.value;
    if (!q) return undefined;

    if (q.type === 'ordering') {
      const { items } = randomizeOrderingItems(
        q.options,
        sessionSeed.value,
        q.id
      );
      return { ...q, options: items };
    }

    if (q.type === 'multiple-choice' || q.type === 'scenario') {
      const { items } = randomizeOptions(
        q.options,
        sessionSeed.value,
        q.id
      );
      return { ...q, options: items };
    }

    // true-false: no randomization needed
    return q;
  });

  const questionsAnswered = computed(() => {
    return Object.values(userAnswersByStage.value).reduce(
      (sum, answers) => sum + answers.length,
      0
    );
  });

  const correctAnswerCount = computed(() => {
    return Object.values(userAnswersByStage.value).reduce(
      (sum, answers) => sum + answers.filter((a) => a.isCorrect).length,
      0
    );
  });

  const totalScore = computed(() => correctAnswerCount.value);

  const overallPercentage = computed(() => {
    return calculatePercentage(correctAnswerCount.value, questionsAnswered.value);
  });

  const performanceLevel = computed<PerformanceLevel>(() => {
    return calculatePerformanceLevel(correctAnswerCount.value, questionsAnswered.value);
  });

  const isAllComplete = computed(() => {
    return canShowFinalPerformance(completedStages.value);
  });

  const recommendedNextStage = computed<LearningStage | null>(() => {
    return getRecommendedNextStage(completedStages.value);
  });

  const incorrectAnswers = computed(() => {
    const stageAnswers = userAnswersByStage.value[currentStage.value] ?? [];
    return stageAnswers.filter((a) => !a.isCorrect);
  });

  // --- Actions ---

  function _clearStageData(stage: LearningStage): void {
    delete userAnswersByStage.value[stage];
    delete stageResults.value[stage];
    completedStages.value = completedStages.value.filter((s) => s !== stage);
  }

  function startStage(stage: LearningStage): void {
    const stageQuestions = questionStore.getQuestionsForStage(stage);

    if (stageQuestions.length === 0) {
      errorMessage.value = `Não foi possível carregar as perguntas para o estágio "${stage}".`;
      return;
    }

    // Clear previous attempt data to prevent score accumulation on retry
    _clearStageData(stage);

    currentStage.value = stage;
    currentQuestionIndex.value = 0;
    quizPhase.value = 'answering';
    questions.value = stageQuestions;
    lastAnswerResult.value = null;
    errorMessage.value = null;

    _persist();
  }

  function submitAnswer(selectedAnswer: string | string[]): void {
    const question = currentQuestion.value;
    if (!question) return;

    let answerKey;
    try {
      answerKey = questionStore.getAnswerKey(question.id);
    } catch {
      errorMessage.value = 'Não foi possível verificar esta pergunta.';
      return;
    }

    const verification = verifyAnswer(question.type, answerKey, selectedAnswer);

    // Enrich verification into full AnswerResult with labels
    const enriched = _enrichResult(verification, question);

    // Record UserAnswer
    const userAnswer: UserAnswer = {
      questionId: question.id,
      selectedOptionId: selectedAnswer,
      isCorrect: verification.isCorrect,
      answeredAt: Date.now(),
    };

    const stageKey = currentStage.value;
    if (!userAnswersByStage.value[stageKey]) {
      userAnswersByStage.value[stageKey] = [];
    }
    userAnswersByStage.value[stageKey].push(userAnswer);

    lastAnswerResult.value = enriched;
    quizPhase.value = 'feedback';
    errorMessage.value = null;

    _persist();
  }

  function nextQuestion(): void {
    currentQuestionIndex.value += 1;
    quizPhase.value = 'answering';
    lastAnswerResult.value = null;

    _persist();
  }

  function completeStage(): void {
    const stageKey = currentStage.value;
    const answers = userAnswersByStage.value[stageKey] ?? [];
    const result = calculateStageResult(stageKey, answers);

    stageResults.value[stageKey] = result;

    if (!completedStages.value.includes(stageKey)) {
      completedStages.value.push(stageKey);
    }

    quizPhase.value = 'stage-complete';
    lastAnswerResult.value = null;

    _persist();
  }

  function retryStage(stage: LearningStage): void {
    _clearStageData(stage);

    // Generate new session seed for fresh randomization on retry
    sessionSeed.value = Date.now();

    // Start fresh
    const stageQuestions = questionStore.getQuestionsForStage(stage);
    currentStage.value = stage;
    currentQuestionIndex.value = 0;
    quizPhase.value = 'answering';
    questions.value = stageQuestions;
    lastAnswerResult.value = null;
    errorMessage.value = null;

    _persist();
  }

  /**
   * Restores progress from localStorage.
   * Returns true if data was corrupted (notification should be shown).
   */
  function restoreProgress(): boolean {
    const { state: saved, wasCorrupted } = progressTracker.restore();

    if (wasCorrupted) {
      progressTracker.clear();
      return true;
    }

    if (!saved) return false;

    currentStage.value = saved.currentStage;
    currentQuestionIndex.value = saved.currentQuestionIndex;
    quizPhase.value = saved.quizPhase;
    completedStages.value = saved.completedStages;
    stageResults.value = saved.stageResults;
    userAnswersByStage.value = saved.userAnswersByStage;
    errorMessage.value = null;

    // Load questions for current stage
    const stageQuestions = questionStore.getQuestionsForStage(saved.currentStage);
    questions.value = stageQuestions;

    // Reconstruct lastAnswerResult if quizPhase is "feedback"
    if (saved.quizPhase === 'feedback') {
      _reconstructLastAnswerResult();
    }

    return false;
  }

  /**
   * Restores progress from the cloud (DynamoDB).
   * Used when user is authenticated but has no local progress.
   * Returns true if progress was successfully restored from cloud.
   */
  async function restoreProgressFromCloud(): Promise<boolean> {
    const result = await progressTracker.restoreFromCloud();

    if (!result.restored || !result.state) {
      return false;
    }

    const saved = result.state;

    currentStage.value = saved.currentStage;
    currentQuestionIndex.value = saved.currentQuestionIndex;
    quizPhase.value = saved.quizPhase;
    completedStages.value = saved.completedStages;
    stageResults.value = saved.stageResults;
    userAnswersByStage.value = saved.userAnswersByStage;
    errorMessage.value = null;

    // Load questions for current stage
    const stageQuestions = questionStore.getQuestionsForStage(saved.currentStage);
    questions.value = stageQuestions;

    // Reconstruct lastAnswerResult if quizPhase is "feedback"
    if (saved.quizPhase === 'feedback') {
      _reconstructLastAnswerResult();
    }

    return true;
  }

  function resetProgress(): void {
    progressTracker.clear();
    currentStage.value = 'kiro-basics';
    currentQuestionIndex.value = 0;
    quizPhase.value = 'answering';
    questions.value = [];
    completedStages.value = [];
    stageResults.value = {};
    userAnswersByStage.value = {};
    lastAnswerResult.value = null;
    errorMessage.value = null;
    sessionSeed.value = Date.now();
  }

  // --- Private helpers ---

  function _persist(): void {
    const state: ProgressState = {
      version: 1,
      currentStage: currentStage.value,
      currentQuestionIndex: currentQuestionIndex.value,
      quizPhase: quizPhase.value,
      completedStages: completedStages.value,
      stageResults: stageResults.value,
      userAnswersByStage: userAnswersByStage.value,
      lastUpdated: Date.now(),
    };

    // Use cloud persistence when user is authenticated, localStorage otherwise
    const authStore = useAuthStore();
    if (authStore.isAuthenticated) {
      progressTracker.persistToCloud(state).then((result) => {
        cloudSyncFailed.value = !result.synced;
      });
    } else {
      progressTracker.persist(state);
      cloudSyncFailed.value = false;
    }
  }

  /**
   * Enriches a VerificationResult into a full AnswerResult with human-readable labels.
   * Used by both submitAnswer and _reconstructLastAnswerResult to avoid duplication.
   */
  function _enrichResult(
    verification: VerificationResult,
    question: QuestionPresentation
  ): AnswerResult {
    const enriched: AnswerResult = {
      questionId: verification.questionId,
      isCorrect: verification.isCorrect,
      selectedAnswer: verification.selectedAnswer,
      correctAnswer: verification.correctAnswer,
      explanation: question.explanation,
      sourceUrl: question.sourceUrl || undefined,
    };

    if (question.type === 'ordering') {
      const items = question.options as OrderingItem[];
      if (Array.isArray(verification.correctAnswer)) {
        enriched.correctOrderLabels = verification.correctAnswer.map((id) => {
          const item = items.find((i) => i.id === id);
          return item?.label ?? id;
        });
      }
    } else {
      const options = question.options as AnswerOption[];
      if (typeof verification.selectedAnswer === 'string') {
        const selectedOpt = options.find((o) => o.id === verification.selectedAnswer);
        enriched.selectedAnswerLabel = selectedOpt?.label;
      }
      if (typeof verification.correctAnswer === 'string') {
        const correctOpt = options.find((o) => o.id === verification.correctAnswer);
        enriched.correctAnswerLabel = correctOpt?.label;
      }
    }

    return enriched;
  }

  function _reconstructLastAnswerResult(): void {
    const stageAnswers = userAnswersByStage.value[currentStage.value];
    if (!stageAnswers || stageAnswers.length === 0) return;

    const lastUserAnswer = stageAnswers[stageAnswers.length - 1];
    if (!lastUserAnswer) return;

    const question = questionStore.getQuestionById(lastUserAnswer.questionId);
    if (!question) return;

    let answerKey;
    try {
      answerKey = questionStore.getAnswerKey(lastUserAnswer.questionId);
    } catch {
      return;
    }

    const correctAnswer = question.type === 'ordering'
      ? (answerKey.correctOrder ?? (Array.isArray(answerKey.correctAnswerId) ? answerKey.correctAnswerId : []))
      : (typeof answerKey.correctAnswerId === 'string' ? answerKey.correctAnswerId : '');

    const verification: VerificationResult = {
      questionId: lastUserAnswer.questionId,
      isCorrect: lastUserAnswer.isCorrect,
      selectedAnswer: lastUserAnswer.selectedOptionId,
      correctAnswer,
    };

    lastAnswerResult.value = _enrichResult(verification, question);
  }

  return {
    // State
    currentStage,
    currentQuestionIndex,
    quizPhase,
    questions,
    completedStages,
    stageResults,
    userAnswersByStage,
    lastAnswerResult,
    errorMessage,
    sessionSeed,
    cloudSyncFailed,

    // Getters
    currentQuestion,
    currentQuestionWithRandomizedOptions,
    questionsAnswered,
    correctAnswerCount,
    totalScore,
    overallPercentage,
    performanceLevel,
    isAllComplete,
    recommendedNextStage,
    incorrectAnswers,

    // Actions
    startStage,
    submitAnswer,
    nextQuestion,
    completeStage,
    retryStage,
    restoreProgress,
    restoreProgressFromCloud,
    resetProgress,
  };
});
