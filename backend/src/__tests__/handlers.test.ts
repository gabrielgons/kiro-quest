import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiEvent } from '../handlers/utils.js';
import { getUserId, getUserEmail, getUserName, jsonResponse, errorResponse } from '../handlers/utils.js';

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
    it('should create a proper JSON response', () => {
      const response = jsonResponse(200, { message: 'ok' });
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(response.body).toBe(JSON.stringify({ message: 'ok' }));
    });
  });

  describe('errorResponse', () => {
    it('should create an error response', () => {
      const response = errorResponse(400, 'Bad request');
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body as string)).toEqual({ error: 'Bad request' });
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
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/saveProgress.js');
    const event = createMockEvent({ body: JSON.stringify({}) });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
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
        userAnswers: [],
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
});

describe('getRankings handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return 400 when stageId is missing', async () => {
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getRankings.js');
    const event = createMockEvent();

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
  });

  it('should return rankings for a stage', async () => {
    const mockItems = [
      {
        userId: 'user-1',
        userName: 'Alice',
        score: 10,
        totalQuestions: 10,
        completedAt: 1700000000000,
      },
      {
        userId: 'user-2',
        userName: 'Bob',
        score: 8,
        totalQuestions: 10,
        completedAt: 1700000001000,
      },
    ];
    const mockSend = vi.fn().mockResolvedValue({ Items: mockItems });
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/getRankings.js');
    const event = createMockEvent({
      queryStringParameters: { stageId: 'kiro-basics' },
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body as string);
    expect(body.stageId).toBe('kiro-basics');
    expect(body.rankings).toHaveLength(2);
    expect(body.rankings[0].userName).toBe('Alice');
  });
});

describe('submitResult handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return 401 when no userId', async () => {
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/submitResult.js');
    const event = createMockEvent({
      body: JSON.stringify({ stageId: 'kiro-basics', correctCount: 8, totalCount: 10 }),
    });
    event.requestContext.authorizer.jwt.claims = {};

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
  });

  it('should return 400 when body is missing required fields', async () => {
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/submitResult.js');
    const event = createMockEvent({ body: JSON.stringify({ stageId: 'kiro-basics' }) });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
  });

  it('should save result and ranking and return 200', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    vi.doMock('../models/dynamodb.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'TestTable',
    }));

    const { handler } = await import('../handlers/submitResult.js');
    const event = createMockEvent({
      body: JSON.stringify({ stageId: 'kiro-basics', correctCount: 9, totalCount: 10 }),
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    // Should write both result and ranking items
    expect(mockSend).toHaveBeenCalledTimes(2);

    const body = JSON.parse(response.body as string);
    expect(body.stageId).toBe('kiro-basics');
    expect(body.correctCount).toBe(9);
    expect(body.totalCount).toBe(10);
    expect(body.completedAt).toBeGreaterThan(0);
  });
});
