# Implementation Plan: Quiz Gameplay Flow

## Overview

This plan implements the core quiz gameplay flow for Kiro Quest, refactoring existing partial implementations to match the design document's clean architecture: pure domain logic in `QuizEngine`, reactive state in `QuizStore` (Pinia), persistence in `ProgressTracker`, and presentation in Vue components. The implementation uses TypeScript with Vue 3, Pinia, Vue Router, and vitest with fast-check for property-based testing.

## Tasks

- [ ] 1. Refactor QuizEngine to pure domain logic with new interface
  - [ ] 1.1 Rewrite `src/engine/types.ts` with VerificationResult, updated AnswerResult, and QuizPhase types
    - Add `VerificationResult` interface (questionId, isCorrect, selectedAnswer, correctAnswer)
    - Add `QuizPhase` type ("answering" | "feedback" | "stage-complete")
    - Update `AnswerResult` to include selectedAnswerLabel, correctAnswerLabel, correctOrderLabels fields
    - Keep existing types (LearningStage, UserAnswer, StageResult, PerformanceLevel)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 12.3_

  - [ ] 1.2 Update `src/data/types.ts` AnswerKey to support correctOrder field
    - Change `AnswerKey.correctAnswerId` to `correctAnswerId?: string` (optional)
    - Add `correctOrder?: string[]` field for ordering questions
    - Ensure exactly one of correctAnswerId or correctOrder is present per key
    - _Requirements: 4.4_

  - [ ] 1.3 Rewrite `src/engine/quizEngine.ts` as pure functions implementing QuizEngineAPI
    - Implement `verifyAnswer(questionType, answerKey, selectedAnswer)` returning `VerificationResult`
    - Implement `calculateStageResult(stage, answers)` returning `StageResult`
    - Implement `calculatePerformanceLevel(correctCount, totalCount)` with threshold ranges
    - Implement `canShowFinalPerformance(completedStages)` returning boolean (all 11 stages)
    - Implement `calculatePercentage(correctCount, totalCount)` with truncation to 1 decimal
    - Implement `getNextStageInOrder(currentStage)` returning next stage or null
    - Implement `getRecommendedNextStage(completedStages)` returning first incomplete stage or null
    - Remove dependency on `questionStore` — QuizEngine must be pure with no imports from data layer
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.8_

  - [ ]* 1.4 Write property tests for QuizEngine (Properties 1, 3, 4, 5, 6, 7, 8)
    - Create `src/engine/__tests__/quizEngine.property.test.ts`
    - **Property 1: Answer verification correctness** — for any question type and AnswerKey, verifyAnswer returns isCorrect:true iff selection matches correct answer
    - **Property 3: Performance level classification** — for any percentage 0-100, exactly one PerformanceLevel is assigned per defined ranges
    - **Property 4: Percentage calculation precision** — for any (correctCount, totalCount) where totalCount > 0, result equals Math.trunc((correctCount/totalCount)*1000)/10
    - **Property 5: Performance level guard** — canShowFinalPerformance returns false for <11 stages, true for all 11
    - **Property 6: Recommended next stage** — getRecommendedNextStage returns first incomplete stage in order; getNextStageInOrder returns next stage or null for last
    - **Property 7: Stage status classification** — each stage is exactly one of completed/in-progress/not-started
    - **Property 8: Stage completion records result** — calculateStageResult produces correct counts from UserAnswer array
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 2.3, 2.4, 6.4, 8.2, 10.2, 10.4, 10.5**

  - [ ]* 1.5 Write unit tests for QuizEngine
    - Create `src/engine/__tests__/quizEngine.test.ts`
    - Test verifyAnswer with multiple-choice correct/incorrect
    - Test verifyAnswer with true-false correct/incorrect
    - Test verifyAnswer with ordering exact match and mismatch
    - Test calculatePercentage edge cases (0/N, N/N, boundary values)
    - Test calculatePerformanceLevel at each threshold boundary (49, 50, 74, 75, 89, 90)
    - Test getNextStageInOrder for first, middle, and last stages
    - Test getRecommendedNextStage with various completion patterns
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 12.1, 12.3, 12.7, 13.8_

- [ ] 2. Refactor ProgressTracker with new ProgressState schema
  - [ ] 2.1 Update `src/progress/types.ts` with new ProgressState schema
    - Add `quizPhase: QuizPhase` field
    - Add `userAnswersByStage: Record<string, UserAnswer[]>` field
    - Remove `questionsAnswered`, `correctAnswerCount`, `totalScore` (these become derived)
    - Update localStorage key to `kiro-quest:progress:v1`
    - _Requirements: 7.5, 11.1, 11.4_

  - [ ] 2.2 Rewrite `src/progress/progressTracker.ts` implementing ProgressTrackerAPI
    - Implement `persist(state: ProgressState): void` with try/catch for localStorage writes
    - Implement `restore(): ProgressState | null` with JSON parsing and schema validation
    - Implement `clear(): void` to remove the localStorage entry
    - Implement `isValid(data: unknown): data is ProgressState` for schema validation
    - Handle version mismatch by returning null
    - Handle invalid JSON or missing fields by returning null
    - Wrap all localStorage calls in try/catch for unavailability
    - Use storage key `kiro-quest:progress:v1`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 2.3 Write property tests for ProgressTracker (Properties 2, 14)
    - Create `src/progress/__tests__/progressTracker.property.test.ts`
    - **Property 2: Progress state round-trip** — for any valid ProgressState, persist then restore produces deeply equal object
    - **Property 14: Invalid progress data yields fresh state** — for any invalid JSON or non-conforming data, restore returns null
    - **Validates: Requirements 7.5, 7.6, 7.7, 11.1, 11.2, 11.3, 11.4, 11.6**

  - [ ]* 2.4 Write unit tests for ProgressTracker
    - Create `src/progress/__tests__/progressTracker.test.ts`
    - Test persist and restore round-trip with valid state
    - Test restore returns null for missing data
    - Test restore returns null for invalid JSON
    - Test restore returns null for schema mismatch (missing fields)
    - Test restore returns null for version mismatch
    - Test clear removes the entry
    - Test graceful handling when localStorage throws
    - _Requirements: 11.1, 11.2, 11.3, 11.6_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Rewrite QuizStore with quizPhase, userAnswersByStage, and AnswerResult enrichment
  - [ ] 4.1 Rewrite `src/stores/quizStore.ts` as Pinia store with new state shape
    - Define state: currentStage, currentQuestionIndex, quizPhase, questions, completedStages, stageResults, userAnswersByStage, lastAnswerResult, errorMessage
    - Implement computed getters: currentQuestion, questionsAnswered (derived), correctAnswerCount (derived), totalScore (derived), overallPercentage, performanceLevel, isAllComplete, recommendedNextStage, incorrectAnswers (for mistake review)
    - Implement `startStage(stage)` action: load questions from questionStore sorted by difficulty, reset index to 0, set quizPhase to "answering", handle empty questions with errorMessage
    - Implement `submitAnswer(selectedAnswer)` action: call QuizEngine.verifyAnswer, enrich VerificationResult into AnswerResult with labels from QuestionPresentation, record UserAnswer in userAnswersByStage, set quizPhase to "feedback", persist via ProgressTracker
    - Implement `nextQuestion()` action: increment index, set quizPhase to "answering", clear lastAnswerResult
    - Implement `completeStage()` action: calculate StageResult via QuizEngine, add to completedStages, set quizPhase to "stage-complete", persist
    - Implement `retryStage(stage)` action: remove from completedStages, clear userAnswersByStage for stage, remove StageResult, reset index, set quizPhase to "answering"
    - Implement `restoreProgress()` action: load from ProgressTracker, reconstruct lastAnswerResult if quizPhase is "feedback"
    - Implement `resetProgress()` action: clear ProgressTracker, reset all state
    - _Requirements: 1.4, 1.5, 1.6, 2.6, 4.1, 4.8, 5.1, 5.2, 5.3, 6.3, 6.4, 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.4, 9.2, 10.2, 12.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ]* 4.2 Write property tests for QuizStore (Properties 9, 10, 11, 12, 13)
    - Create `src/stores/__tests__/quizStore.property.test.ts`
    - **Property 9: Submit answer transitions phase** — for any valid submission, quizPhase transitions from "answering" to "feedback"
    - **Property 10: Advance question increments index** — for any index < totalQuestions-1, nextQuestion increments by 1 and sets quizPhase to "answering"
    - **Property 11: Starting a stage produces sorted questions** — for any stage with questions, startStage sets index to 0, quizPhase to "answering", questions sorted by difficulty
    - **Property 12: Retry stage clears and recalculates** — retrying clears completedStages entry, userAnswersByStage, StageResult, resets index
    - **Property 13: Mistake review contains exactly incorrect answers** — incorrectAnswers getter returns only isCorrect:false entries
    - **Validates: Requirements 4.8, 6.3, 7.3, 8.4, 9.2, 13.5**

  - [ ]* 4.3 Write unit tests for QuizStore
    - Create `src/stores/__tests__/quizStore.test.ts`
    - Test startStage loads questions and resets state
    - Test submitAnswer records UserAnswer and transitions to feedback
    - Test nextQuestion advances index
    - Test completeStage records StageResult
    - Test retryStage clears stage data
    - Test restoreProgress reconstructs lastAnswerResult when quizPhase is "feedback"
    - Test resetProgress clears all state
    - Test errorMessage set when stage has no questions
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 5. Remove progressStore and wire ProgressTracker directly into QuizStore
  - [ ] 5.1 Remove `src/stores/progressStore.ts` and update imports
    - Delete progressStore.ts since QuizStore now handles persistence directly
    - Update any remaining imports in views that referenced progressStore
    - _Requirements: 13.2_

- [ ] 6. Implement component types and shared UI components
  - [ ] 6.1 Create `src/components/types.ts` with StageStatus and MistakeItem interfaces
    - Define `StageStatus = 'completed' | 'in-progress' | 'not-started'`
    - Define `MistakeItem` interface (questionText, userAnswerLabel, correctAnswerLabel, explanation, sourceUrl)
    - _Requirements: 2.3, 9.2_

  - [ ] 6.2 Create `src/components/QuizProgressBar.vue`
    - Props: current (number), total (number), stageName (string), difficulty (DifficultyLevel)
    - Render progress indicator "{current} / {total}", stage name, difficulty badge
    - Include aria-label for accessibility
    - _Requirements: 3.5, 3.6, 14.2_

  - [ ] 6.3 Create `src/components/QuestionRenderer.vue`
    - Props: question (QuestionPresentation), disabled (boolean)
    - Emits: select(value: string | string[])
    - Delegate to MultipleChoiceOptions, TrueFalseOptions, or OrderingOptions based on question.type
    - Render question text, manage ARIA radiogroup container
    - Do NOT render correct answer data in DOM before submission
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8, 14.1, 14.4_

  - [ ] 6.4 Create `src/components/MultipleChoiceOptions.vue`
    - Props: options (AnswerOption[]), selected (string | null), disabled (boolean)
    - Emits: select(optionId: string)
    - Render radio buttons within ARIA radiogroup
    - Support keyboard navigation (Arrow keys, Tab, Enter/Space)
    - _Requirements: 3.2, 14.1, 14.4_

  - [ ] 6.5 Create `src/components/TrueFalseOptions.vue`
    - Props: options (AnswerOption[]), selected (string | null), disabled (boolean)
    - Emits: select(optionId: string)
    - Render two radio buttons for Verdadeiro/Falso
    - _Requirements: 3.3, 14.1_

  - [ ] 6.6 Create `src/components/OrderingOptions.vue`
    - Props: items (OrderingItem[]), disabled (boolean)
    - Emits: reorder(orderedIds: string[])
    - Render sortable list with drag handles and move-up/move-down buttons
    - Each move button has aria-label with item name and action
    - Fully operable via keyboard
    - _Requirements: 3.4, 14.5_

  - [ ] 6.7 Create `src/components/FeedbackDisplay.vue`
    - Props: result (AnswerResult), questionType (QuestionType)
    - Render success/error indicator ("Correto!" / "Incorreto")
    - Show correct answer label for incorrect answers ("Resposta correta: {answer}")
    - Show correct ordering as numbered list for ordering questions ("Ordem correta: {order}")
    - Display explanation and documentation link (target="_blank" rel="noopener noreferrer")
    - Use aria-live="assertive" container, receive focus on mount
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 14.3, 14.6, 14.8_

  - [ ] 6.8 Create `src/components/MistakeReview.vue`
    - Props: mistakes (MistakeItem[])
    - Render read-only list of incorrect answers with question text, user answer, correct answer, explanation, source URL
    - Documentation links use target="_blank" rel="noopener noreferrer"
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ] 6.9 Create `src/components/StageCard.vue`
    - Props: stage (LearningStage), status (StageStatus), isRecommended (boolean)
    - Emits: select(stage: LearningStage)
    - Render stage name, status indicator, recommended highlight
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Refactor views to match design architecture
  - [ ] 8.1 Rewrite `src/views/HomePage.vue` with start/continue/restart logic
    - Display "Começar Jornada" when no progress exists
    - Display "Continuar de onde parei" and "Recomeçar Jornada" when progress exists
    - "Continuar" restores progress and navigates based on quizPhase
    - "Recomeçar" shows confirmation dialog before clearing progress
    - Use useLocale() for all UI text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 8.2 Rewrite `src/views/StageSelect.vue` as StageSelectionPage using StageCard components
    - Display all 11 stages using StageCard component
    - Compute stage status (completed/in-progress/not-started) from QuizStore
    - Highlight recommended next stage
    - All stages selectable regardless of completion
    - Navigate to QuizView on selection, restoring saved position if exists
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.1, 10.3, 10.4, 10.5_

  - [ ] 8.3 Rewrite `src/views/QuizFlow.vue` as QuizView using new components
    - Use QuizProgressBar, QuestionRenderer, FeedbackDisplay components
    - Manage local selectedAnswer ref, pass to QuestionRenderer
    - Own submit button: "Confirmar Resposta" / "Confirmar ordem"
    - Disable submit when no selection (except ordering which is always enabled)
    - On submit: call QuizStore.submitAnswer(), disable controls
    - Show "Próxima Pergunta" or "Finalizar Estágio" based on position
    - Handle quizPhase transitions and focus management
    - Prevent duplicate submissions via browser history
    - Display error message with "Voltar aos Estágios" link on load failure
    - Update aria-live region on question advance
    - Move focus to FeedbackDisplay on submission
    - _Requirements: 3.1, 3.5, 3.6, 3.7, 4.5, 4.6, 4.7, 4.8, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.3, 14.2, 14.3, 14.6_

  - [ ] 8.4 Rewrite `src/views/StageSummary.vue` as StageResultsPage with mistake review
    - Display score "{correctCount} de {totalCount}"
    - Show "Próximo Estágio" button when more stages available
    - Show "Tentar Novamente" button calling QuizStore.retryStage()
    - Show "Voltar aos Estágios" and "Voltar ao início" buttons
    - Show overall percentage and PerformanceLevel when all 11 stages complete
    - Include "Revisar erros" button toggling MistakeReview component
    - Show congratulatory message if all answers correct
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3_

  - [ ] 8.5 Rewrite `src/views/FinalAchievement.vue` as FinalAchievementPage
    - Display overall correct answer percentage and PerformanceLevel
    - Guard: redirect to /stages if isAllComplete is false
    - Navigation to /stages or /
    - _Requirements: 8.3, 12.1, 12.2, 12.7_

- [ ] 9. Implement router navigation guards
  - [ ] 9.1 Update `src/router/index.ts` with route guards and validation
    - Add beforeEach guard validating `:stage` params against LearningStage union
    - Invalid stage params redirect to `/stages`
    - Add `/achievement` route guard: redirect to `/stages` if isAllComplete is false
    - Add `/summary/:stage` guard: redirect if stage not completed and quizPhase not "stage-complete"
    - Add catch-all route `/:pathMatch(.*)*` redirecting to `/stages`
    - Support browser history navigation without breaking state
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ]* 9.2 Write property test for route guards (Property 15)
    - Create `src/router/__tests__/routeGuards.property.test.ts`
    - **Property 15: Invalid route stage parameter redirects** — for any string not in the 11 valid LearningStage identifiers, navigation to /quiz/:stage or /summary/:stage redirects to /stages
    - **Validates: Requirements 17.3**

- [ ] 10. Ensure i18n keys are sourced from locale files
  - [ ] 10.1 Update `content/i18n/pt-BR/ui.json` with all required UI text keys
    - Add keys for HomePage buttons: "home.start" ("Começar Jornada"), "home.resume" ("Continuar de onde parei"), "home.restart" ("Recomeçar Jornada")
    - Add keys for quiz actions: "quiz.confirm" ("Confirmar Resposta"), "quiz.confirmOrder" ("Confirmar ordem"), "quiz.next" ("Próxima Pergunta"), "quiz.finish" ("Finalizar Estágio")
    - Add keys for feedback: "feedback.correct" ("Correto!"), "feedback.incorrect" ("Incorreto"), "feedback.correctAnswer" ("Resposta correta: {answer}"), "feedback.correctOrder" ("Ordem correta:")
    - Add keys for stage results: "summary.score" ("{correctCount} de {totalCount}"), "summary.nextStage" ("Próximo Estágio"), "summary.retry" ("Tentar Novamente"), "summary.backToStages" ("Voltar aos Estágios"), "summary.backToHome" ("Voltar ao início"), "summary.reviewErrors" ("Revisar erros")
    - Add keys for restart confirmation dialog
    - Add keys for error messages and notifications
    - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration wiring and final verification
  - [ ] 12.1 Wire QuizStore initialization in `src/main.ts` or App.vue
    - Call restoreProgress() on app mount to load saved state
    - Handle notification display for recovery errors
    - _Requirements: 1.4, 11.2, 11.3_

  - [ ]* 12.2 Write integration tests for full quiz flow
    - Create `src/__tests__/quizFlow.integration.test.ts`
    - Test: start quiz → answer questions → complete stage → view results
    - Test: progress persistence across simulated reload
    - Test: stage retry clears state and allows re-answering
    - Test: navigation guards redirect invalid routes
    - _Requirements: 1.4, 7.6, 7.7, 8.4, 17.3_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `src/engine/scoring.ts`, `src/engine/randomizer.ts`, and `src/engine/formatters.ts` can be kept as utility modules but their logic should be consolidated into the new QuizEngine API where appropriate
- The existing `src/stores/progressStore.ts` is removed in favor of direct ProgressTracker integration within QuizStore
- Views are rewritten in-place (same file paths) to maintain router configuration compatibility

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "6.1"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "10.1"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2", "12.1"] },
    { "id": 9, "tasks": ["12.2"] }
  ]
}
```
