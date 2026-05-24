export type LearningStage =
  | 'kiro-basics'
  | 'specs'
  | 'feature-specs'
  | 'bugfix-specs'
  | 'steering'
  | 'hooks'
  | 'mcp'
  | 'powers'
  | 'skills'
  | 'real-world-workflows'
  | 'enterprise-scenarios';

export interface QuizState {
  currentStage: LearningStage;
  currentQuestionIndex: number;
  answers: Record<string, UserAnswer>;
  stageResults: Record<LearningStage, StageResult>;
  completedStages: LearningStage[];
  sessionSeed: number;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string | string[];
  isCorrect: boolean;
  answeredAt: number;
}

export interface StageResult {
  stage: LearningStage;
  correctCount: number;
  totalCount: number;
  completedAt: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswerId: string | string[];
  explanation: string;
  sourceUrl: string;
}

export type PerformanceLevel =
  | 'Iniciante em Kiro'
  | 'Praticante de Kiro'
  | 'Especialista em Kiro'
  | 'Mestre em Kiro';
