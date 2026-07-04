import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { SaveProgressRequest, UserProgressItem } from '../models/types.js';
import { getUserId, jsonResponse, errorResponse, validateBodySize } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized');
  }

  const bodySizeError = validateBodySize(event);
  if (bodySizeError) return bodySizeError;

  let body: SaveProgressRequest;
  try {
    body = JSON.parse(event.body || '{}') as SaveProgressRequest;
  } catch {
    return errorResponse(400, 'Invalid request body');
  }

  if (!body.stageId || body.currentQuestionIndex === undefined || !body.quizPhase) {
    return errorResponse(400, 'Missing required fields: stageId, currentQuestionIndex, quizPhase');
  }

  const now = new Date().toISOString();
  const item: UserProgressItem = {
    pk: `USER#${userId}`,
    sk: `PROGRESS#${body.stageId}`,
    entityType: 'USER_PROGRESS',
    userId,
    stageId: body.stageId,
    currentQuestionIndex: body.currentQuestionIndex,
    quizPhase: body.quizPhase,
    userAnswers: body.userAnswers || [],
    lastUpdated: Date.now(),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return jsonResponse(200, {
    stageId: body.stageId,
    currentQuestionIndex: body.currentQuestionIndex,
    quizPhase: body.quizPhase,
    lastUpdated: item.lastUpdated,
  });
}
