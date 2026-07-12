import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../models/dynamodb.js';
import type { UserProfileItem, StageResultItem, UserProfileResponse } from '../models/types.js';
import { getUserId, getUserEmail, getUserName, jsonResponse, errorResponse } from './utils.js';
import type { ApiEvent, ApiResponse } from './utils.js';

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized', event);
  }

  try {
    // Parallelize both reads with Promise.all
    const [profileResult, resultsQuery] = await Promise.all([
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
            ':skPrefix': 'RESULT#',
          },
        }),
      ),
    ]);

    const profile = profileResult.Item as UserProfileItem | undefined;
    const stageResults = (resultsQuery.Items || []) as StageResultItem[];
    const completedStages = stageResults.map((r) => r.stageId);
    const totalScore = stageResults.reduce((sum, r) => sum + r.correctCount, 0);

    const now = new Date().toISOString();
    const email = getUserEmail(event);
    const name = getUserName(event);

    if (!profile) {
      // Create profile on first access using UpdateCommand (upsert)
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `USER#${userId}`,
            sk: 'PROFILE',
          },
          UpdateExpression:
            'SET entityType = :entityType, userId = :userId, email = :email, #n = :name, completedStages = :completedStages, totalScore = :totalScore, lastActive = :lastActive, createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
          ExpressionAttributeNames: {
            '#n': 'name',
          },
          ExpressionAttributeValues: {
            ':entityType': 'USER_PROFILE',
            ':userId': userId,
            ':email': email,
            ':name': name,
            ':completedStages': completedStages,
            ':totalScore': totalScore,
            ':lastActive': now,
            ':now': now,
          },
        }),
      );

      const response: UserProfileResponse = {
        userId,
        email,
        name,
        picture: undefined,
        completedStages,
        totalScore,
        lastActive: now,
      };

      return jsonResponse(200, response, event);
    }

    // Update existing profile with UpdateCommand
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${userId}`,
          sk: 'PROFILE',
        },
        UpdateExpression:
          'SET completedStages = :completedStages, totalScore = :totalScore, lastActive = :lastActive, updatedAt = :now, email = :email, #n = :name',
        ExpressionAttributeNames: {
          '#n': 'name',
        },
        ExpressionAttributeValues: {
          ':completedStages': completedStages,
          ':totalScore': totalScore,
          ':lastActive': now,
          ':now': now,
          ':email': email || profile.email,
          ':name': name || profile.name,
        },
      }),
    );

    const response: UserProfileResponse = {
      userId: profile.userId,
      email: email || profile.email,
      name: name || profile.name,
      picture: profile.picture,
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
