import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiEvent } from '../handlers/utils.js';
import {
  getUserId,
  getUserEmail,
  getUserName,
  errorResponse,
  isValidStageId,
  isValidSaveProgressRequest,
  validateBodySize,
} from '../handlers/utils.js';
import { STAGE_QUESTION_COUNTS } from '../models/stageCatalog.js';

function createAnswer(questionNumber: number) {
  return {
    questionId: `question-${questionNumber}`,
    selectedOptionId: `option-${questionNumber}`,
    isCorrect: true,
    answeredAt: 1704067200000 + questionNumber,
  };
}

function createMockEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    version: '2.0',
    routeKey: 'GET /api/test',
    rawPath: '/api/test',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'testapi',
      authorizer: {
        jwt: {
          claims: {
            sub: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          scopes: [],
        },
      },
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/api/test',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /api/test',
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    body: null,
    isBase64Encoded: false,
    queryStringParameters: undefined,
    ...overrides,
  } as unknown as ApiEvent;
}

describe('Handler Utils', () => {
  describe('getUserId', () => {
    it('should extract userId from JWT claims', () => {
      const event = createMockEvent();
      expect(getUserId(event)).toBe('user-123');
    });

    it('should return null when no sub claim', () => {
      const event = createMockEvent();
      event.requestContext.authorizer.jwt.claims = {};
      expect(getUserId(event)).toBeNull();
    });
  });

  describe('getUserEmail', () => {
    it('should extract email from JWT claims', () => {
      const event = createMockEvent();
      expect(getUserEmail(event)).toBe('test@example.com');
    });

    it('should return empty string when no email claim', () => {
      const event = createMockEvent();
      event.requestContext.authorizer.jwt.claims = { sub: 'user-123' };
      expect(getUserEmail(event)).toBe('');
    });
  });

  describe('getUserName', () => {
    it('should extract name from JWT claims', () => {
      const event = createMockEvent();
      expect(getUserName(event)).toBe('Test User');
    });

    it('should fall back to cognito:username', () => {
      const event = createMockEvent();
      event.requestContext.authorizer.jwt.claims = {
        sub: 'user-123',
        'cognito:username': 'cognitouser',
      };
      expect(getUserName(event)).toBe('cognitouser');
    });

    it('should return Anonymous when no name claims', () => {
      const event = createMockEvent();
      event.requestContext.authorizer.jwt.claims = { sub: 'user-123' };
      expect(getUserName(event)).toBe('Anonymous');
    });
  });

  describe('jsonResponse', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should create a proper JSON response with valid origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,http://localhost:5173';
      const { jsonResponse: jsonRes } = await import('../handlers/utils.js');

      const event = createMockEvent({
        headers: { origin: 'https://example.com' },
      });

      const response = jsonRes(200, { message: 'ok' }, event);
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(response.body).toBe(JSON.stringify({ message: 'ok' }));
    });

    it('should not set Access-Control-Allow-Origin when no event is provided', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      const { jsonResponse: jsonRes } = await import('../handlers/utils.js');

      const response = jsonRes(200, { message: 'ok' });
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      expect(response.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
      expect(response.body).toBe(JSON.stringify({ message: 'ok' }));
    });

    it('should not set Access-Control-Allow-Origin when origin is not allowed', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      const { jsonResponse: jsonRes } = await import('../handlers/utils.js');

      const event = createMockEvent({
        headers: { origin: 'https://evil.com' },
      });

      const response = jsonRes(200, { message: 'ok' }, event);
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('errorResponse', () => {
    it('should create an error response', () => {
      const response = errorResponse(400, 'Bad request');
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body as string)).toEqual({ error: 'Bad request' });
    });
  });

  describe('request validation', () => {
    it.each(['pt-BR', 'en'])(
      'should keep the backend catalog aligned with %s content',
      (locale) => {
        const testDirectory = dirname(fileURLToPath(import.meta.url));
        const contentDirectory = join(
          testDirectory,
          '..',
          '..',
          '..',
          'content',
          'questions',
          locale,
        );
        const catalog = Object.fromEntries(
          readdirSync(contentDirectory)
            .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
            .map((file) => {
              const data = JSON.parse(
                readFileSync(join(contentDirectory, file), 'utf8'),
              ) as { stage: string; questions: unknown[] };
              return [data.stage, data.questions.length];
            }),
        );

        expect(catalog).toEqual(STAGE_QUESTION_COUNTS);
      },
    );

    it('should only accept stage IDs from the catalog', () => {
      expect(isValidStageId('kiro-basics')).toBe(true);
      expect(isValidStageId('made-up-stage')).toBe(false);
      expect(isValidStageId('../kiro-basics')).toBe(false);
    });

    it('should accept a structurally consistent progress payload', () => {
      expect(isValidSaveProgressRequest({
        stageId: 'kiro-basics',
        currentQuestionIndex: 1,
        quizPhase: 'feedback',
        userAnswers: [createAnswer(0), createAnswer(1)],
      })).toBe(true);
    });

    it.each([
      {
        stageId: 'made-up-stage',
        currentQuestionIndex: 0,
        quizPhase: 'answering',
        userAnswers: [],
      },
      {
        stageId: 'kiro-basics',
        currentQuestionIndex: -1,
        quizPhase: 'answering',
        userAnswers: [],
      },
      {
        stageId: 'kiro-basics',
        currentQuestionIndex: 0,
        quizPhase: 'unknown',
        userAnswers: [],
      },
      {
        stageId: 'kiro-basics',
        currentQuestionIndex: 2,
        quizPhase: 'answering',
        userAnswers: [],
      },
      {
        stageId: 'kiro-basics',
        currentQuestionIndex: 0,
        quizPhase: 'feedback',
        userAnswers: [{ ...createAnswer(0), extra: 'not allowed' }],
      },
    ])('should reject invalid progress payload %#', (payload) => {
      expect(isValidSaveProgressRequest(payload)).toBe(false);
    });

    it('should reject bodies larger than 16 KiB', () => {
      const event = createMockEvent({ body: 'x'.repeat(16 * 1024 + 1) });
      expect(validateBodySize(event)?.statusCode).toBe(413);
    });
  });
});

describe('saveProgress handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return 401 when no userId', async () => {
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/saveProgress.js');
    const event = createMockEvent({
      body: JSON.stringify({ stageId: 'kiro-basics', currentQuestionIndex: 0, quizPhase: 'answering' }),
    });
    event.requestContext.authorizer.jwt.claims = {};

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
  });

  it('should return 400 when body is missing required fields', async () => {
    const mockSend = vi.fn();
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/saveProgress.js');
    const event = createMockEvent({ body: JSON.stringify({}) });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should save progress and return 200', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/saveProgress.js');
    const event = createMockEvent({
      body: JSON.stringify({
        stageId: 'kiro-basics',
        currentQuestionIndex: 2,
        quizPhase: 'answering',
        userAnswers: [createAnswer(0), createAnswer(1)],
      }),
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledOnce();

    const body = JSON.parse(response.body as string);
    expect(body.stageId).toBe('kiro-basics');
    expect(body.currentQuestionIndex).toBe(2);
  });
});

describe('getProgress handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return 401 when no userId', async () => {
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getProgress.js');
    const event = createMockEvent();
    event.requestContext.authorizer.jwt.claims = {};

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
  });

  it('should return empty progress when none exists', async () => {
    const mockSend = vi.fn().mockResolvedValue({ Items: [] });
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getProgress.js');
    const event = createMockEvent();

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body as string);
    expect(body.progress).toEqual([]);
  });

  it('should return progress for a specific stage', async () => {
    const mockItem = {
      pk: 'USER#user-123',
      sk: 'PROGRESS#kiro-basics',
      stageId: 'kiro-basics',
      currentQuestionIndex: 3,
      quizPhase: 'feedback',
      userAnswers: [],
      lastUpdated: 1700000000000,
    };
    const mockSend = vi.fn().mockResolvedValue({ Items: [mockItem] });
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getProgress.js');
    const event = createMockEvent({
      queryStringParameters: { stageId: 'kiro-basics' },
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body as string);
    expect(body.progress).toHaveLength(1);
    expect(body.progress[0].stageId).toBe('kiro-basics');
  });

  it('should reject an unknown stage without querying DynamoDB', async () => {
    const mockSend = vi.fn();
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getProgress.js');
    const event = createMockEvent({
      queryStringParameters: { stageId: 'made-up-stage' },
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('getProfile handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should derive the profile from progress without writing to DynamoDB', async () => {
    const mockSend = vi.fn()
      .mockResolvedValueOnce({ Items: undefined, Item: undefined })
      .mockResolvedValueOnce({
        Items: [
          {
            stageId: 'kiro-basics',
            quizPhase: 'stage-complete',
            userAnswers: [
              createAnswer(0),
              { ...createAnswer(1), isCorrect: false },
            ],
          },
        ],
      });
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getProfile.js');
    const response = await handler(createMockEvent());

    expect(response.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
    const body = JSON.parse(response.body as string);
    expect(body.completedStages).toEqual(['kiro-basics']);
    expect(body.totalScore).toBe(1);
  });
});
