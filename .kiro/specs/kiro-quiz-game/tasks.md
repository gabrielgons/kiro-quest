# Implementation Plan: Kiro Quiz Game

## Overview

This plan implements a fully static Vue 3 + TypeScript quiz application that teaches Kiro concepts through progressive learning stages. The implementation follows an incremental approach: core types and data layer first, then engine logic, state management, UI components, and finally integration wiring. Property-based tests validate correctness properties throughout.

## Tasks

- [x] 1. Set up project structure, core types, and data layer
  - [x] 1.1 Initialize Vite + Vue 3 + TypeScript project with Pinia, Vue Router, Vitest, and fast-check
    - Initialize project with `npm create vite@latest` using Vue + TypeScript template
    - Install dependencies: `pinia`, `vue-router`, `vitest`, `@vue/test-utils`, `@pinia/testing`, `fast-check`, `@fast-check/vitest`
    - Configure `vite.config.ts` with `@` path alias, base path for GitHub Pages, and `@vitejs/plugin-vue`
    - Configure `vitest.config.ts` with globals, environment jsdom, and path aliases
    - Configure `tsconfig.json` with strict mode and path aliases
    - Set up CSS custom properties in `src/assets/variables.css` for theming tokens
    - _Requirements: 11.1, 11.2, 11.5_

  - [x] 1.2 Define core TypeScript types and interfaces
    - Create `src/data/types.ts` with `DifficultyLevel`, `QuestionType`, `ReviewStatus`, `Locale`, `QuestionPresentation`, `AnswerOption`, `OrderingItem`, `AnswerKey` types
    - Create `src/engine/types.ts` with `LearningStage`, `QuizState`, `UserAnswer`, `StageResult`, `AnswerResult`, `PerformanceLevel` types
    - Create `src/progress/types.ts` with `ProgressState` interface including version field for schema migration
    - Create `src/sharing/types.ts` with `ShareableResult` interface
    - Create `src/i18n/types.ts` with `LocaleMessages` interface
    - _Requirements: 1.1, 1.2, 3.1, 6.2, 7.4, 8.2_

  - [x] 1.3 Create question and answer JSON data files with sample content
    - Create directory structure: `content/questions/pt-BR/`, `content/answers/pt-BR/`, `content/i18n/pt-BR/`
    - Create one JSON file per Learning Stage in `content/questions/pt-BR/` (11 files: kiro-basics.json through enterprise-scenarios.json)
    - Create corresponding answer files in `content/answers/pt-BR/` (11 files: kiro-basics.answers.json through enterprise-scenarios.answers.json)
    - Include at least 3 sample questions per stage covering all question types
    - Ensure answer data is in separate files from presentation data
    - Preserve Kiro technical terms (Specs, Steering, Hooks, MCP, Powers, Skills) in Portuguese content
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 12.4_

  - [x] 1.4 Create locale UI labels file
    - Create `content/i18n/pt-BR/ui.json` with all UI labels, button text, and static messages in Portuguese
    - Include keys for: app title, home screen, stage selection, quiz flow, feedback, summary, sharing, achievements, error notifications
    - Structure content separately from application logic for future localization
    - _Requirements: 10.1, 10.2, 10.3, 8.3_

  - [x] 1.5 Implement Question Store module
    - Create `src/data/questionStore.ts` implementing the `QuestionStore` interface
    - Import question JSON files at build time using Vite's static import
    - Implement `getStages()` returning all Learning Stages in defined order
    - Implement `getQuestionsForStage(stage)` returning questions sorted by difficulty
    - Implement `getQuestionById(id)` for single question lookup
    - Implement `getAnswerKey(questionId)` loading from separate answer files
    - Ensure no application logic changes needed when adding new questions
    - _Requirements: 1.5, 3.1, 11.3, 12.4_

- [x] 2. Implement content validation script
  - [x] 2.1 Create Content Validator CLI script
    - Create `scripts/validate-content.ts` as a Node.js CLI script
    - Implement validation for: missing/empty sourceUrl, missing/empty explanation, missing locale metadata
    - Implement validation for: duplicate question IDs across all files
    - Implement validation for: invalid correctAnswerId references not matching option IDs
    - Implement validation for: invalid difficulty values not in {iniciante, intermediário, avançado}
    - Implement validation for: invalid question type values not in {multiple-choice, true-false, scenario, ordering}
    - Implement validation for: incorrect option counts per question type (multiple-choice: 3-5, true-false: 2, scenario: 3-5, ordering: 3-7)
    - Report all errors to stdout with question ID and file path
    - Exit with non-zero code if any errors found
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 2.2 Implement source URL lookup and review status update
    - Add `findQuestionsBySourceUrl(url)` function returning all questions matching the URL with their IDs and review status
    - Implement logic to set review status to "needs-review" for questions referencing an updated URL
    - Implement default review status assignment of "draft" for questions without explicit reviewStatus
    - _Requirements: 13.4, 13.5, 13.6, 14.4_

  - [ ]* 2.3 Write property test for question schema validity
    - **Property 1: Question schema validity**
    - Generate arbitrary questions with fast-check and verify all required fields, type constraints, text length limits, and option count rules
    - **Validates: Requirements 1.1, 1.2, 13.3**

  - [ ]* 2.4 Write property test for missing required text fields detection
    - **Property 2: Content validator detects missing required text fields**
    - Generate questions with absent/empty/whitespace sourceUrl, explanation, or locale and verify validator reports errors
    - **Validates: Requirements 2.1, 2.4, 2.5**

  - [ ]* 2.5 Write property test for invalid enum values detection
    - **Property 3: Content validator detects invalid enum values**
    - Generate questions with arbitrary invalid difficulty and type values and verify validator reports errors
    - **Validates: Requirements 2.6, 2.8**

  - [ ]* 2.6 Write property test for duplicate ID detection
    - **Property 4: Content validator detects duplicate IDs**
    - Generate sets of questions with duplicated IDs and verify validator reports errors for each duplicate
    - **Validates: Requirements 2.2**

  - [ ]* 2.7 Write property test for invalid answer reference detection
    - **Property 5: Content validator detects invalid answer references**
    - Generate questions with correctAnswerId not matching any option ID and verify validator reports errors
    - **Validates: Requirements 2.3**

  - [ ]* 2.8 Write property test for error output format
    - **Property 6: Content validator error output format**
    - For any validation error, verify output includes the question ID and file path
    - **Validates: Requirements 2.7**

  - [x] 2.9 Add npm script for content validation
    - Add `validate-content` script to `package.json` that runs the validator via `tsx scripts/validate-content.ts`
    - Ensure validator runs successfully against sample question data
    - _Requirements: 2.7, 14.2_

- [ ] 3. Checkpoint - Ensure data layer and validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Quiz Engine logic
  - [x] 4.1 Implement quiz engine core with difficulty ordering and stage progression
    - Create `src/engine/quizEngine.ts` implementing the `QuizEngine` interface
    - Implement `startStage(stage)` loading questions sorted by difficulty (iniciante → intermediário → avançado)
    - Implement `submitAnswer(questionId, answer)` evaluating against answer key and returning result with explanation
    - Implement `nextQuestion()` advancing to next question or signaling stage completion
    - Implement stage completion detection: mark stage complete when all questions answered, advance to next stage
    - Handle final stage (Enterprise Scenarios) completion by signaling navigation to achievement screen
    - _Requirements: 3.2, 3.3, 3.5, 5.1, 5.2_

  - [x] 4.2 Implement option randomization with session seed
    - Implement seeded pseudo-random shuffle for multiple-choice and scenario option ordering
    - Store session seed in quiz state for deterministic randomization within a session
    - Implement ordering question randomization ensuring presented order differs from correct sequence
    - Ensure randomization is consistent: same seed + same question = same order
    - _Requirements: 4.5, 4.6_

  - [x] 4.3 Implement performance level classification
    - Create `src/engine/scoring.ts` with `calculatePerformanceLevel(scorePercentage)` function
    - Implement thresholds: 0-49% = "Iniciante em Kiro", 50-74% = "Praticante de Kiro", 75-89% = "Especialista em Kiro", 90-100% = "Mestre em Kiro"
    - Implement score formatting as "X/Y" format
    - _Requirements: 7.1, 7.4_

  - [ ]* 4.4 Write property test for difficulty ordering within stage
    - **Property 7: Difficulty ordering within stage**
    - For any Learning Stage, verify questions are ordered iniciante → intermediário → avançado
    - **Validates: Requirements 3.2**

  - [ ]* 4.5 Write property test for stage completion progression
    - **Property 8: Stage completion progression**
    - For any non-final stage, verify that answering all questions marks stage complete and advances to next
    - **Validates: Requirements 3.3**

  - [ ]* 4.6 Write property test for no answer leakage before submission
    - **Property 9: No answer leakage before submission**
    - For any question in pre-submission state, verify presentation data does not contain correct answer ID
    - **Validates: Requirements 4.2, 12.4, 12.5**

  - [ ]* 4.7 Write property test for ordering question randomization
    - **Property 10: Ordering question randomization**
    - For any ordering question with 3+ items, verify presented order differs from correct sequence statistically
    - **Validates: Requirements 4.5**

  - [ ]* 4.8 Write property test for deterministic randomization per session seed
    - **Property 11: Deterministic randomization per session seed**
    - For any question and seed, verify applying randomization multiple times produces same order
    - **Validates: Requirements 4.6**

  - [ ]* 4.9 Write property test for performance level classification
    - **Property 15: Performance level classification**
    - For any score percentage 0-100, verify correct performance level assignment per thresholds
    - **Validates: Requirements 7.4**

  - [ ]* 4.10 Write property test for score formatting
    - **Property 14: Score formatting**
    - For any correctCount and totalCount where 0 ≤ correctCount ≤ totalCount, verify formatted string equals "{correctCount}/{totalCount}"
    - **Validates: Requirements 7.1**

- [x] 5. Implement Progress Tracker and Locale System
  - [x] 5.1 Implement Progress Tracker with local storage persistence
    - Create `src/progress/progressTracker.ts` implementing the `ProgressTracker` interface
    - Implement `isAvailable()` detecting local storage availability via try/catch
    - Implement `save(state)` serializing ProgressState to JSON in local storage
    - Implement `load()` deserializing and validating stored progress data
    - Implement corruption recovery: catch JSON parse errors or schema validation failures, reset to initial state
    - Implement `reset()` clearing stored progress
    - Include schema version field for future migration support
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.2 Implement locale system with pt-BR fallback
    - Create `src/i18n/useLocale.ts` Vue composable
    - Load UI labels from locale-specific content file
    - Implement `t(key)` function returning translated string
    - Implement fallback: if key missing in active locale, return pt-BR value
    - Default active locale to pt-BR for MVP
    - Log warning in development mode for missing keys
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

  - [ ]* 5.3 Write property test for progress state round-trip
    - **Property 12: Progress state round-trip**
    - For any valid ProgressState, verify serialize → deserialize produces equivalent object with all fields preserved
    - **Validates: Requirements 6.2, 6.4**

  - [ ]* 5.4 Write property test for corrupted progress recovery
    - **Property 13: Corrupted progress recovery**
    - For any invalid string (not valid JSON or not conforming to schema), verify Progress Tracker returns fresh initial state without throwing
    - **Validates: Requirements 6.7**

  - [ ]* 5.5 Write property test for locale fallback to pt-BR
    - **Property 18: Locale fallback to pt-BR**
    - For any key existing in pt-BR but missing from active locale, verify system returns pt-BR value
    - **Validates: Requirements 10.5**

- [ ] 6. Checkpoint - Ensure engine and progress tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Share Generator and formatting utilities
  - [x] 7.1 Implement Share Generator with LinkedIn sharing and clipboard fallback
    - Create `src/sharing/shareGenerator.ts` implementing the `ShareGenerator` interface
    - Implement `generateShareText(result)` producing Portuguese text with score "X/Y", stage name, performance level, max 280 chars
    - Implement `shareToLinkedIn(text)` opening LinkedIn share URL via `window.open`
    - Implement `copyToClipboard(text)` as fallback using Clipboard API
    - Ensure no personally identifiable information in share text
    - Structure share text template separately from logic for future localization
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.2 Implement progress indicator formatting
    - Create `src/engine/formatters.ts` with progress indicator formatting function
    - Format as "{current} / {total}" where current is 1-based question number
    - _Requirements: 9.3_

  - [ ]* 7.3 Write property test for share text generation
    - **Property 16: Share text generation**
    - For any valid ShareableResult, verify share text contains score "X/Y", stage name, is ≤ 280 chars, and contains no PII
    - **Validates: Requirements 8.2, 8.4**

  - [ ]* 7.4 Write property test for progress indicator formatting
    - **Property 17: Progress indicator formatting**
    - For any current (1-based) and total where 1 ≤ current ≤ total, verify output is "{current} / {total}"
    - **Validates: Requirements 9.3**

  - [ ]* 7.5 Write property test for source URL lookup and status update
    - **Property 19: Source URL lookup and status update**
    - For any source URL in the store, verify findQuestionsBySourceUrl returns exactly matching questions and marking sets status to "needs-review"
    - **Validates: Requirements 13.4, 13.5**

  - [ ]* 7.6 Write property test for default review status assignment
    - **Property 20: Default review status assignment**
    - For any question without explicit reviewStatus, verify system assigns "draft"
    - **Validates: Requirements 13.6, 14.4**

- [x] 8. Implement Pinia stores
  - [x] 8.1 Implement Quiz Store with Pinia
    - Create `src/stores/quizStore.ts` using `defineStore` with Composition API setup
    - Implement state: currentStage, currentQuestionIndex, answers, stageResults, completedStages, sessionSeed
    - Implement getters: currentQuestion, stageProgress, overallScore
    - Implement actions: startStage, submitAnswer, nextQuestion integrating with Quiz Engine
    - Wire answer evaluation to not expose correct answer before submission
    - _Requirements: 3.2, 3.3, 3.4, 4.6, 12.5_

  - [x] 8.2 Implement Progress Store with Pinia
    - Create `src/stores/progressStore.ts` using `defineStore` with Composition API setup
    - Implement state: isStorageAvailable, hasRecoveryError
    - Implement actions: load, save, reset integrating with Progress Tracker
    - Auto-save on answer submission and stage completion
    - Handle storage unavailability and corruption gracefully with user notifications
    - _Requirements: 6.1, 6.3, 6.4, 6.6, 6.7_

- [x] 9. Implement Vue Router and view components
  - [x] 9.1 Configure Vue Router with hash mode and route definitions
    - Create `src/router/index.ts` with `createWebHashHistory`
    - Define routes: home (`/`), stages (`/stages`), quiz (`/quiz/:stage`), summary (`/summary/:stage`), achievement (`/achievement`)
    - Implement lazy loading for all view components
    - Ensure routing works from subpath deployment
    - _Requirements: 9.2, 11.5_

  - [x] 9.2 Implement Home Page view
    - Create `src/views/HomePage.vue` with welcome message and start button
    - Load text from locale system (not hardcoded)
    - Responsive layout adapting from 320px to 1920px
    - Keyboard accessible: all elements reachable via Tab, activatable via Enter
    - _Requirements: 9.1, 9.2, 9.4, 10.2_

  - [x] 9.3 Implement Stage Selection view
    - Create `src/views/StageSelect.vue` displaying all 11 Learning Stages
    - Show completion status for each stage
    - Allow selection of any stage regardless of completion status
    - Responsive grid layout with 44x44px minimum touch targets on mobile
    - Keyboard navigable with visible focus indicators
    - _Requirements: 3.4, 9.1, 9.2, 9.4, 9.5, 9.6_

  - [x] 9.4 Implement Quiz Flow view with progress indicator
    - Create `src/views/QuizFlow.vue` orchestrating question display and feedback
    - Display progress indicator showing "X / Y" format
    - Integrate with Quiz Store for state management
    - Save progress on each answer submission
    - Handle stage completion navigation (to summary or achievement)
    - _Requirements: 5.1, 9.2, 9.3_

  - [x] 9.5 Implement Stage Summary view with share button
    - Create `src/views/StageSummary.vue` showing score "X/Y" for completed stage
    - Display share button that opens LinkedIn share URL
    - Implement clipboard fallback if share URL fails to open
    - All text in Portuguese via locale system
    - _Requirements: 7.1, 7.3, 8.1, 8.5_

  - [x] 9.6 Implement Final Achievement view
    - Create `src/views/FinalAchievement.vue` showing overall score and performance level
    - Display performance level label based on score percentage
    - Include share button for full quiz results
    - Navigate here after completing Enterprise Scenarios stage
    - _Requirements: 3.5, 7.2, 7.3, 7.4, 8.1_

- [ ] 10. Implement question type components
  - [ ] 10.1 Implement QuestionCard component with multiple-choice and true-false support
    - Create `src/components/QuestionCard.vue` as container for question types
    - Create `src/components/MultipleChoice.vue` displaying 3-5 options as radio buttons
    - Create `src/components/TrueFalse.vue` displaying exactly 2 options (Verdadeiro/Falso)
    - Implement keyboard navigation: Arrow keys to traverse options, Enter to confirm
    - Display visible focus indicators on focused elements
    - Do not indicate correct answer before submission
    - _Requirements: 4.1, 4.2, 4.3, 9.4, 9.5, 12.5_

  - [ ] 10.2 Implement Scenario and Ordering question components
    - Create `src/components/ScenarioQuestion.vue` displaying context + 3-5 options
    - Create `src/components/OrderingQuestion.vue` displaying 3-7 draggable/reorderable items
    - Implement drag-and-drop or button-based reordering for ordering questions
    - Present ordering items in randomized order (different from correct sequence)
    - Keyboard accessible: reorderable via Arrow keys
    - Minimum 44x44px touch targets on mobile viewports
    - _Requirements: 4.4, 4.5, 9.1, 9.4, 9.5, 9.6_

  - [ ] 10.3 Implement FeedbackPanel component
    - Create `src/components/FeedbackPanel.vue` showing correct/incorrect with visual indicators (color + icon)
    - Display explanation text from question data
    - Display clickable link to official Kiro documentation (opens in new tab)
    - Show "Next Question" button (or "Stage Summary" if last question)
    - All feedback text in Portuguese via locale system
    - Render feedback within 500ms of submission (no artificial delays)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 10.4 Implement ProgressBar component
    - Create `src/components/ProgressBar.vue` displaying "X / Y" progress
    - Responsive design adapting to viewport width
    - Accessible with appropriate ARIA attributes
    - _Requirements: 9.3_

  - [ ] 10.5 Implement notification banner for storage/recovery warnings
    - Create `src/components/NotificationBanner.vue` for dismissible notifications
    - Show "progress will not be saved" when storage unavailable
    - Show "previous progress could not be recovered" on corruption
    - Auto-dismiss after 8 seconds for informational messages
    - Persist until dismissed for data-loss warnings
    - _Requirements: 6.6, 6.7_

- [ ] 11. Checkpoint - Ensure UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Wire application together and implement app entry point
  - [ ] 12.1 Create main application entry point and App.vue
    - Create `src/main.ts` initializing Vue app with Pinia and Vue Router
    - Create `src/App.vue` with RouterView and global layout
    - Load progress on app mount, restore previous state
    - Set up CSS custom properties and global styles
    - Ensure responsive layout from 320px to 1920px without horizontal scrolling
    - _Requirements: 6.4, 9.1, 11.1_

  - [ ] 12.2 Wire Quiz Flow end-to-end: stage selection → quiz → feedback → summary → achievement
    - Connect stage selection to quiz start via router navigation
    - Wire answer submission through Quiz Store → Progress Store → Local Storage
    - Connect stage completion to summary navigation
    - Connect final stage completion to achievement screen
    - Ensure all interactive elements have keyboard support and visible focus
    - _Requirements: 3.3, 3.5, 5.5, 6.3, 9.4, 9.5_

  - [ ]* 12.3 Write component tests for question type rendering and keyboard navigation
    - Test MultipleChoice renders correct number of options
    - Test TrueFalse renders exactly 2 options
    - Test OrderingQuestion renders items in randomized order
    - Test keyboard navigation (Tab, Enter, Arrow keys) across all components
    - Test visible focus indicators appear during keyboard navigation
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 9.4, 9.5_

  - [ ]* 12.4 Write integration tests for full quiz flow
    - Test complete flow: select stage → answer questions → view summary
    - Test progress persistence across simulated page reloads
    - Test storage unavailability notification
    - Test corrupted progress recovery notification
    - _Requirements: 3.3, 6.3, 6.4, 6.6, 6.7_

- [ ] 13. Documentation and build configuration
  - [ ] 13.1 Create contribution documentation and README
    - Create `CONTRIBUTING.md` describing question format, all required fields, valid values, example entries for each question type, and step-by-step contribution guidelines
    - Update `README.md` with project overview, setup instructions, and anti-cheat notice stating MVP is for learning purposes without answer security
    - Document that questions can be added by creating new files without modifying existing ones (up to 50 questions per file)
    - _Requirements: 12.2, 14.1, 14.3_

  - [ ] 13.2 Configure build pipeline and npm scripts
    - Add npm scripts: `validate-content`, `test`, `test:properties`, `test:e2e`, `typecheck`, `build`
    - Configure Vite build to produce static assets only (HTML, CSS, JS, data files)
    - Ensure build works with configurable base path for GitHub Pages subpath deployment
    - Wire content validation to run before build
    - _Requirements: 11.2, 11.3, 11.5_

- [ ] 14. Final checkpoint - Ensure all tests pass and build succeeds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document (all 20 properties covered)
- Unit tests validate specific examples and edge cases
- The tech stack is Vue 3 + TypeScript + Vite + Pinia + Vue Router (hash mode) + Vitest + fast-check + Playwright
- All UI text must be loaded from locale files, never hardcoded
- Answer data is always stored separately from question presentation data

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.3", "1.5"] },
    { "id": 3, "tasks": ["2.1", "5.2"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 5, "tasks": ["4.1", "5.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10"] },
    { "id": 8, "tasks": ["7.1", "7.2"] },
    { "id": 9, "tasks": ["7.3", "7.4", "7.5", "7.6"] },
    { "id": 10, "tasks": ["8.1", "8.2"] },
    { "id": 11, "tasks": ["9.1"] },
    { "id": 12, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 13, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 14, "tasks": ["12.1"] },
    { "id": 15, "tasks": ["12.2"] },
    { "id": 16, "tasks": ["12.3", "12.4"] },
    { "id": 17, "tasks": ["13.1", "13.2"] }
  ]
}
```
