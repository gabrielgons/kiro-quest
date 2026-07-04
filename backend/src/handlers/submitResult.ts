import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { StageResultItem, RankingItem, SubmitResultRequest, SubmitResultResponse } from '../models/types.js';
import { getUserId, getUserName, jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized');
  }

  let body: SubmitResultRequest;
  try {
    body = JSON.parse(event.body || '{}') as SubmitResultRequest;
  } catch {
    return errorResponse(400, 'Invalid request body');
  }

  if (!body.stageId || body.correctCount === undefined || body.totalCount === undefined) {
    return errorResponse(400, 'Missing required fields: stageId, correctCount, totalCount');
  }

  const now = new Date().toISOString();
  const completedAt = Date.now();

  // Save the stage result
  const resultItem: StageResultItem = {
    pk: `USER#${userId}`,
    sk: `RESULT#${body.stageId}`,
    entityType: 'STAGE_RESULT',
    userId,
    stageId: body.stageId,
    correctCount: body.correctCount,
    totalCount: body.totalCount,
    completedAt,
    createdAt: now,
    updatedAt: now,
  };

  // Save ranking entry (zero-padded score for sort order)
  const paddedScore = String(body.correctCount).padStart(5, '0');
  const userName = getUserName(event);

  const rankingItem: RankingItem = {
    pk: `RANKING#${body.stageId}`,
    sk: `SCORE#${paddedScore}#${completedAt}#${userId}`,
    gsi1pk: `RANKING#${body.stageId}`,
    gsi1sk: `SCORE#${paddedScore}`,
    entityType: 'RANKING',
    stageId: body.stageId,
    userId,
    userName,
    score: body.correctCount,
    totalQuestions: body.totalCount,
    completedAt,
    createdAt: now,
    updatedAt: now,
  };

  // Write both items
  await Promise.all([
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: resultItem })),
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: rankingItem })),
  ]);

  const response: SubmitResultResponse = {
    stageId: body.stageId,
    correctCount: body.correctCount,
    totalCount: body.totalCount,
    completedAt,
  };

  return jsonResponse(200, response);
}
