import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export type ApiEvent = APIGatewayProxyEventV2WithJWTAuthorizer;
export type ApiResponse = APIGatewayProxyStructuredResultV2;

/**
 * Allowed origins for CORS, loaded from environment variable.
 * Format: comma-separated list of origins (e.g. "https://example.com,http://localhost:5173")
 */
const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
);

/**
 * Validates the request Origin header against ALLOWED_ORIGINS.
 * Returns the origin if allowed, or undefined if not.
 */
function getAllowedOrigin(event: ApiEvent): string | undefined {
  const origin = event.headers?.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  return undefined;
}

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
 * Validates a stageId parameter.
 * Must be alphanumeric with hyphens, max 50 characters.
 */
export function isValidStageId(stageId: string): boolean {
  return /^[a-z0-9-]{1,50}$/.test(stageId);
}

/**
 * Returns a JSON API Gateway response.
 * Validates the request Origin header against allowed origins for CORS.
 */
export function jsonResponse(statusCode: number, body: unknown, event?: ApiEvent): ApiResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  if (event) {
    const allowedOrigin = getAllowedOrigin(event);
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
    }
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

/**
 * Returns an error response.
 */
export function errorResponse(statusCode: number, message: string, event?: ApiEvent): ApiResponse {
  return jsonResponse(statusCode, { error: message }, event);
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
    return errorResponse(413, `Request body too large. Maximum size is ${MAX_BODY_SIZE_BYTES} bytes`, event);
  }
  return null;
}
