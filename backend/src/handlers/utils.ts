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

/**
 * Maximum allowed request body size in bytes (100KB).
 * DynamoDB items have a 400KB limit, and this provides a safety margin
 * to prevent oversized payloads from reaching the database.
 */
const MAX_BODY_SIZE_BYTES = 100 * 1024;

/**
 * Validates that the request body does not exceed the maximum allowed size.
 * Returns an error response if the body is too large, or null if valid.
 */
export function validateBodySize(event: ApiEvent): ApiResponse | null {
  const body = event.body || '';
  const bodySize = event.isBase64Encoded
    ? Math.ceil(body.length * 0.75) // Base64 decodes to ~75% of encoded size
    : new TextEncoder().encode(body).length;

  if (bodySize > MAX_BODY_SIZE_BYTES) {
    return errorResponse(413, `Request body too large. Maximum size is ${MAX_BODY_SIZE_BYTES} bytes`);
  }
  return null;
}
