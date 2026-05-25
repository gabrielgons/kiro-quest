import type { LearningStage, QuizState, UserAnswer, StageResult, AnswerResult } from './types';
import type { QuestionPresentation, AnswerKey } from '@/data/types';
import { questionStore } from '@/data/questionStore';

/**
 * Ordered list of all learning stages for progression logic.
 */
const STAGE_ORDER: LearningStage[] = [
  'kiro-basics',
  'specs',
  'feature-specs',
  'bugfix-specs',
  'steering',
  'hooks',
  'mcp',
  'powers',
  'skills',
  'real-world-workflows',
  'enterprise-scenarios',
];

/**
 * Creates a fresh initial QuizState for a given stage.
 */
function createInitialState(stage: LearningStage, sessionSeed: number): QuizState {
  return {
    currentStage: stage,
    currentQuestionIndex: 0,
    answers: {},
    stageResults: {} as Record<LearningStage, StageResult>,
    completedStages: [],
    sessionSeed,
  };
}

/**
 * Determines whether the given answer is correct by comparing
 * the user's selected option(s) against the answer key.
 */
function evaluateAnswer(
  userAnswer: string | string[],
  answerKey: AnswerKey
): boolean {
  const correctAnswer = answerKey.correctAnswerId;

  if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
    // Ordering question: order matters
    if (correctAnswer.length !== userAnswer.length) return false;
    return correctAnswer.every((id, index) => id === userAnswer[index]);
  }

  if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
    return correctAnswer === userAnswer;
  }

  return false;
}

/**
 * Gets the next stage in the progression after the given stage.
 * Returns undefined if the given stage is the final one (enterprise-scenarios).
 */
function getNextStage(currentStage: LearningStage): LearningStage | undefined {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return undefined;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Checks if the given stage is the final stage.
 */
function isFinalStage(stage: LearningStage): boolean {
  return stage === 'enterprise-scenarios';
}

export interface QuizEngine {
  /**
   * Starts a stage by loading its questions and initializing quiz state.
   * Questions are sorted by difficulty (iniciante -> intermediario -> avancado).
   * Returns the initial QuizState and the list of questions for the stage.
   */
  startStage(stage: LearningStage, existingState?: Partial<QuizState>): {
    state: QuizState;
    questions: QuestionPresentation[];
  };

  /**
   * Submits an answer for a question, evaluates it, and returns the result.
   * Updates the quiz state with the user's answer.
   */
  submitAnswer(
    state: QuizState,
    questionId: string,
    selectedAnswer: string | string[]
  ): {
    state: QuizState;
    result: AnswerResult;
  };

  /**
   * Advances to the next question or signals stage completion.
   * Returns updated state and navigation info.
   */
  nextQuestion(
    state: QuizState,
    questions: QuestionPresentation[]
  ): {
    state: QuizState;
    isStageComplete: boolean;
    isFinalStageComplete: boolean;
    nextStage?: LearningStage;
  };

  /**
   * Gets the next stage in progression order.
   */
  getNextStage(currentStage: LearningStage): LearningStage | undefined;

  /**
   * Checks if a stage is the final stage.
   */
  isFinalStage(stage: LearningStage): boolean;
}

/**
 * Quiz Engine implementation.
 *
 * Handles:
 * - Stage initialization with difficulty-sorted questions (Req 3.2)
 * - Answer submission and evaluation against separate answer keys (Req 5.1, 5.2)
 * - Stage progression: advance to next stage on completion (Req 3.3)
 * - Final stage (Enterprise Scenarios) detection for achievement screen (Req 3.5)
 */
export const quizEngine: QuizEngine = {
  startStage(stage: LearningStage, existingState?: Partial<QuizState>) {
    const sessionSeed = existingState?.sessionSeed ?? Date.now();
    const questions = questionStore.getQuestionsForStage(stage);

    const state: QuizState = {
      ...createInitialState(stage, sessionSeed),
      ...existingState,
      currentStage: stage,
      currentQuestionIndex: 0,
    };

    return { state, questions };
  },

  submitAnswer(
    state: QuizState,
    questionId: string,
    selectedAnswer: string | string[]
  ) {
    const answerKey = questionStore.getAnswerKey(questionId);
    if (!answerKey) {
      throw new Error(`Answer key not found for question: ${questionId}`);
    }

    const question = questionStore.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }

    const isCorrect = evaluateAnswer(selectedAnswer, answerKey);

    const userAnswer: UserAnswer = {
      questionId,
      selectedOptionId: selectedAnswer,
      isCorrect,
      answeredAt: Date.now(),
    };

    const result: AnswerResult = {
      isCorrect,
      correctAnswerId: answerKey.correctAnswerId,
      explanation: question.explanation,
      sourceUrl: question.sourceUrl,
    };

    const newState: QuizState = {
      ...state,
      answers: {
        ...state.answers,
        [questionId]: userAnswer,
      },
    };

    return { state: newState, result };
  },

  nextQuestion(state: QuizState, questions: QuestionPresentation[]) {
    const nextIndex = state.currentQuestionIndex + 1;
    const isStageComplete = nextIndex >= questions.length;

    if (!isStageComplete) {
      // Advance to next question within the stage
      const newState: QuizState = {
        ...state,
        currentQuestionIndex: nextIndex,
      };
      return {
        state: newState,
        isStageComplete: false,
        isFinalStageComplete: false,
      };
    }

    // Stage is complete - calculate results
    const correctCount = questions.filter(
      (q) => state.answers[q.id]?.isCorrect
    ).length;

    const stageResult: StageResult = {
      stage: state.currentStage,
      correctCount,
      totalCount: questions.length,
      completedAt: Date.now(),
    };

    const completedStages = state.completedStages.includes(state.currentStage)
      ? state.completedStages
      : [...state.completedStages, state.currentStage];

    const isFinal = isFinalStage(state.currentStage);
    const nextStageId = getNextStage(state.currentStage);

    const newState: QuizState = {
      ...state,
      stageResults: {
        ...state.stageResults,
        [state.currentStage]: stageResult,
      },
      completedStages,
    };

    return {
      state: newState,
      isStageComplete: true,
      isFinalStageComplete: isFinal,
      nextStage: nextStageId,
    };
  },

  getNextStage,
  isFinalStage,
};
