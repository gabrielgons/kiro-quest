import type {
  LearningStage,
  VerificationResult,
  StageResult,
  PerformanceLevel,
  UserAnswer,
} from './types';
import type { QuestionType, AnswerKey } from '@/data/types';
import { STAGE_ORDER } from './stages';

export { STAGE_ORDER };

/**
 * Verifies an answer against the answer key.
 * Returns a minimal VerificationResult (no labels, no explanation).
 * Pure function — no side effects, no dependencies on data layer.
 */
export function verifyAnswer(
  questionType: QuestionType,
  answerKey: AnswerKey,
  selectedAnswer: string | string[]
): VerificationResult {
  let isCorrect: boolean;
  let correctAnswer: string | string[];

  if (questionType === 'ordering') {
    // Support both correctOrder and correctAnswerId as array (legacy format)
    correctAnswer = answerKey.correctOrder ?? (Array.isArray(answerKey.correctAnswerId) ? answerKey.correctAnswerId : []);
    if (Array.isArray(selectedAnswer) && Array.isArray(correctAnswer)) {
      if (selectedAnswer.length !== correctAnswer.length) {
        isCorrect = false;
      } else {
        isCorrect = correctAnswer.every((id, index) => id === selectedAnswer[index]);
      }
    } else {
      isCorrect = false;
    }
  } else {
    // For non-ordering: correctAnswerId must be a non-empty string
    if (typeof answerKey.correctAnswerId !== 'string' || !answerKey.correctAnswerId) {
      throw new Error(`Answer key for "${answerKey.questionId}" is missing correctAnswerId`);
    }
    correctAnswer = answerKey.correctAnswerId;
    isCorrect = selectedAnswer === correctAnswer;
  }

  return {
    questionId: answerKey.questionId,
    isCorrect,
    selectedAnswer,
    correctAnswer,
  };
}

/**
 * Calculates the stage result from user answers for a given stage.
 */
export function calculateStageResult(
  stage: LearningStage,
  answers: UserAnswer[]
): StageResult {
  const correctCount = answers.filter((a) => a.isCorrect).length;
  return {
    stage,
    correctCount,
    totalCount: answers.length,
    completedAt: Date.now(),
  };
}

/**
 * Calculates a percentage truncated to one decimal place.
 * Returns 0 if totalCount is 0.
 */
export function calculatePercentage(correctCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.trunc((correctCount / totalCount) * 1000) / 10;
}

/**
 * Assigns a PerformanceLevel based on correctCount and totalCount.
 * Uses percentage thresholds: 0-49 Iniciante, 50-74 Praticante, 75-89 Especialista, 90+ Mestre.
 */
export function calculatePerformanceLevel(
  correctCount: number,
  totalCount: number
): PerformanceLevel {
  const percentage = totalCount === 0 ? 0 : (correctCount / totalCount) * 100;

  if (percentage >= 90) return 'Mestre em Kiro';
  if (percentage >= 75) return 'Especialista em Kiro';
  if (percentage >= 50) return 'Praticante de Kiro';
  return 'Iniciante em Kiro';
}

/**
 * Returns true only when all 13 stages are completed.
 */
export function canShowFinalPerformance(completedStages: LearningStage[]): boolean {
  return completedStages.length >= STAGE_ORDER.length;
}

/**
 * Returns the next stage in the official order regardless of completion status.
 * Returns null if currentStage is the last stage.
 */
export function getNextStageInOrder(currentStage: LearningStage): LearningStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1] ?? null;
}

/**
 * Returns the first incomplete stage in the official order.
 * Returns null if all stages are completed.
 */
export function getRecommendedNextStage(
  completedStages: LearningStage[]
): LearningStage | null {
  for (const stage of STAGE_ORDER) {
    if (!completedStages.includes(stage)) {
      return stage;
    }
  }
  return null;
}
