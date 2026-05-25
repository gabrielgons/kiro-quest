import type { LearningStage, QuizPhase, StageResult, UserAnswer } from '@/engine/types';

export interface ProgressState {
  version: number;
  currentStage: LearningStage;
  currentQuestionIndex: number;
  quizPhase: QuizPhase;
  completedStages: LearningStage[];
  stageResults: Record<string, StageResult>;
  userAnswersByStage: Record<string, UserAnswer[]>;
  lastUpdated: number;
}
