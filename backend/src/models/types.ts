/**
 * DynamoDB Single-Table Design for Kiro Quest
 *
 * Table: KiroQuestTable
 * Primary Key: pk (partition key), sk (sort key)
 *
 * Access Patterns:
 * 1. Get/Save user progress: PK=USER#<userId>, SK=PROGRESS#<stageId>
 * 2. Get user profile:       PK=USER#<userId>, SK=PROFILE
 */

export interface DynamoDBItem {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgressItem extends DynamoDBItem {
  entityType: 'USER_PROGRESS';
  userId: string;
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: QuizPhase;
  userAnswers: UserAnswerRecord[];
  lastUpdated: number;
}

export type QuizPhase = 'answering' | 'feedback' | 'stage-complete';

export interface UserAnswerRecord {
  questionId: string;
  selectedOptionId: string | string[];
  isCorrect: boolean;
  answeredAt: number;
}

export interface UserProfileItem extends DynamoDBItem {
  entityType: 'USER_PROFILE';
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  completedStages: string[];
  totalScore: number;
  lastActive: string;
}

// API request/response types

export interface SaveProgressRequest {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: QuizPhase;
  userAnswers: UserAnswerRecord[];
}

export interface GetProgressResponse {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: QuizPhase;
  userAnswers: UserAnswerRecord[];
  lastUpdated: number;
}

export interface UserProfileResponse {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  completedStages: string[];
  totalScore: number;
  lastActive: string;
}
