/**
 * DynamoDB Single-Table Design for Kiro Quest
 *
 * Table: KiroQuestTable
 * Primary Key: pk (partition key), sk (sort key)
 *
 * Access Patterns:
 * 1. Get/Save user progress:  PK=USER#<userId>, SK=PROGRESS#<stageId>
 * 2. Get/Save stage results:  PK=USER#<userId>, SK=RESULT#<stageId>
 * 3. Get user profile:        PK=USER#<userId>, SK=PROFILE
 * 4. Get rankings by stage:   PK=RANKING#<stageId>, SK=SCORE#<paddedScore>#<timestamp>#<userId>
 *
 * GSI1 (for leaderboard queries):
 *   GSI1PK=RANKING#<stageId>, GSI1SK=SCORE#<paddedScore> (descending for top scores)
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
  quizPhase: string;
  userAnswers: UserAnswerRecord[];
  lastUpdated: number;
}

export interface UserAnswerRecord {
  questionId: string;
  selectedOptionId: string | string[];
  isCorrect: boolean;
  answeredAt: number;
}

export interface StageResultItem extends DynamoDBItem {
  entityType: 'STAGE_RESULT';
  userId: string;
  stageId: string;
  correctCount: number;
  totalCount: number;
  completedAt: number;
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

export interface RankingItem extends DynamoDBItem {
  entityType: 'RANKING';
  stageId: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  completedAt: number;
}

// API request/response types

export interface SaveProgressRequest {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: string;
  userAnswers: UserAnswerRecord[];
}

export interface GetProgressResponse {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: string;
  userAnswers: UserAnswerRecord[];
  lastUpdated: number;
}

export interface SubmitResultRequest {
  stageId: string;
  correctCount: number;
  totalCount: number;
}

export interface SubmitResultResponse {
  stageId: string;
  correctCount: number;
  totalCount: number;
  completedAt: number;
}

export interface RankingEntry {
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  completedAt: number;
}

export interface GetRankingsResponse {
  stageId: string;
  rankings: RankingEntry[];
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
