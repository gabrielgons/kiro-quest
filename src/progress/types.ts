import type { LearningStage, StageResult } from '@/engine/types';

export interface ProgressState {
  version: number;
  completedStages: LearningStage[];
  currentStage: LearningStage;
  currentQuestionIndex: number;
  questionsAnswered: number;
  correctAnswerCount: number;
  totalScore: number;
  stageResults: Record<string, StageResult>;
  lastUpdated: number;
}
