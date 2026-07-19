import type { LearningStage } from '@/engine/types';
import type { QuestionPresentation, AnswerKey, DifficultyLevel } from '@/data/types';
import { STAGE_ORDER } from '@/engine/stages';
import { useLocale } from '@/i18n/useLocale';

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
 * Files are loaded for all locales.
 */
const questionModulesPtBR = import.meta.glob<QuestionFileData>(
  '/content/questions/pt-BR/*.json',
  { eager: true, import: 'default' }
);

const questionModulesEn = import.meta.glob<QuestionFileData>(
  '/content/questions/en/*.json',
  { eager: true, import: 'default' }
);

/**
 * Load all answer JSON files at build time using Vite's glob import (eager mode).
 * Answer data is stored separately from presentation data (Requirement 12.4).
 */
const answerModulesPtBR = import.meta.glob<AnswerFileData>(
  '/content/answers/pt-BR/*.answers.json',
  { eager: true, import: 'default' }
);

const answerModulesEn = import.meta.glob<AnswerFileData>(
  '/content/answers/en/*.answers.json',
  { eager: true, import: 'default' }
);

/**
 * Returns true when the file name (last path segment) starts with an underscore,
 * marking it as a private/fixture file that should be excluded from bundling.
 */
function isPrivateFile(path: string): boolean {
  const fileName = path.split('/').pop() ?? '';
  return fileName.startsWith('_');
}

/**
 * Build a flat list of all questions with their stage attached for a specific locale.
 */
function loadAllQuestions(modules: Record<string, QuestionFileData>): QuestionPresentation[] {
  const allQuestions: QuestionPresentation[] = [];

  for (const [path, data] of Object.entries(modules)) {
    if (isPrivateFile(path)) continue;
    if (!data || !data.questions) continue;
    for (const q of data.questions) {
      allQuestions.push({ ...q, stage: data.stage });
    }
  }

  return allQuestions;
}

/**
 * Build a map of questionId → AnswerKey from all answer files for a specific locale.
 */
function loadAllAnswers(modules: Record<string, AnswerFileData>): Map<string, AnswerKey> {
  const answerMap = new Map<string, AnswerKey>();

  for (const [path, data] of Object.entries(modules)) {
    if (isPrivateFile(path)) continue;
    if (!data || !data.answers) continue;
    for (const answer of data.answers) {
      answerMap.set(answer.questionId, answer);
    }
  }

  return answerMap;
}

// Pre-compute data structures per locale at module load time
const questionsByLocale: Record<string, QuestionPresentation[]> = {
  'pt-BR': loadAllQuestions(questionModulesPtBR),
  'en': loadAllQuestions(questionModulesEn),
};

const answersByLocale: Record<string, Map<string, AnswerKey>> = {
  'pt-BR': loadAllAnswers(answerModulesPtBR),
  'en': loadAllAnswers(answerModulesEn),
};

/**
 * Sort questions by difficulty level: iniciante → intermediário → avançado.
 */
function sortByDifficulty(questions: QuestionPresentation[]): QuestionPresentation[] {
  return [...questions].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  );
}

/**
 * Pure helper: get questions for a given locale string, falling back to pt-BR.
 * Kept pure/testable — composable call happens at the store method boundary.
 */
function getQuestionsForLocale(currentLocale: string): QuestionPresentation[] {
  return questionsByLocale[currentLocale] ?? questionsByLocale['pt-BR'] ?? [];
}

/**
 * Pure helper: get answer map for a given locale string, falling back to pt-BR.
 * Kept pure/testable — composable call happens at the store method boundary.
 */
function getAnswerMapForLocale(currentLocale: string): Map<string, AnswerKey> {
  return answersByLocale[currentLocale] ?? answersByLocale['pt-BR'] ?? new Map();
}

/**
 * QuestionStore implementation providing access to question data bundled at build time.
 *
 * - getStages(): returns all Learning Stages in defined order (Requirement 3.1)
 * - getQuestionsForStage(stage): returns questions sorted by difficulty (Requirement 3.2)
 * - getQuestionById(id): single question lookup
 * - getAnswerKey(questionId): loads from separate answer files (Requirement 12.4)
 *
 * All methods are locale-aware and return content for the active locale.
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
   * Locale-aware: returns questions for the current active locale.
   */
  getQuestionsForStage(stage: LearningStage): QuestionPresentation[] {
    const { locale } = useLocale();
    const allQuestions = getQuestionsForLocale(locale.value);
    const stageQuestions = allQuestions.filter((q) => q.stage === stage);
    return sortByDifficulty(stageQuestions);
  },

  /**
   * Returns a single question by its unique ID, or undefined if not found.
   * Locale-aware: searches in the current active locale.
   */
  getQuestionById(id: string): QuestionPresentation | undefined {
    const { locale } = useLocale();
    const allQuestions = getQuestionsForLocale(locale.value);
    return allQuestions.find((q) => q.id === id);
  },

  /**
   * Returns the answer key for a given question ID.
   * Answer data is stored separately from presentation data (Requirement 12.4).
   * Throws if no answer key is found for the given question ID.
   */
  getAnswerKey(questionId: string): AnswerKey {
    const { locale } = useLocale();
    const answerMap = getAnswerMapForLocale(locale.value);
    const answer = answerMap.get(questionId);
    if (!answer) {
      throw new Error(`Answer key not found for question: ${questionId}`);
    }
    return answer;
  },
};

export type QuestionStore = typeof questionStore;
