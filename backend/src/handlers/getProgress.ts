import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { UserProgressItem, GetProgressResponse } from '../models/types.js';
import { getUserId, jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized', event);
  }

  // Optional stageId filter from query params
  const stageId = event.queryStringParameters?.stageId;

  try {
    if (stageId) {
      // Get progress for a specific stage
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND sk = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': `PROGRESS#${stageId}`,
          },
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        return jsonResponse(200, { progress: [] }, event);
      }

      const item = result.Items[0] as UserProgressItem;
      const response: GetProgressResponse = {
        stageId: item.stageId,
        currentQuestionIndex: item.currentQuestionIndex,
        quizPhase: item.quizPhase,
        userAnswers: item.userAnswers,
        lastUpdated: item.lastUpdated,
      };

      return jsonResponse(200, { progress: [response] }, event);
    }

    // Get all progress for user
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':skPrefix': 'PROGRESS#',
        },
      }),
    );

    const progress: GetProgressResponse[] = (result.Items || []).map((item) => {
      const progressItem = item as UserProgressItem;
      return {
        stageId: progressItem.stageId,
        currentQuestionIndex: progressItem.currentQuestionIndex,
        quizPhase: progressItem.quizPhase,
        userAnswers: progressItem.userAnswers,
        lastUpdated: progressItem.lastUpdated,
      };
    });

    return jsonResponse(200, { progress }, event);
  } catch (err) {
    console.error('[getProgress] DynamoDB error:', err);
    return errorResponse(500, 'Internal server error', event);
  }
}
