import type { LearningStage } from '@/engine/types';

export type DifficultyLevel = 'iniciante' | 'intermediário' | 'avançado';

export type QuestionType = 'multiple-choice' | 'true-false' | 'scenario' | 'ordering';

export type ReviewStatus = 'reviewed' | 'needs-review' | 'draft';

export type Locale = 'pt-BR' | string;

export interface QuestionPresentation {
  id: string;
  category: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  text: string;
  options: AnswerOption[] | OrderingItem[];
  explanation: string;
  sourceUrl: string;
  reviewStatus: ReviewStatus;
  lastReviewedDate: string;
  locale: Locale;
  stage: LearningStage;
}

export interface AnswerOption {
  id: string;
  label: string;
}

export interface OrderingItem {
  id: string;
  label: string;
}

export interface AnswerKey {
  questionId: string;
  correctAnswerId: string | string[];
}
