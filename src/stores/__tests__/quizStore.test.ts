import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useQuizStore } from '@/stores/quizStore';
import type { QuestionPresentation, AnswerKey } from '@/data/types';
import type { LearningStage } from '@/engine/types';

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
  {
    id: 'q3',
    category: 'Test',
    difficulty: 'intermediário',
    type: 'multiple-choice',
    text: 'Question 3',
    options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
    ],
    explanation: 'Explanation 3',
    sourceUrl: 'https://example.com',
    reviewStatus: 'reviewed',
    lastReviewedDate: '2025-01-15',
    locale: 'pt-BR',
    stage: 'kiro-basics',
  },
  {
    id: 'q4',
    category: 'Test',
    difficulty: 'avançado',
    type: 'multiple-choice',
    text: 'Question 4',
    options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
    ],
    explanation: 'Explanation 4',
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
  q3: { questionId: 'q3', correctAnswerId: 'c' },
  q4: { questionId: 'q4', correctAnswerId: 'a' },
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

vi.mock('@/progress/progressTracker', () => ({
  progressTracker: {
    persist: vi.fn(),
    restore: vi.fn(() => ({ state: null, wasCorrupted: false })),
    clear: vi.fn(),
  },
}));

describe('quizStore - retry score accumulation fix', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function answerAllQuestions(store: ReturnType<typeof useQuizStore>, answers: string[]) {
    for (let i = 0; i < answers.length; i++) {
      store.submitAnswer(answers[i]!);
      if (i < answers.length - 1) {
        store.nextQuestion();
      }
    }
  }

  it('retryStage clears old answers and score does not accumulate', () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');

    // First attempt: answer all 4 questions (3 correct, 1 wrong)
    answerAllQuestions(store, ['a', 'b', 'c', 'b']); // q1=correct, q2=correct, q3=correct, q4=wrong
    store.completeStage();

    expect(store.stageResults['kiro-basics']?.correctCount).toBe(3);
    expect(store.stageResults['kiro-basics']?.totalCount).toBe(4);
    expect(store.correctAnswerCount).toBe(3);
    expect(store.questionsAnswered).toBe(4);

    // Retry the stage
    store.retryStage('kiro-basics');

    // Verify old data is cleared
    expect(store.userAnswersByStage['kiro-basics']).toBeUndefined();
    expect(store.stageResults['kiro-basics']).toBeUndefined();
    expect(store.completedStages).not.toContain('kiro-basics');
    expect(store.correctAnswerCount).toBe(0);
    expect(store.questionsAnswered).toBe(0);

    // Second attempt: answer all 4 questions (2 correct, 2 wrong)
    answerAllQuestions(store, ['a', 'a', 'a', 'a']); // q1=correct, q2=wrong, q3=wrong, q4=correct
    store.completeStage();

    // Verify score reflects ONLY second attempt (not accumulated)
    expect(store.stageResults['kiro-basics']?.correctCount).toBe(2);
    expect(store.stageResults['kiro-basics']?.totalCount).toBe(4);
    expect(store.correctAnswerCount).toBe(2);
    expect(store.questionsAnswered).toBe(4);
  });

  it('startStage clears old answers when called on a previously completed stage', () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');

    // First attempt: answer all 4 questions (all correct)
    answerAllQuestions(store, ['a', 'b', 'c', 'a']);
    store.completeStage();

    expect(store.stageResults['kiro-basics']?.correctCount).toBe(4);
    expect(store.correctAnswerCount).toBe(4);
    expect(store.questionsAnswered).toBe(4);

    // Start the same stage again (simulates navigating from StageSelect)
    store.startStage('kiro-basics');

    // Verify old data is cleared
    expect(store.userAnswersByStage['kiro-basics']).toBeUndefined();
    expect(store.stageResults['kiro-basics']).toBeUndefined();
    expect(store.completedStages).not.toContain('kiro-basics');
    expect(store.correctAnswerCount).toBe(0);
    expect(store.questionsAnswered).toBe(0);

    // Second attempt: answer all 4 questions (1 correct, 3 wrong)
    answerAllQuestions(store, ['a', 'a', 'a', 'b']); // q1=correct, q2=wrong, q3=wrong, q4=wrong
    store.completeStage();

    // Verify score reflects ONLY second attempt
    expect(store.stageResults['kiro-basics']?.correctCount).toBe(1);
    expect(store.stageResults['kiro-basics']?.totalCount).toBe(4);
    expect(store.correctAnswerCount).toBe(1);
    expect(store.questionsAnswered).toBe(4);
  });

  it('questionsAnswered and correctAnswerCount aggregate correctly across stages', () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');

    // Answer 4 questions (3 correct)
    answerAllQuestions(store, ['a', 'b', 'c', 'b']);
    store.completeStage();

    expect(store.questionsAnswered).toBe(4);
    expect(store.correctAnswerCount).toBe(3);

    // Retry and answer again (2 correct)
    store.retryStage('kiro-basics');
    answerAllQuestions(store, ['a', 'a', 'a', 'a']);
    store.completeStage();

    // Should show only second attempt totals
    expect(store.questionsAnswered).toBe(4);
    expect(store.correctAnswerCount).toBe(2);
  });

  it('startStage does not clear data for other stages', () => {
    const store = useQuizStore();

    // Manually set up answers for another stage to ensure isolation
    store.userAnswersByStage['specs'] = [
      { questionId: 'spec-q1', selectedOptionId: 'x', isCorrect: true, answeredAt: Date.now() },
    ];

    store.startStage('kiro-basics');

    // Other stage data should remain intact
    expect(store.userAnswersByStage['specs']).toHaveLength(1);
    expect(store.questionsAnswered).toBe(1);
    expect(store.correctAnswerCount).toBe(1);
  });

  it('startStage sets error if no questions available for the stage', () => {
    const store = useQuizStore();

    // 'specs' returns empty array from mock
    store.startStage('specs');

    expect(store.errorMessage).toContain('specs');
    // questions should remain empty since load failed
    expect(store.questions).toHaveLength(0);
  });
});
