import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { UserProfileItem, StageResultItem, UserProfileResponse } from '../models/types.js';
import { getUserId, getUserEmail, getUserName, jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized');
  }

  // Try to get existing profile
  const profileResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${userId}`,
        sk: 'PROFILE',
      },
    }),
  );

  let profile = profileResult.Item as UserProfileItem | undefined;

  // Get all stage results to compute completedStages and totalScore
  const resultsQuery = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'RESULT#',
      },
    }),
  );

  const stageResults = (resultsQuery.Items || []) as StageResultItem[];
  const completedStages = stageResults.map((r) => r.stageId);
  const totalScore = stageResults.reduce((sum, r) => sum + r.correctCount, 0);

  const now = new Date().toISOString();
  const email = getUserEmail(event);
  const name = getUserName(event);

  if (!profile) {
    // Create profile on first access
    profile = {
      pk: `USER#${userId}`,
      sk: 'PROFILE',
      entityType: 'USER_PROFILE',
      userId,
      email,
      name,
      completedStages,
      totalScore,
      lastActive: now,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    // Update profile with latest data
    profile.completedStages = completedStages;
    profile.totalScore = totalScore;
    profile.lastActive = now;
    profile.updatedAt = now;
    if (email) profile.email = email;
    if (name) profile.name = name;
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: profile,
    }),
  );

  const response: UserProfileResponse = {
    userId: profile.userId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    completedStages: profile.completedStages,
    totalScore: profile.totalScore,
    lastActive: profile.lastActive,
  };

  return jsonResponse(200, response);
}
