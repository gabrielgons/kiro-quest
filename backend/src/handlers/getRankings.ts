import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { RankingItem, RankingEntry, GetRankingsResponse } from '../models/types.js';
import { jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const stageId = event.queryStringParameters?.stageId;

  if (!stageId) {
    return errorResponse(400, 'Missing required query parameter: stageId');
  }

  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || '10', 10),
    50,
  );

  // Query rankings for the stage, sorted by score descending
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `RANKING#${stageId}`,
        ':skPrefix': 'SCORE#',
      },
      ScanIndexForward: false, // Descending order (highest scores first)
      Limit: limit,
    }),
  );

  const rankings: RankingEntry[] = (result.Items || []).map((item) => {
    const rankItem = item as RankingItem;
    return {
      userId: rankItem.userId,
      userName: rankItem.userName,
      score: rankItem.score,
      totalQuestions: rankItem.totalQuestions,
      completedAt: rankItem.completedAt,
    };
  });

  const response: GetRankingsResponse = {
    stageId,
    rankings,
  };

  return jsonResponse(200, response);
}
