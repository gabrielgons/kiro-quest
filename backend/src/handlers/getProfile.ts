import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { UserProfileItem, UserProgressItem, UserProfileResponse } from '../models/types.js';
import { getUserId, getUserEmail, getUserName, jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized', event);
  }

  try {
    const [profileResult, progressQuery] = await Promise.all([
      docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `USER#${userId}`,
            sk: 'PROFILE',
          },
        }),
      ),
      docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':skPrefix': 'PROGRESS#',
          },
        }),
      ),
    ]);

    const profile = profileResult.Item as UserProfileItem | undefined;
    const progress = (progressQuery.Items || []) as UserProgressItem[];
    const completedStages = progress
      .filter((item) => item.quizPhase === 'stage-complete')
      .map((item) => item.stageId);
    const totalScore = progress.reduce(
      (sum, item) =>
        sum + (item.userAnswers || []).filter((answer) => answer.isCorrect).length,
      0,
    );

    const now = new Date().toISOString();
    const email = getUserEmail(event);
    const name = getUserName(event);

    const response: UserProfileResponse = {
      userId: profile?.userId || userId,
      email: email || profile?.email || '',
      name: name !== 'Anonymous' ? name : profile?.name || name,
      picture: profile?.picture,
      completedStages,
      totalScore,
      lastActive: now,
    };

    return jsonResponse(200, response, event);
  } catch (err) {
    console.error('[getProfile] DynamoDB error:', err);
    return errorResponse(500, 'Internal server error', event);
  }
}
