import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { StageResultItem, RankingItem, SubmitResultRequest, SubmitResultResponse } from '../models/types.js';
import { getUserId, getUserName, jsonResponse, errorResponse, validateBodySize, isValidStageId } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized', event);
  }

  const bodySizeError = validateBodySize(event);
  if (bodySizeError) return bodySizeError;

  let body: SubmitResultRequest;
  try {
    body = JSON.parse(event.body || '{}') as SubmitResultRequest;
  } catch {
    return errorResponse(400, 'Invalid request body', event);
  }

  if (!body.stageId || body.correctCount === undefined || body.totalCount === undefined) {
    return errorResponse(400, 'Missing required fields: stageId, correctCount, totalCount', event);
  }

  if (!isValidStageId(body.stageId)) {
    return errorResponse(400, 'Invalid stageId format', event);
  }

  // Validate numeric fields: must be integers, non-negative, and correctCount <= totalCount
  if (
    typeof body.correctCount !== 'number' ||
    typeof body.totalCount !== 'number' ||
    !Number.isInteger(body.correctCount) ||
    !Number.isInteger(body.totalCount) ||
    body.correctCount < 0 ||
    body.totalCount < 0 ||
    body.correctCount > body.totalCount
  ) {
    return errorResponse(400, 'correctCount and totalCount must be non-negative integers with correctCount <= totalCount', event);
  }

  try {
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
    // Invert timestamp so that within the same score, earlier completions sort first
    // (first-to-achieve ranks higher). Using max timestamp of 9999999999999 (year 2286).
    const MAX_TIMESTAMP = 9999999999999;
    const paddedScore = String(body.correctCount).padStart(5, '0');
    const invertedTimestamp = String(MAX_TIMESTAMP - completedAt).padStart(13, '0');
    const userName = getUserName(event);

    const rankingItem: RankingItem = {
      pk: `RANKING#${body.stageId}`,
      sk: `SCORE#${paddedScore}#${invertedTimestamp}#${userId}`,
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

    return jsonResponse(200, response, event);
  } catch (err) {
    console.error('[submitResult] DynamoDB error:', err);
    return errorResponse(500, 'Internal server error', event);
  }
}
