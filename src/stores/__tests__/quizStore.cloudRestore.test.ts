import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useQuizStore } from '@/stores/quizStore';
import type { QuestionPresentation, AnswerKey } from '@/data/types';
import type { LearningStage } from '@/engine/types';
import type { ProgressState } from '@/progress/types';

const mockQuestions: QuestionPresentation[] = [
  {
    id: 'q1',
    category: 'Test',
    difficulty: 'iniciante',
    type: 'multiple-choice',
    text: 'Question 1',
    options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
    ],
    explanation: 'Explanation 1',
    sourceUrl: 'https://example.com',
    reviewStatus: 'reviewed',
    lastReviewedDate: '2025-01-15',
    locale: 'pt-BR',
    stage: 'kiro-basics',
  },
  {
    id: 'q2',
    category: 'Test',
    difficulty: 'iniciante',
    type: 'multiple-choice',
    text: 'Question 2',
    options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
    ],
    explanation: 'Explanation 2',
    sourceUrl: 'https://example.com',
    reviewStatus: 'reviewed',
    lastReviewedDate: '2025-01-15',
    locale: 'pt-BR',
    stage: 'kiro-basics',
  },
];

const mockAnswerKeys: Record<string, AnswerKey> = {
  q1: { questionId: 'q1', correctAnswerId: 'a' },
  q2: { questionId: 'q2', correctAnswerId: 'b' },
};

vi.mock('@/data/questionStore', () => ({
  questionStore: {
    getQuestionsForStage: (stage: LearningStage) => {
      if (stage === 'kiro-basics') return mockQuestions;
      return [];
    },
    getQuestionById: (id: string) => mockQuestions.find((q) => q.id === id),
    getAnswerKey: (questionId: string) => {
      const key = mockAnswerKeys[questionId];
      if (!key) throw new Error(`Answer key not found for question: ${questionId}`);
      return key;
    },
    getStages: () => ['kiro-basics'],
  },
}));

const mockRestoreFromCloud = vi.fn();

vi.mock('@/progress/progressTracker', () => ({
  progressTracker: {
    persist: vi.fn(),
    persistToCloud: vi.fn(() => Promise.resolve({ synced: true })),
    restore: vi.fn(() => ({ state: null, wasCorrupted: false })),
    restoreFromCloud: (...args: unknown[]) => mockRestoreFromCloud(...args),
    clear: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    isInitialized: true,
    initialize: vi.fn(),
  }),
}));

describe('quizStore - restoreProgressFromCloud', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRestoreFromCloud.mockReset();
  });

  it('hydrates store state when restoreFromCloud returns restored data', async () => {
    const cloudState: ProgressState = {
      version: 1,
      currentStage: 'kiro-basics',
      currentQuestionIndex: 1,
      quizPhase: 'answering',
      completedStages: [],
      stageResults: {},
      userAnswersByStage: {
        'kiro-basics': [
          { questionId: 'q1', selectedOptionId: 'a', isCorrect: true, answeredAt: 1000 },
        ],
      },
      lastUpdated: 2000,
    };

    mockRestoreFromCloud.mockResolvedValue({
      restored: true,
      state: cloudState,
    });

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(true);
    expect(mockRestoreFromCloud).toHaveBeenCalledOnce();
    expect(store.currentStage).toBe('kiro-basics');
    expect(store.currentQuestionIndex).toBe(1);
    expect(store.quizPhase).toBe('answering');
    expect(store.completedStages).toEqual([]);
    expect(store.userAnswersByStage['kiro-basics']).toHaveLength(1);
    expect(store.userAnswersByStage['kiro-basics']![0]!.questionId).toBe('q1');
    // Questions should be loaded for the current stage
    expect(store.questions).toHaveLength(2);
  });

  it('does nothing when restoreFromCloud returns restored: false', async () => {
    mockRestoreFromCloud.mockResolvedValue({
      restored: false,
      state: null,
    });

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(false);
    expect(mockRestoreFromCloud).toHaveBeenCalledOnce();
    // Store state should remain at defaults
    expect(store.currentStage).toBe('kiro-basics');
    expect(store.currentQuestionIndex).toBe(0);
    expect(store.quizPhase).toBe('answering');
    expect(store.completedStages).toEqual([]);
    expect(Object.keys(store.userAnswersByStage)).toHaveLength(0);
    expect(store.questions).toHaveLength(0);
  });

  it('does nothing when restoreFromCloud returns an error', async () => {
    mockRestoreFromCloud.mockResolvedValue({
      restored: false,
      state: null,
      error: 'API not configured',
    });

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(false);
    expect(store.completedStages).toEqual([]);
    expect(Object.keys(store.userAnswersByStage)).toHaveLength(0);
  });

  it('hydrates completedStages from cloud state', async () => {
    const cloudState: ProgressState = {
      version: 1,
      currentStage: 'kiro-basics',
      currentQuestionIndex: 0,
      quizPhase: 'stage-complete',
      completedStages: ['kiro-basics'],
      stageResults: {},
      userAnswersByStage: {
        'kiro-basics': [
          { questionId: 'q1', selectedOptionId: 'a', isCorrect: true, answeredAt: 1000 },
          { questionId: 'q2', selectedOptionId: 'b', isCorrect: true, answeredAt: 2000 },
        ],
      },
      lastUpdated: 3000,
    };

    mockRestoreFromCloud.mockResolvedValue({
      restored: true,
      state: cloudState,
    });

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(true);
    expect(store.completedStages).toContain('kiro-basics');
    expect(store.quizPhase).toBe('stage-complete');
    expect(store.userAnswersByStage['kiro-basics']).toHaveLength(2);
  });

  it('returns false and leaves state unchanged when restoreFromCloud rejects', async () => {
    mockRestoreFromCloud.mockRejectedValue(new Error('network'));

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(false);
    expect(mockRestoreFromCloud).toHaveBeenCalledOnce();
    // Store state should remain at defaults
    expect(store.currentStage).toBe('kiro-basics');
    expect(store.currentQuestionIndex).toBe(0);
    expect(store.quizPhase).toBe('answering');
    expect(store.completedStages).toEqual([]);
    expect(Object.keys(store.userAnswersByStage)).toHaveLength(0);
    expect(store.questions).toHaveLength(0);
  });

  it('reconstructs lastAnswerResult when quizPhase is feedback', async () => {
    const cloudState: ProgressState = {
      version: 1,
      currentStage: 'kiro-basics',
      currentQuestionIndex: 0,
      quizPhase: 'feedback',
      completedStages: [],
      stageResults: {},
      userAnswersByStage: {
        'kiro-basics': [
          { questionId: 'q1', selectedOptionId: 'a', isCorrect: true, answeredAt: 1000 },
        ],
      },
      lastUpdated: 2000,
    };

    mockRestoreFromCloud.mockResolvedValue({
      restored: true,
      state: cloudState,
    });

    const store = useQuizStore();
    await store.restoreProgressFromCloud();

    expect(store.quizPhase).toBe('feedback');
    expect(store.lastAnswerResult).not.toBeNull();
    expect(store.lastAnswerResult!.questionId).toBe('q1');
    expect(store.lastAnswerResult!.isCorrect).toBe(true);
  });

  it('computes stageResults for completed stages after cloud restore', async () => {
    mockRestoreFromCloud.mockResolvedValue({
      restored: true,
      state: {
        version: 1,
        currentStage: 'kiro-basics',
        currentQuestionIndex: 0,
        quizPhase: 'stage-complete',
        completedStages: ['kiro-basics'],
        stageResults: {},
        userAnswersByStage: {
          'kiro-basics': [
            { questionId: 'q1', selectedOptionId: 'a', isCorrect: true, answeredAt: 1000 },
            { questionId: 'q2', selectedOptionId: 'b', isCorrect: false, answeredAt: 2000 },
          ],
        },
        lastUpdated: Date.now(),
      },
    });

    const store = useQuizStore();
    const result = await store.restoreProgressFromCloud();

    expect(result).toBe(true);
    expect(store.stageResults['kiro-basics']).toBeDefined();
    expect(store.stageResults['kiro-basics'].totalCount).toBe(2);
    expect(store.stageResults['kiro-basics'].correctCount).toBe(1);
  });
});
