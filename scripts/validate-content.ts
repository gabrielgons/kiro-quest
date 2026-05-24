#!/usr/bin/env node
/**
 * Content Validator CLI Script
 *
 * Validates all question and answer JSON files for structural correctness,
 * completeness, and data integrity.
 *
 * Usage: npx tsx scripts/validate-content.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// --- Types ---

interface AnswerOption {
  id: string;
  label: string;
}

interface QuestionEntry {
  id: string;
  category?: string;
  difficulty: string;
  type: string;
  text?: string;
  options: AnswerOption[];
  explanation: string;
  sourceUrl: string;
  reviewStatus?: string;
  lastReviewedDate?: string;
  locale?: string;
}

interface QuestionFile {
  stage: string;
  locale?: string;
  questions: QuestionEntry[];
}

interface AnswerEntry {
  questionId: string;
  correctAnswerId: string | string[];
}

interface AnswerFile {
  stage: string;
  answers: AnswerEntry[];
}

interface ValidationError {
  questionId: string;
  filePath: string;
  errorType: string;
  message: string;
}

// --- Constants ---

const VALID_DIFFICULTIES = new Set(['iniciante', 'intermediário', 'avançado']);
const VALID_QUESTION_TYPES = new Set(['multiple-choice', 'true-false', 'scenario', 'ordering']);

const OPTION_COUNT_RULES: Record<string, { min: number; max: number }> = {
  'multiple-choice': { min: 3, max: 5 },
  'true-false': { min: 2, max: 2 },
  'scenario': { min: 3, max: 5 },
  'ordering': { min: 3, max: 7 },
};

// --- Validation Logic ---

function isEmptyOrWhitespace(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return true;
  return value.trim().length === 0;
}

function validateQuestionFile(
  filePath: string,
  questionFile: QuestionFile,
  answerFile: AnswerFile | undefined,
  allSeenIds: Map<string, string>,
  errors: ValidationError[]
): void {
  const answerMap = new Map<string, string | string[]>();
  if (answerFile) {
    for (const answer of answerFile.answers) {
      answerMap.set(answer.questionId, answer.correctAnswerId);
    }
  }

  for (const question of questionFile.questions) {
    const qId = question.id || '(unknown)';

    // Check missing/empty sourceUrl
    if (isEmptyOrWhitespace(question.sourceUrl)) {
      errors.push({
        questionId: qId,
        filePath,
        errorType: 'missing-source-url',
        message: `Source URL is missing or empty`,
      });
    }

    // Check missing/empty explanation
    if (isEmptyOrWhitespace(question.explanation)) {
      errors.push({
        questionId: qId,
        filePath,
        errorType: 'missing-explanation',
        message: `Explanation is missing or empty`,
      });
    }

    // Check missing locale metadata
    const locale = question.locale ?? questionFile.locale;
    if (isEmptyOrWhitespace(locale)) {
      errors.push({
        questionId: qId,
        filePath,
        errorType: 'missing-locale',
        message: `Locale metadata is missing`,
      });
    }

    // Check duplicate question IDs
    if (question.id) {
      const existingFile = allSeenIds.get(question.id);
      if (existingFile) {
        errors.push({
          questionId: qId,
          filePath,
          errorType: 'duplicate-id',
          message: `Duplicate question ID "${question.id}" (also found in ${existingFile})`,
        });
      } else {
        allSeenIds.set(question.id, filePath);
      }
    }

    // Check invalid difficulty values
    if (!VALID_DIFFICULTIES.has(question.difficulty)) {
      errors.push({
        questionId: qId,
        filePath,
        errorType: 'invalid-difficulty',
        message: `Invalid difficulty "${question.difficulty}". Must be one of: iniciante, intermediário, avançado`,
      });
    }

    // Check invalid question type values
    if (!VALID_QUESTION_TYPES.has(question.type)) {
      errors.push({
        questionId: qId,
        filePath,
        errorType: 'invalid-question-type',
        message: `Invalid question type "${question.type}". Must be one of: multiple-choice, true-false, scenario, ordering`,
      });
    }

    // Check option counts per question type
    if (VALID_QUESTION_TYPES.has(question.type)) {
      const rules = OPTION_COUNT_RULES[question.type];
      if (rules) {
        const optionCount = Array.isArray(question.options) ? question.options.length : 0;
        if (optionCount < rules.min || optionCount > rules.max) {
          const expected = rules.min === rules.max
            ? `exactly ${rules.min}`
            : `between ${rules.min} and ${rules.max}`;
          errors.push({
            questionId: qId,
            filePath,
            errorType: 'invalid-option-count',
            message: `Question type "${question.type}" requires ${expected} options, but found ${optionCount}`,
          });
        }
      }
    }

    // Check invalid correctAnswerId references
    const correctAnswer = answerMap.get(question.id);
    if (correctAnswer !== undefined) {
      const optionIds = new Set(
        Array.isArray(question.options)
          ? question.options.map((o) => o.id)
          : []
      );

      if (Array.isArray(correctAnswer)) {
        // Ordering question: each ID in correctOrder must match an option ID
        for (const answerId of correctAnswer) {
          if (!optionIds.has(answerId)) {
            errors.push({
              questionId: qId,
              filePath,
              errorType: 'invalid-answer-reference',
              message: `Correct answer ID "${answerId}" does not match any option ID`,
            });
          }
        }
      } else {
        // Single answer: correctAnswerId must match an option ID
        if (!optionIds.has(correctAnswer)) {
          errors.push({
            questionId: qId,
            filePath,
            errorType: 'invalid-answer-reference',
            message: `Correct answer ID "${correctAnswer}" does not match any option ID`,
          });
        }
      }
    }
  }
}

// --- File Discovery ---

function discoverQuestionFiles(contentDir: string): string[] {
  const questionsDir = path.join(contentDir, 'questions', 'pt-BR');
  if (!fs.existsSync(questionsDir)) {
    return [];
  }
  return fs.readdirSync(questionsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(questionsDir, f));
}

function findAnswerFile(questionFilePath: string, contentDir: string): string | undefined {
  const basename = path.basename(questionFilePath, '.json');
  const answerPath = path.join(contentDir, 'answers', 'pt-BR', `${basename}.answers.json`);
  return fs.existsSync(answerPath) ? answerPath : undefined;
}

// --- Main ---

function main(): void {
  const contentDir = path.resolve(process.cwd(), 'content');

  if (!fs.existsSync(contentDir)) {
    console.error(`Content directory not found: ${contentDir}`);
    process.exit(1);
  }

  const questionFiles = discoverQuestionFiles(contentDir);

  if (questionFiles.length === 0) {
    console.error('No question files found in content/questions/pt-BR/');
    process.exit(1);
  }

  const errors: ValidationError[] = [];
  const allSeenIds = new Map<string, string>();

  for (const qFilePath of questionFiles) {
    const relativePath = path.relative(process.cwd(), qFilePath);

    let questionFile: QuestionFile;
    try {
      const raw = fs.readFileSync(qFilePath, 'utf-8');
      questionFile = JSON.parse(raw) as QuestionFile;
    } catch (e) {
      console.error(`Failed to parse ${relativePath}: ${(e as Error).message}`);
      process.exit(1);
    }

    // Load corresponding answer file
    let answerFile: AnswerFile | undefined;
    const answerFilePath = findAnswerFile(qFilePath, contentDir);
    if (answerFilePath) {
      try {
        const raw = fs.readFileSync(answerFilePath, 'utf-8');
        answerFile = JSON.parse(raw) as AnswerFile;
      } catch (e) {
        console.error(`Failed to parse answer file ${answerFilePath}: ${(e as Error).message}`);
        process.exit(1);
      }
    }

    validateQuestionFile(relativePath, questionFile, answerFile, allSeenIds, errors);
  }

  // Report results
  if (errors.length > 0) {
    console.log(`\nContent validation found ${errors.length} error(s):\n`);
    for (const error of errors) {
      console.log(`  [${error.errorType}] ${error.filePath} — Question "${error.questionId}": ${error.message}`);
    }
    console.log('');
    process.exit(1);
  } else {
    console.log('Content validation passed. All question files are valid.');
    process.exit(0);
  }
}

main();
