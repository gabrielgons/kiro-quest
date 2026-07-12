import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { SaveProgressRequest } from '../models/types.js';
import { getUserId, jsonResponse, errorResponse, validateBodySize, isValidStageId } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized', event);
  }

  const bodySizeError = validateBodySize(event);
  if (bodySizeError) return bodySizeError;

  let body: SaveProgressRequest;
  try {
    body = JSON.parse(event.body || '{}') as SaveProgressRequest;
  } catch {
    return errorResponse(400, 'Invalid request body', event);
  }

  if (!body.stageId || body.currentQuestionIndex === undefined || !body.quizPhase) {
    return errorResponse(400, 'Missing required fields: stageId, currentQuestionIndex, quizPhase', event);
  }

  if (!isValidStageId(body.stageId)) {
    return errorResponse(400, 'Invalid stageId format', event);
  }

  try {
    const now = new Date().toISOString();
    const lastUpdated = Date.now();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${userId}`, sk: `PROGRESS#${body.stageId}` },
        UpdateExpression:
          'SET entityType = :et, userId = :uid, stageId = :sid, currentQuestionIndex = :qi, quizPhase = :qp, userAnswers = :ua, lastUpdated = :lu, updatedAt = :now, createdAt = if_not_exists(createdAt, :now)',
        ExpressionAttributeValues: {
          ':et': 'USER_PROGRESS',
          ':uid': userId,
          ':sid': body.stageId,
          ':qi': body.currentQuestionIndex,
          ':qp': body.quizPhase,
          ':ua': body.userAnswers || [],
          ':lu': lastUpdated,
          ':now': now,
        },
      }),
    );

    return jsonResponse(200, {
      stageId: body.stageId,
      currentQuestionIndex: body.currentQuestionIndex,
      quizPhase: body.quizPhase,
      lastUpdated,
    }, event);
  } catch (err) {
    console.error('[saveProgress] DynamoDB error:', err);
    return errorResponse(500, 'Internal server error', event);
  }
}
