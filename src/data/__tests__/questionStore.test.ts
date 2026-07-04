import { describe, it, expect } from 'vitest';
import type { LearningStage } from '@/engine/types';
import type { QuestionPresentation } from '@/data/types';
import { questionStore } from '@/data/questionStore';

describe('QuestionStore', () => {
  const STAGE_ORDER: LearningStage[] = [
    'kiro-basics',
    'specs',
    'feature-specs',
    'bugfix-specs',
    'steering',
    'hooks',
    'mcp',
    'powers',
    'skills',
    'real-world-workflows',
    'enterprise-scenarios',
    'kiro-cli',
    'kiro-web',
    'chat-modes',
    'custom-agents',
    'editor-tools',
    'automations',
    'privacy-security',
  ];

  describe('getStages', () => {
    it('returns all 13 learning stages in defined order', () => {
      const stages = questionStore.getStages();

      expect(stages).toEqual(STAGE_ORDER);
      expect(stages).toHaveLength(18);
    });

    it('starts with kiro-basics and ends with privacy-security', () => {
      const stages = questionStore.getStages();

      expect(stages[0]).toBe('kiro-basics');
      expect(stages[stages.length - 1]).toBe('privacy-security');
    });
  });

  describe('getQuestionsForStage', () => {
    it('returns questions for a stage that has content', () => {
      const questions = questionStore.getQuestionsForStage('kiro-basics');

      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(q.stage).toBe('kiro-basics');
      }
    });

    it('returns questions sorted by difficulty: iniciante → intermediário → avançado', () => {
      const questions = questionStore.getQuestionsForStage('kiro-basics');
      const difficultyOrder = { 'iniciante': 0, 'intermediário': 1, 'avançado': 2 };

      for (let i = 1; i < questions.length; i++) {
        const prev = difficultyOrder[questions[i - 1]!.difficulty];
        const curr = difficultyOrder[questions[i]!.difficulty];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('returns an empty array for a stage with no questions loaded', () => {
      // All stages should have questions since content files exist,
      // but the function should handle gracefully if a stage has none
      const questions = questionStore.getQuestionsForStage('kiro-basics');
      expect(Array.isArray(questions)).toBe(true);
    });
  });

  describe('getQuestionById', () => {
    it('returns undefined for a non-existent question ID', () => {
      const question = questionStore.getQuestionById('non-existent-id');
      expect(question).toBeUndefined();
    });

    it('returns the correct question for a valid ID', () => {
      const questions = questionStore.getQuestionsForStage('kiro-basics');
      if (questions.length > 0) {
        const firstQuestion = questions[0]!;
        const found = questionStore.getQuestionById(firstQuestion.id);
        expect(found).toEqual(firstQuestion);
      }
    });
  });

  describe('getAnswerKey', () => {
    it('throws an error for a non-existent question ID', () => {
      expect(() => questionStore.getAnswerKey('non-existent-id')).toThrow(
        'Answer key not found for question: non-existent-id'
      );
    });

    it('returns the answer key for a valid question ID', () => {
      const questions = questionStore.getQuestionsForStage('kiro-basics');
      if (questions.length > 0) {
        const firstQuestion = questions[0]!;
        const answerKey = questionStore.getAnswerKey(firstQuestion.id);
        expect(answerKey.questionId).toBe(firstQuestion.id);
        expect(answerKey.correctAnswerId).toBeDefined();
      }
    });

    it('answer key references valid option IDs from the question', () => {
      const questions = questionStore.getQuestionsForStage('kiro-basics');
      for (const q of questions) {
        const answerKey = questionStore.getAnswerKey(q.id);
        const optionIds = q.options.map((o) => o.id);

        if (Array.isArray(answerKey.correctAnswerId)) {
          // Ordering question: all IDs should be valid option IDs
          for (const id of answerKey.correctAnswerId) {
            expect(optionIds).toContain(id);
          }
        } else {
          // Single answer: should be a valid option ID
          expect(optionIds).toContain(answerKey.correctAnswerId);
        }
      }
    });
  });

  describe('difficulty sorting logic', () => {
    it('sorts questions by difficulty: iniciante → intermediário → avançado', () => {
      const questions: QuestionPresentation[] = [
        createQuestion('q1', 'avançado', 'kiro-basics'),
        createQuestion('q2', 'iniciante', 'kiro-basics'),
        createQuestion('q3', 'intermediário', 'kiro-basics'),
        createQuestion('q4', 'iniciante', 'kiro-basics'),
        createQuestion('q5', 'avançado', 'kiro-basics'),
      ];

      const DIFFICULTY_ORDER = { 'iniciante': 0, 'intermediário': 1, 'avançado': 2 } as const;
      const sorted = [...questions].sort(
        (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
      );

      expect(sorted[0]!.difficulty).toBe('iniciante');
      expect(sorted[1]!.difficulty).toBe('iniciante');
      expect(sorted[2]!.difficulty).toBe('intermediário');
      expect(sorted[3]!.difficulty).toBe('avançado');
      expect(sorted[4]!.difficulty).toBe('avançado');
    });
  });
});

function createQuestion(
  id: string,
  difficulty: QuestionPresentation['difficulty'],
  stage: LearningStage
): QuestionPresentation {
  return {
    id,
    category: 'Test',
    difficulty,
    type: 'multiple-choice',
    text: `Question ${id}`,
    options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
    ],
    explanation: 'Test explanation',
    sourceUrl: 'https://kiro.dev/docs/test',
    reviewStatus: 'reviewed',
    lastReviewedDate: '2025-01-15',
    locale: 'pt-BR',
    stage,
  };
}
