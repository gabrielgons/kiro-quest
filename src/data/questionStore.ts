import type { LearningStage } from '@/engine/types';
import type { QuestionPresentation, AnswerKey, DifficultyLevel } from '@/data/types';
import { STAGE_ORDER } from '@/engine/stages';

/**
 * Difficulty ordering for sorting questions within a stage.
 * Requirement 3.2: iniciante → intermediário → avançado
 */
const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  'iniciante': 0,
  'intermediário': 1,
  'avançado': 2,
};

/**
 * Raw shape of a question JSON file as stored on disk.
 */
interface QuestionFileData {
  stage: LearningStage;
  locale: string;
  questions: Array<Omit<QuestionPresentation, 'stage'>>;
}

/**
 * Raw shape of an answer JSON file as stored on disk.
 */
interface AnswerFileData {
  stage: LearningStage;
  answers: AnswerKey[];
}

/**
 * Load all question JSON files at build time using Vite's glob import (eager mode).
 * Files are expected at content/questions/pt-BR/{stage}.json.
 * Adding new question files requires no application logic changes (Requirement 1.5).
 */
const questionModules = import.meta.glob<QuestionFileData>(
  '/content/questions/pt-BR/*.json',
  { eager: true, import: 'default' }
);

/**
 * Load all answer JSON files at build time using Vite's glob import (eager mode).
 * Files are expected at content/answers/pt-BR/{stage}.answers.json.
 * Answer data is stored separately from presentation data (Requirement 12.4).
 */
const answerModules = import.meta.glob<AnswerFileData>(
  '/content/answers/pt-BR/*.answers.json',
  { eager: true, import: 'default' }
);

/**
 * Build a flat list of all questions with their stage attached.
 */
function loadAllQuestions(): QuestionPresentation[] {
  const allQuestions: QuestionPresentation[] = [];

  for (const [path, data] of Object.entries(questionModules)) {
    // Skip underscore-prefixed files (e.g. _test-invalid.json). The `_` prefix
    // is a convention for private/fixture files that must not be bundled into
    // production content.
    if (isPrivateFile(path)) continue;
    if (!data || !data.questions) continue;
    for (const q of data.questions) {
      allQuestions.push({ ...q, stage: data.stage });
    }
  }

  return allQuestions;
}

/**
 * Returns true when the file name (last path segment) starts with an underscore,
 * marking it as a private/fixture file that should be excluded from bundling.
 */
function isPrivateFile(path: string): boolean {
  const fileName = path.split('/').pop() ?? '';
  return fileName.startsWith('_');
}

/**
 * Build a map of questionId → AnswerKey from all answer files.
 */
function loadAllAnswers(): Map<string, AnswerKey> {
  const answerMap = new Map<string, AnswerKey>();

  for (const [path, data] of Object.entries(answerModules)) {
    if (isPrivateFile(path)) continue;
    if (!data || !data.answers) continue;
    for (const answer of data.answers) {
      answerMap.set(answer.questionId, answer);
    }
  }

  return answerMap;
}

// Pre-compute data structures at module load time (build-time bundled data)
const allQuestions = loadAllQuestions();
const answerMap = loadAllAnswers();

/**
 * Sort questions by difficulty level: iniciante → intermediário → avançado.
 */
function sortByDifficulty(questions: QuestionPresentation[]): QuestionPresentation[] {
  return [...questions].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  );
}

/**
 * QuestionStore implementation providing access to question data bundled at build time.
 *
 * - getStages(): returns all Learning Stages in defined order (Requirement 3.1)
 * - getQuestionsForStage(stage): returns questions sorted by difficulty (Requirement 3.2)
 * - getQuestionById(id): single question lookup
 * - getAnswerKey(questionId): loads from separate answer files (Requirement 12.4)
 */
export const questionStore = {
  /**
   * Returns all Learning Stages in the defined progression order.
   * Requirement 3.1: Kiro Basics → ... → Enterprise Scenarios
   */
  getStages(): LearningStage[] {
    return STAGE_ORDER;
  },

  /**
   * Returns all questions for a given stage, sorted by difficulty.
   * Requirement 3.2: iniciante → intermediário → avançado
   */
  getQuestionsForStage(stage: LearningStage): QuestionPresentation[] {
    const stageQuestions = allQuestions.filter((q) => q.stage === stage);
    return sortByDifficulty(stageQuestions);
  },

  /**
   * Returns a single question by its unique ID, or undefined if not found.
   */
  getQuestionById(id: string): QuestionPresentation | undefined {
    return allQuestions.find((q) => q.id === id);
  },

  /**
   * Returns the answer key for a given question ID.
   * Answer data is stored separately from presentation data (Requirement 12.4).
   * Throws if no answer key is found for the given question ID.
   */
  getAnswerKey(questionId: string): AnswerKey {
    const answer = answerMap.get(questionId);
    if (!answer) {
      throw new Error(`Answer key not found for question: ${questionId}`);
    }
    return answer;
  },
};

export type QuestionStore = typeof questionStore;
