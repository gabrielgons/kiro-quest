import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export type ApiEvent = APIGatewayProxyEventV2WithJWTAuthorizer;
export type ApiResponse = APIGatewayProxyStructuredResultV2;

/**
 * Extracts the userId (sub claim) from the JWT authorizer context.
 */
export function getUserId(event: ApiEvent): string | null {
  return (event.requestContext.authorizer?.jwt?.claims?.sub as string) || null;
}

/**
 * Extracts the user's email from JWT claims.
 */
export function getUserEmail(event: ApiEvent): string {
  return (event.requestContext.authorizer?.jwt?.claims?.email as string) || '';
}

/**
 * Extracts the user's name from JWT claims.
 */
export function getUserName(event: ApiEvent): string {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  return (claims?.name as string) || (claims?.['cognito:username'] as string) || 'Anonymous';
}

/**
 * Returns a JSON API Gateway response.
 */
export function jsonResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Returns an error response.
 */
export function errorResponse(statusCode: number, message: string): ApiResponse {
  return jsonResponse(statusCode, { error: message });
}
