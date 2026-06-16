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
  | 'enterprise-scenarios'
  | 'kiro-cli'
  | 'kiro-web';

export type QuizPhase = 'answering' | 'feedback' | 'stage-complete';

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

export interface VerificationResult {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
}

export interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
  selectedAnswerLabel?: string;
  correctAnswerLabel?: string;
  correctOrderLabels?: string[];
  explanation: string;
  sourceUrl?: string;
}

export type PerformanceLevel =
  | 'Iniciante em Kiro'
  | 'Praticante de Kiro'
  | 'Especialista em Kiro'
  | 'Mestre em Kiro';
