import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { STAGE_QUESTION_COUNTS, isStageId } from '../models/stageCatalog.js';
import type { QuizPhase, SaveProgressRequest, UserAnswerRecord } from '../models/types.js';

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
 * Validates a stageId against the actual stage catalog.
 */
export function isValidStageId(stageId: unknown): stageId is keyof typeof STAGE_QUESTION_COUNTS {
  return isStageId(stageId);
}

const QUIZ_PHASES = new Set<QuizPhase>(['answering', 'feedback', 'stage-complete']);
const MAX_IDENTIFIER_LENGTH = 100;
const MAX_SELECTED_OPTIONS = 10;

function isNonEmptyBoundedString(value: unknown): value is string {
  return (
    typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_IDENTIFIER_LENGTH
  );
}

function isUserAnswerRecord(value: unknown): value is UserAnswerRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const answer = value as Record<string, unknown>;
  const keys = Object.keys(answer);
  if (
    keys.length !== 4
    || !keys.every((key) =>
      ['questionId', 'selectedOptionId', 'isCorrect', 'answeredAt'].includes(key))
  ) {
    return false;
  }

  const selectedOptionId = answer.selectedOptionId;
  const isValidSelection = isNonEmptyBoundedString(selectedOptionId)
    || (
      Array.isArray(selectedOptionId)
      && selectedOptionId.length > 0
      && selectedOptionId.length <= MAX_SELECTED_OPTIONS
      && selectedOptionId.every(isNonEmptyBoundedString)
      && new Set(selectedOptionId).size === selectedOptionId.length
    );

  return (
    isNonEmptyBoundedString(answer.questionId)
    && isValidSelection
    && typeof answer.isCorrect === 'boolean'
    && typeof answer.answeredAt === 'number'
    && Number.isSafeInteger(answer.answeredAt)
    && answer.answeredAt >= 0
  );
}

/**
 * Validates the full progress document and its phase/index/answer invariants.
 */
export function isValidSaveProgressRequest(value: unknown): value is SaveProgressRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (
    keys.length !== 4
    || !keys.every((key) =>
      ['stageId', 'currentQuestionIndex', 'quizPhase', 'userAnswers'].includes(key))
  ) {
    return false;
  }

  if (
    !isValidStageId(body.stageId)
    || typeof body.currentQuestionIndex !== 'number'
    || !Number.isInteger(body.currentQuestionIndex)
    || typeof body.quizPhase !== 'string'
    || !QUIZ_PHASES.has(body.quizPhase as QuizPhase)
    || !Array.isArray(body.userAnswers)
  ) {
    return false;
  }

  const questionCount = STAGE_QUESTION_COUNTS[body.stageId];
  if (
    body.currentQuestionIndex < 0
    || body.currentQuestionIndex >= questionCount
    || body.userAnswers.length > questionCount
    || !body.userAnswers.every(isUserAnswerRecord)
  ) {
    return false;
  }

  const questionIds = body.userAnswers.map((answer) => answer.questionId);
  if (new Set(questionIds).size !== questionIds.length) return false;

  switch (body.quizPhase) {
    case 'answering':
      return body.userAnswers.length === body.currentQuestionIndex;
    case 'feedback':
      return body.userAnswers.length === body.currentQuestionIndex + 1;
    case 'stage-complete':
      return (
        body.currentQuestionIndex === questionCount - 1
        && body.userAnswers.length === questionCount
      );
    default:
      return false;
  }
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
 * Maximum allowed request body size in bytes (16 KiB).
 * A valid stage has at most eight compact answer records.
 */
const MAX_BODY_SIZE_BYTES = 16 * 1024;

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
