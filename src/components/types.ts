export type StageStatus = 'completed' | 'in-progress' | 'not-started';

export interface MistakeItem {
  questionText: string;
  userAnswerLabel: string;
  correctAnswerLabel: string;
  explanation: string;
  sourceUrl?: string;
}
