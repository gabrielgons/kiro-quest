# Requirements Document

## Introduction

This feature implements the core quiz gameplay flow for Kiro Quest, a Vue 3 + TypeScript + Pinia application that teaches users about Kiro IDE features through progressive learning stages. The gameplay flow covers navigation from the home page into the quiz, stage selection, question presentation for all supported types (multiple-choice, true-false, scenario, ordering), answer verification with immediate feedback, stage progression, progress persistence, results/summary screens, and mistake review. The application is localized in Portuguese (pt-BR) for the MVP, with architecture prepared for future internationalization.

## Glossary

- **QuizEngine**: Pure domain logic module responsible for answer verification, score calculation, and stage progression rules. Testable without Vue component rendering.
- **QuizStore**: The Pinia store that manages reactive application state, orchestrates calls to QuizEngine, ProgressTracker, Router, and UI feedback.
- **Question_Renderer**: The Vue component responsible for displaying a question and its answer options based on question type.
- **Feedback_Display**: The Vue component that shows whether an answer is correct or incorrect along with the explanation.
- **Stage_Results_Screen**: The Vue component that displays the summary of a completed stage including score, navigation actions, and mistake review.
- **StageSelection_Screen**: The Vue component that displays all Learning Stages with visual indicators for completion status and recommended order.
- **ProgressTracker**: The module responsible for persisting and restoring user progress using localStorage.
- **Router**: The Vue Router instance that manages navigation between views.
- **HomePage**: The landing view with start, continue, or restart actions.
- **QuizView**: The main view that orchestrates question display, answer submission, and feedback.
- **LearningStage**: One of the 11 ordered topic areas (kiro-basics through enterprise-scenarios).
- **PerformanceLevel**: A classification label assigned based on overall correct answer percentage.
- **UserAnswer**: A record of the user's selected option(s) for a specific question along with correctness.
- **AnswerKey**: The correct answer data for a question, stored separately from question presentation. For ordering questions, uses a `correctOrder` array instead of `correctAnswerId`.
- **QuizPhase**: The current state of the quiz flow for a given question: "answering", "feedback", or "stage-complete".

## Requirements

### Requirement 1: Home Page Start, Continue, and Restart Behavior

**User Story:** As a user, I want clear actions on the home page to start, continue, or restart my learning journey, so that I always know how to proceed.

#### Acceptance Criteria

1. IF no ProgressState exists in localStorage, THEN THE HomePage SHALL display a single primary action button labeled "Começar Jornada" that navigates to the StageSelection_Screen.
2. IF a valid ProgressState exists in localStorage with at least one answered question or one completed stage, THEN THE HomePage SHALL display a primary action button labeled "Continuar de onde parei" and a secondary action button labeled "Recomeçar Jornada".
3. WHEN the user clicks "Começar Jornada", THE Router SHALL navigate to the StageSelection_Screen.
4. WHEN the user clicks "Continuar de onde parei", THE QuizStore SHALL restore the saved ProgressState including currentStage, currentQuestionIndex, answers, score, and quizPhase. Navigation SHALL depend on the restored quizPhase:
   - IF quizPhase is "answering", THE Router SHALL navigate to the QuizView at the restored currentStage and currentQuestionIndex.
   - IF quizPhase is "feedback", THE Router SHALL navigate to the QuizView at the restored currentStage and currentQuestionIndex with the Feedback_Display visible showing the previously submitted answer's result, explanation, and documentation link.
   - IF quizPhase is "stage-complete", THE Router SHALL navigate to the Stage_Results_Screen for the restored currentStage.
5. WHEN the user clicks "Recomeçar Jornada", THE application SHALL display a confirmation dialog asking the user to confirm progress reset before taking any action.
6. IF the user confirms the restart, THEN THE ProgressTracker SHALL clear all saved progress from localStorage, THE QuizStore SHALL reset to initial state, and THE Router SHALL navigate to the StageSelection_Screen.
7. IF the user cancels the restart confirmation, THEN THE application SHALL remain on the HomePage with no changes to progress.
8. THE HomePage SHALL be visible and navigable without scrolling on viewports of 360px width or larger.

### Requirement 2: Stage Selection

**User Story:** As a user, I want to see all available learning stages and choose which one to study, so that I can follow my own learning pace while being guided toward a recommended order.

#### Acceptance Criteria

1. THE StageSelection_Screen SHALL display all 11 Learning Stages in the defined order: kiro-basics, specs, feature-specs, bugfix-specs, steering, hooks, mcp, powers, skills, real-world-workflows, enterprise-scenarios.
2. ALL Learning Stages SHALL be selectable regardless of completion status. The MVP SHALL NOT hard-block access to any stage.
3. THE StageSelection_Screen SHALL visually indicate each stage's status using distinct visual treatments for: completed, in-progress, not-started, and recommended-next.
4. THE StageSelection_Screen SHALL visually highlight the recommended next stage (the first not-completed stage in the defined order) to encourage sequential learning.
5. THE StageSelection_Screen MAY display a message encouraging the user to follow the recommended order, but this message SHALL NOT prevent the user from selecting any stage.
6. WHEN the user selects a stage, THE Router SHALL navigate to the QuizView for that stage starting at question index 0, unless saved progress exists for that stage, in which case it SHALL restore the saved position within that stage.

### Requirement 3: Question Presentation

**User Story:** As a user, I want to see questions displayed clearly with their answer options, so that I can understand and respond to each question.

#### Acceptance Criteria

1. THE QuizView SHALL display one question at a time with its text and available answer options, with no answer option pre-selected.
2. WHEN the question type is "multiple-choice" or "scenario", THE Question_Renderer SHALL display radio buttons for each AnswerOption (between 3 and 5 options).
3. WHEN the question type is "true-false", THE Question_Renderer SHALL display exactly 2 radio buttons labeled "Verdadeiro" and "Falso".
4. WHEN the question type is "ordering", THE Question_Renderer SHALL display a sortable list of OrderingItems (between 3 and 7 items) that the user can reorder using drag-and-drop handles and move up/move down buttons.
5. THE QuizView SHALL display a progress indicator showing the current question number and total questions in the stage in the format "{current} / {total}".
6. THE QuizView SHALL display the stage name and difficulty level for the current question.
7. IF question data fails to load for the current stage, THEN THE QuizView SHALL display an error message indicating the load failure.
8. THE Question_Renderer SHALL NOT render correct answer identifiers, correct answer labels, or answer key metadata in the DOM before the user submits an answer for that question.

### Requirement 4: Answer Submission and Verification

**User Story:** As a user, I want to submit my answer and receive immediate feedback, so that I can learn from correct and incorrect responses.

#### Acceptance Criteria

1. WHEN the user selects an option and clicks "Confirmar Resposta" (or "Confirmar ordem" for ordering questions), THE QuizEngine SHALL compare the selected answer against the AnswerKey for that question and record a UserAnswer with the questionId, selectedOptionId, isCorrect flag, and current timestamp.
2. WHEN the submitted answer matches the AnswerKey correctAnswerId, THE QuizEngine SHALL mark the UserAnswer as correct.
3. WHEN the submitted answer does not match the AnswerKey correctAnswerId, THE QuizEngine SHALL mark the UserAnswer as incorrect.
4. WHEN the question type is "ordering", THE QuizEngine SHALL compare the user's ordered list against the AnswerKey correctOrder array using exact sequence matching, where all item positions must match in the same order.
5. FOR "multiple-choice", "true-false", or "scenario" question types, WHILE no option is selected, THE QuizView SHALL disable the submit button.
6. FOR "ordering" question types, THE submit button SHALL be enabled as soon as the question is displayed. The user MAY submit the currently displayed order without reordering any items if they believe it is correct.
7. WHEN an answer is submitted, THE QuizView SHALL disable all option selection controls and reordering controls for that question, preventing any further changes.
8. WHEN an answer is submitted, THE QuizStore SHALL transition the quizPhase from "answering" to "feedback".
9. IF the AnswerKey for the current question cannot be found, THEN THE QuizEngine SHALL treat the submission as failed, not record a UserAnswer, and display an error message indicating the question cannot be verified.

### Requirement 5: Answer Feedback Display

**User Story:** As a user, I want to see whether my answer was correct along with an educational explanation, so that I can reinforce my learning.

#### Acceptance Criteria

1. WHEN the answer is correct, THE Feedback_Display SHALL show a visually distinct success indicator with the text "Correto!" and an accessible label indicating a correct answer.
2. WHEN the answer is incorrect, THE Feedback_Display SHALL show a visually distinct error indicator with the text "Incorreto" and display the correct answer label using the format "Resposta correta: {answer}" where {answer} is the label text of the correct option.
3. WHEN an answer has been submitted, THE Feedback_Display SHALL display a concise educational explanation retrieved from the question's explanation field within 200 milliseconds of submission.
4. IF the question's source documentation URL is present, THEN THE Feedback_Display SHALL display a navigable link labeled with the documentation reference that opens in a new browser tab with rel="noopener noreferrer".
5. WHEN the question type is "ordering" and the answer is incorrect, THE Feedback_Display SHALL display the correct ordering sequence as a numbered list of item labels in their correct positions using the format "Ordem correta: {order}".
6. WHEN an answer has been submitted, THE Feedback_Display SHALL remain visible until the user explicitly navigates to the next question or finishes the stage.
7. THE Feedback_Display SHALL prioritize learning and encouragement over scoring. The tone of explanations should be educational rather than punitive.

### Requirement 6: Question Navigation Within a Stage

**User Story:** As a user, I want to advance to the next question after reviewing feedback, so that I can progress through the stage.

#### Acceptance Criteria

1. WHEN the quizPhase is "feedback" and the currentQuestionIndex is less than the total number of questions minus one in the stage, THE QuizView SHALL show a "Próxima Pergunta" button.
2. WHEN the quizPhase is "feedback" and the currentQuestionIndex equals the total number of questions minus one in the stage, THE QuizView SHALL show a "Finalizar Estágio" button.
3. WHEN the user clicks "Próxima Pergunta", THE QuizStore SHALL advance currentQuestionIndex by one, transition quizPhase to "answering", hide the Feedback_Display, clear the previously selected option, disable the submit button, and display the next question.
4. WHEN the user clicks "Finalizar Estágio", THE QuizStore SHALL record the StageResult with correctCount, totalCount, and completedAt timestamp, transition quizPhase to "stage-complete", and THE Router SHALL navigate to the Stage_Results_Screen.
5. WHILE the quizPhase is "answering", THE QuizView SHALL hide both the "Próxima Pergunta" and "Finalizar Estágio" buttons.

### Requirement 7: Quiz Phase State

**User Story:** As a user, I want the quiz to remember exactly where I was in the flow, so that reloading the page does not lose my feedback or stage completion state.

#### Acceptance Criteria

1. THE QuizStore SHALL maintain an explicit quizPhase state with one of the following values: "answering", "feedback", or "stage-complete".
2. BEFORE the user submits an answer, THE quizPhase SHALL be "answering".
3. AFTER the user submits an answer and before navigating to the next question, THE quizPhase SHALL be "feedback".
4. AFTER the final question of a stage is completed and the user clicks "Finalizar Estágio", THE quizPhase SHALL be "stage-complete".
5. THE ProgressTracker SHALL persist the quizPhase as part of the ProgressState on every state change.
6. IF the user reloads the page while the quizPhase is "feedback", THEN THE application SHALL restore the feedback state including the submitted answer, correctness, explanation, and documentation link, without allowing the same answer to be submitted again.
7. IF the user reloads the page while the quizPhase is "stage-complete", THEN THE application SHALL restore the Stage_Results_Screen with the completed stage's results.

### Requirement 8: Stage Results Summary

**User Story:** As a user, I want to see my results after completing a stage, so that I can understand my performance and decide what to do next.

#### Acceptance Criteria

1. THE Stage_Results_Screen SHALL display the number of correct answers out of total questions for the completed stage in the format "{correctCount} de {totalCount}".
2. WHEN the user has completed the stage and more stages are available in the defined stage order, THE Stage_Results_Screen SHALL display a "Próximo Estágio" button that navigates to the QuizView for the next stage.
3. WHEN the user has completed all 11 stages, THE Stage_Results_Screen SHALL display the overall correct answer percentage and the assigned PerformanceLevel.
4. THE Stage_Results_Screen SHALL display a "Tentar Novamente" button that restarts the current stage. WHEN the user clicks "Tentar Novamente", THE QuizStore SHALL: remove the current stage from completedStages, clear all UserAnswer entries for that stage in userAnswersByStage, remove the corresponding StageResult from stageResults, recalculate the overall score based on remaining answers, set currentQuestionIndex to 0, set quizPhase to "answering", and THE Router SHALL navigate to the QuizView for that stage.
5. THE Stage_Results_Screen SHALL display a "Voltar aos Estágios" button that navigates to the StageSelection_Screen (not the HomePage).
6. THE Stage_Results_Screen SHALL display a "Voltar ao início" button that navigates to the HomePage.
7. WHEN the user clicks "Próximo Estágio", THE QuizStore SHALL start the next stage in the defined order and THE Router SHALL navigate to the QuizView.

### Requirement 9: Review Incorrect Answers

**User Story:** As a user, I want to review my mistakes after completing a stage, so that I can learn from my errors and improve my understanding.

#### Acceptance Criteria

1. THE Stage_Results_Screen SHALL display a "Revisar erros" button if the user answered at least one question incorrectly in the completed stage.
2. WHEN the user clicks "Revisar erros", THE application SHALL display a review list showing each incorrectly answered question with: the original question text, the user's selected answer, the correct answer, the educational explanation, and the official Kiro documentation source URL (if available).
3. IF the user answered all questions correctly in the completed stage, THEN THE Stage_Results_Screen SHALL display a positive congratulatory message instead of the "Revisar erros" button.
4. THE review feature SHALL be read-only and informational. The user SHALL NOT be able to change their answers during review.
5. THE review feature is intended for learning reinforcement and SHALL NOT be treated as a competitive anti-cheat mechanism.

### Requirement 10: Stage Progression (Non-Blocking)

**User Story:** As a user, I want to follow a recommended learning path while retaining the freedom to explore any stage, so that I can learn at my own pace.

#### Acceptance Criteria

1. THE QuizStore SHALL maintain the stage order as defined: kiro-basics, specs, feature-specs, bugfix-specs, steering, hooks, mcp, powers, skills, real-world-workflows, enterprise-scenarios.
2. WHEN a user answers all questions in a stage, THE QuizStore SHALL mark that stage as completed in the ProgressState.
3. THE StageSelection_Screen SHALL NOT prevent the user from accessing any stage regardless of completion status.
4. THE StageSelection_Screen SHALL visually distinguish between completed stages, in-progress stages, and not-started stages.
5. THE StageSelection_Screen SHALL visually recommend the next stage in the defined order (the first not-completed stage) to guide the user.
6. WHEN a user completes the final stage (enterprise-scenarios), THE QuizStore SHALL retain all stages in the completed state without attempting further progression.
7. Hard-locking of stages MAY be considered in a future campaign/challenge mode but SHALL NOT be implemented in the MVP.

### Requirement 11: Progress Persistence

**User Story:** As a user, I want my progress to be saved automatically, so that I can resume the quiz later without losing my place.

#### Acceptance Criteria

1. WHEN a user submits an answer or the quizPhase changes, THE ProgressTracker SHALL persist the updated ProgressState to localStorage before displaying the next interaction.
2. WHEN the application loads, THE ProgressTracker SHALL restore the ProgressState from localStorage if a stored entry exists and passes validation.
3. IF localStorage is unavailable, OR IF the stored data fails JSON parsing, OR IF the parsed data does not conform to the ProgressState schema (missing required fields or invalid field types), THEN THE ProgressTracker SHALL start a fresh quiz state and display a notification to the user for at least 5 seconds indicating that progress could not be restored.
4. THE ProgressTracker SHALL store all ProgressState fields: version, currentStage, currentQuestionIndex, quizPhase, questionsAnswered, correctAnswerCount, totalScore, completedStages, stageResults, userAnswersByStage (a record mapping each LearningStage to its array of UserAnswer objects), and lastUpdated (as a Unix timestamp in milliseconds). The userAnswersByStage structure SHALL support reviewing mistakes and recalculating scores across all stages.
5. WHEN a stage is completed, THE ProgressTracker SHALL update the completedStages array and stageResults record in the persisted ProgressState.
6. IF the stored ProgressState version does not match the current application ProgressState version, THEN THE ProgressTracker SHALL discard the stored state, start a fresh quiz state, and display a notification to the user indicating that progress was reset due to an update.

### Requirement 12: Performance Level Calculation

**User Story:** As a user, I want to receive a performance level classification after completing all stages, so that I can understand my overall mastery of Kiro concepts.

#### Acceptance Criteria

1. WHEN all 11 stages are completed, THE QuizEngine SHALL calculate the overall percentage as the number of correct answers divided by the total number of questions answered across all stages, truncated to one decimal place.
2. WHEN the overall percentage is calculated, THE application SHALL display the assigned PerformanceLevel to the user along with the calculated percentage.
3. WHEN the correct answer percentage is between 0% and 49% inclusive, THE QuizEngine SHALL assign the PerformanceLevel "Iniciante em Kiro".
4. WHEN the correct answer percentage is between 50% and 74% inclusive, THE QuizEngine SHALL assign the PerformanceLevel "Praticante de Kiro".
5. WHEN the correct answer percentage is between 75% and 89% inclusive, THE QuizEngine SHALL assign the PerformanceLevel "Especialista em Kiro".
6. WHEN the correct answer percentage is 90% or above, THE QuizEngine SHALL assign the PerformanceLevel "Mestre em Kiro".
7. IF fewer than 11 stages have been completed, THEN THE QuizEngine SHALL NOT calculate or display a final PerformanceLevel.

### Requirement 13: Domain Logic and State Management Separation

**User Story:** As a developer, I want clear separation between pure domain logic and reactive state management, so that the codebase is testable, maintainable, and follows clean architecture principles.

#### Acceptance Criteria

1. THE QuizEngine SHALL be implemented as a pure domain logic module containing answer verification, score calculation, performance level assignment, and stage progression rules. It SHALL NOT depend on Vue, Pinia, or any UI framework.
2. THE QuizStore SHALL be implemented as a Pinia store that manages reactive application state and orchestrates calls to QuizEngine, ProgressTracker, Router, and UI feedback.
3. THE QuizStore SHALL expose actions to start a stage, submit an answer, advance to the next question, complete a stage, and restore progress.
4. THE QuizStore SHALL expose getters for the current question, current stage progress, quizPhase, and whether the current stage is complete.
5. WHEN a stage is started, THE QuizStore SHALL reset currentQuestionIndex to 0, load questions for that stage from the questionStore sorted by difficulty (iniciante → intermediário → avançado), set currentStage to the given stage, and set quizPhase to "answering".
6. WHEN an answer is submitted, THE QuizStore SHALL call QuizEngine to verify the answer, record a UserAnswer with the questionId, selectedOptionId, isCorrect flag, and answeredAt timestamp, and transition quizPhase to "feedback".
7. IF a stage is started and the questionStore returns no questions for that stage, THEN THE QuizStore SHALL remain in its current state without modifying currentStage or currentQuestionIndex.
8. THE QuizEngine SHALL be testable in isolation using unit tests without requiring Vue component rendering or Pinia store instantiation.

### Requirement 14: Accessibility

**User Story:** As a user with assistive technology, I want the quiz interface to be accessible, so that I can participate in the learning experience.

#### Acceptance Criteria

1. WHEN the question type is "multiple-choice", "true-false", or "scenario", THE Question_Renderer SHALL render the options within a container with ARIA role "radiogroup" and an accessible label matching the question text, where each option is an input with role "radio".
2. WHEN the user advances to a new question, THE QuizView SHALL update the aria-live region with the text indicating the current question number and total questions in the stage.
3. WHEN an answer is submitted, THE Feedback_Display SHALL announce the result (correct or incorrect) to screen readers using an aria-live assertive region.
4. THE Question_Renderer SHALL support keyboard navigation such that Tab moves focus between interactive elements, Arrow keys cycle through radio options within a group, and Enter or Space activates the focused control.
5. WHEN the question type is "ordering", THE Question_Renderer SHALL provide a move-up and move-down button for each item, each with an aria-label indicating the action and the item label. Ordering questions SHALL be fully operable via keyboard.
6. WHEN an answer is submitted, THE QuizView SHALL move focus to the Feedback_Display container so that screen readers announce the feedback immediately.
7. ALL interactive elements SHALL have visible focus indicators that meet WCAG 2.1 AA contrast requirements.
8. THE Feedback_Display SHALL use aria-live="assertive" or equivalent to ensure assistive technologies announce feedback content upon answer submission.

### Requirement 15: Internationalization Strategy

**User Story:** As a developer, I want the application to be structured for future localization, so that adding new languages requires minimal code changes.

#### Acceptance Criteria

1. THE MVP SHALL use pt-BR as the only required locale.
2. ALL user-facing UI text (button labels, messages, headings, notifications) SHALL be sourced from locale files rather than hardcoded in components.
3. Questions, explanations, stage names, badge labels, performance level labels, and share text SHALL be structured in content files organized by locale for future localization.
4. Kiro technical terms SHALL be preserved untranslated when appropriate: Specs, Steering, Hooks, MCP, Powers, Skills.
5. THE locale file structure SHALL support adding new languages by creating new locale directories without modifying application logic.

### Requirement 16: Static Hosting Architecture

**User Story:** As a developer, I want the MVP to be fully static and client-side, so that it can be deployed to any static hosting provider without backend dependencies.

#### Acceptance Criteria

1. THE MVP SHALL NOT require a backend server, authentication service, server-side rendering, or external runtime APIs for the quiz core functionality.
2. ALL quiz progress SHALL be persisted locally via localStorage.
3. THE built application assets SHALL be deployable to static hosting providers such as Cloudflare Pages, Vercel, Netlify, or GitHub Pages without additional server configuration.
4. Correct answers MAY exist client-side for the MVP. THE README or project documentation SHALL state that the MVP is not suitable for competitive certification or secure ranking.
5. IF a future competitive mode, leaderboard, or certification-like feature is added, answer validation SHOULD move server-side. The current MVP SHALL NOT overengineer anti-cheat mechanisms.

### Requirement 17: Route Structure

**User Story:** As a user, I want predictable and bookmarkable URLs for each screen, so that I can navigate directly to a specific view.

#### Acceptance Criteria

1. THE Router SHALL define the following route paths:
   - HomePage: `/`
   - StageSelection_Screen: `/stages`
   - QuizView: `/quiz/:stage`
   - Stage_Results_Screen: `/summary/:stage`
2. THE `:stage` route parameter SHALL correspond to the LearningStage identifier (e.g., `kiro-basics`, `steering`, `enterprise-scenarios`).
3. IF a user navigates to a route with an invalid or unrecognized `:stage` parameter, THE Router SHALL redirect to the StageSelection_Screen.
4. THE Router SHALL support browser history navigation (back/forward) without breaking application state.

