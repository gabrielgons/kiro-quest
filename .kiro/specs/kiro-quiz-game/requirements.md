# Requirements Document

## Introduction

Kiro Quiz Game is an interactive web-based quiz application designed to teach developers about Kiro concepts through a progressive learning experience. The game presents questions in Portuguese (pt-BR) covering topics from basic Kiro concepts to advanced enterprise workflows. The application prioritizes simplicity, low cost, maintainability, and a clean user experience while being structured for future internationalization and feature evolution.

## Glossary

- **Quiz_Engine**: The core application logic responsible for managing quiz flow, question selection, answer evaluation, and progression through difficulty levels
- **Question_Store**: The structured data layer containing all quiz questions, answers, explanations, metadata, and localization content stored as versionable files
- **Progress_Tracker**: The client-side module responsible for persisting and retrieving user progress, scores, and achievements using browser local storage
- **Content_Validator**: A build-time script that validates question files for structural correctness, completeness, and data integrity
- **Feedback_Display**: The UI component responsible for showing educational explanations after each answer, including source references to official Kiro documentation
- **Share_Generator**: The module responsible for generating shareable result summaries for social media platforms
- **Difficulty_Level**: A classification applied to each question indicating its complexity — one of: iniciante (beginner), intermediário (intermediate), or avançado (advanced)
- **Learning_Stage**: A thematic grouping of questions representing a progression topic such as Kiro Basics, Specs, Steering, Hooks, MCP, Powers, or Skills
- **Locale**: A language and region identifier (e.g., pt-BR) used to organize translatable content
- **Question_Type**: The format of a question — one of: multiple-choice, true-false, scenario, or ordering

## Requirements

### Requirement 1: Question Data Structure

**User Story:** As a content maintainer, I want questions stored in a structured, versionable format, so that I can easily add, review, and update quiz content through Git workflows.

#### Acceptance Criteria

1. THE Question_Store SHALL store each question with the following fields: unique id (a non-empty string identifier unique across all question files), category, Difficulty_Level, Question_Type, question text (maximum 500 characters), answer options, correct answer identifier, explanation text (maximum 1000 characters), official source URL, review status, last reviewed date, and Locale metadata
2. THE Question_Store SHALL store answer options per question according to Question_Type: multiple-choice questions SHALL have between 3 and 5 options, true-false questions SHALL have exactly 2 options (Verdadeiro/Falso), scenario questions SHALL have between 3 and 5 options, and ordering questions SHALL have between 3 and 7 sequence items
3. THE Question_Store SHALL use a text-based file format that is editable in a plain text editor and produces meaningful diffs in Git version control
4. THE Question_Store SHALL organize questions into separate files or directories grouped by Learning_Stage and Locale
5. WHEN a new question is added to the Question_Store, THE Question_Store SHALL not require changes to application logic
6. THE Question_Store SHALL preserve original Kiro technical terms (Specs, Steering, Hooks, MCP, Powers, Skills) within Portuguese-language content

### Requirement 2: Content Validation

**User Story:** As a content maintainer, I want automated validation of question files, so that I can catch errors before they reach users.

#### Acceptance Criteria

1. WHEN the Content_Validator runs, THE Content_Validator SHALL detect question entries where the official source URL field is absent, empty, or contains only whitespace
2. WHEN the Content_Validator runs, THE Content_Validator SHALL detect duplicated question identifiers across all question files
3. WHEN the Content_Validator runs, THE Content_Validator SHALL detect invalid correct answer references that do not match any defined answer option
4. WHEN the Content_Validator runs, THE Content_Validator SHALL detect questions where the explanation text field is absent, empty, or contains only whitespace
5. WHEN the Content_Validator runs, THE Content_Validator SHALL detect questions missing Locale metadata
6. WHEN the Content_Validator runs, THE Content_Validator SHALL detect Difficulty_Level values that are not one of the supported values (iniciante, intermediário, avançado)
7. WHEN the Content_Validator runs, THE Content_Validator SHALL report all validation errors to standard output with the affected question identifier and file location, and SHALL exit with a non-zero exit code if one or more validation errors are found
8. WHEN the Content_Validator runs, THE Content_Validator SHALL detect Question_Type values that are not one of the supported values (multiple-choice, true-false, scenario, ordering)

### Requirement 3: Progressive Learning Flow

**User Story:** As a learner, I want to progress through Kiro topics from basic to advanced, so that I can build knowledge incrementally.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL organize questions into the following Learning_Stages in order: Kiro Basics, Specs, Feature Specs, Bugfix Specs, Steering, Hooks, MCP, Powers, Skills, Real-world Workflows, Enterprise Scenarios
2. THE Quiz_Engine SHALL present all questions within each Learning_Stage ordered by Difficulty_Level from iniciante to intermediário to avançado
3. WHEN a user has submitted an answer to every question in a Learning_Stage, THE Quiz_Engine SHALL mark that Learning_Stage as complete and advance the user to the next Learning_Stage in the defined order
4. THE Quiz_Engine SHALL allow users to select any Learning_Stage from a stage selection screen, regardless of completion status of other stages
5. WHEN a user completes the final Learning_Stage (Enterprise Scenarios), THE Quiz_Engine SHALL navigate the user to the final achievement summary screen instead of advancing to another stage

### Requirement 4: Question Presentation

**User Story:** As a learner, I want to answer different types of questions, so that I can engage with Kiro concepts in varied ways.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL support the following Question_Types: multiple-choice, true-false, scenario, and ordering
2. WHEN presenting a multiple-choice question, THE Quiz_Engine SHALL display the question text and between 3 and 5 answer options without indicating the correct answer
3. WHEN presenting a true-false question, THE Quiz_Engine SHALL display a statement and exactly two options (Verdadeiro/Falso)
4. WHEN presenting a scenario question, THE Quiz_Engine SHALL display a practical development context followed by between 3 and 5 answer options
5. WHEN presenting an ordering question, THE Quiz_Engine SHALL display between 3 and 7 workflow steps in a randomized order that the user must arrange in the correct sequence
6. THE Quiz_Engine SHALL display answer options for multiple-choice and scenario questions in a consistent randomized order per session to avoid positional bias

### Requirement 5: Answer Feedback

**User Story:** As a learner, I want immediate educational feedback after answering, so that I can understand why an answer is correct or incorrect.

#### Acceptance Criteria

1. WHEN a user submits an answer, THE Feedback_Display SHALL show whether the answer is correct or incorrect within 500 milliseconds of submission, using visually distinct indicators (color and icon) to differentiate the correct outcome from the incorrect outcome
2. WHEN a user submits an answer, THE Feedback_Display SHALL display the educational explanation associated with the question
3. IF the question has an official source URL, THEN THE Feedback_Display SHALL display a clickable link to the relevant official Kiro documentation that opens in a new browser tab
4. THE Feedback_Display SHALL present all feedback content (correct/incorrect indication, explanation text, and link labels) in Portuguese (pt-BR)
5. WHEN the Feedback_Display is shown, THE Feedback_Display SHALL provide a button to advance to the next question or to the stage summary if the current question is the last in the Learning_Stage

### Requirement 6: Progress Tracking

**User Story:** As a learner, I want my progress saved locally, so that I can resume my learning journey across sessions without needing to create an account.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL persist user progress using browser local storage
2. THE Progress_Tracker SHALL track: completed Learning_Stages, current Learning_Stage, current question index within the active Learning_Stage, questions answered, correct answer count, and total score
3. WHEN a user submits an answer or completes a Learning_Stage, THE Progress_Tracker SHALL save the updated progress state to local storage
4. WHEN a user returns to the application, THE Progress_Tracker SHALL restore the user's previous progress state including the current Learning_Stage and question position within that stage
5. THE Progress_Tracker SHALL not require user authentication or account creation
6. WHEN browser local storage is unavailable, THE Progress_Tracker SHALL allow the user to play without persistent progress and display a notification informing the user that progress will not be saved for the duration of the session
7. IF stored progress data is corrupted or cannot be parsed, THEN THE Progress_Tracker SHALL discard the invalid data, start the user from the beginning, and display a notification indicating that previous progress could not be recovered

### Requirement 7: Score and Achievement Summary

**User Story:** As a learner, I want to see a summary of my performance after completing a quiz session, so that I can understand my knowledge level.

#### Acceptance Criteria

1. WHEN a user completes a Learning_Stage, THE Quiz_Engine SHALL display a score summary showing correct answers out of total questions for that stage in the format "X/Y" (e.g., "8/10")
2. WHEN a user completes all Learning_Stages, THE Quiz_Engine SHALL display a final achievement summary with overall score and performance level
3. THE Quiz_Engine SHALL present all score and achievement text in Portuguese (pt-BR)
4. THE Quiz_Engine SHALL assign a performance level label based on the user's overall score percentage using the following thresholds: 0-49% = "Iniciante em Kiro", 50-74% = "Praticante de Kiro", 75-89% = "Especialista em Kiro", 90-100% = "Mestre em Kiro"

### Requirement 8: Social Sharing

**User Story:** As a learner, I want to share my quiz results on social media, so that I can showcase my Kiro knowledge and encourage others to learn.

#### Acceptance Criteria

1. WHEN a user completes a Learning_Stage or the full quiz, THE Share_Generator SHALL display a share button that opens the LinkedIn share URL pre-populated with the generated share text
2. THE Share_Generator SHALL generate share text in Portuguese (pt-BR) including the user's score as correct answers out of total questions (e.g., "8/10"), the Learning_Stage name completed, and a maximum length of 280 characters
3. THE Share_Generator SHALL structure share text content separately from application logic to support future localization
4. THE Share_Generator SHALL not include any personally identifiable information in the share text beyond what the user explicitly provides
5. IF the share action fails to open the LinkedIn share URL, THEN THE Share_Generator SHALL provide a fallback mechanism allowing the user to copy the share text to the clipboard

### Requirement 9: Responsive User Interface

**User Story:** As a learner, I want to use the quiz on any device, so that I can learn on desktop or mobile.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL render a responsive interface that adapts to viewport widths from 320px to 1920px such that all content remains visible without horizontal scrolling and no interactive elements are overlapped or truncated
2. THE Quiz_Engine SHALL provide the following screens: home page, Learning_Stage selection, quiz flow with progress indicator, answer feedback, and score summary
3. THE Quiz_Engine SHALL display a progress indicator showing the current question number relative to the total questions in the active Learning_Stage in the format "X / Y" where X is the current question number and Y is the total count
4. THE Quiz_Engine SHALL be navigable using keyboard controls such that all interactive elements are reachable via Tab key, activatable via Enter key, and answer options are traversable via Arrow keys
5. WHILE a user is navigating via keyboard, THE Quiz_Engine SHALL display a visible focus indicator on the currently focused interactive element
6. THE Quiz_Engine SHALL render all touch targets at a minimum size of 44x44 CSS pixels on viewports below 768px width

### Requirement 10: Internationalization Readiness

**User Story:** As a project maintainer, I want the content structure to support future languages, so that the game can be localized without a major rewrite.

#### Acceptance Criteria

1. THE Question_Store SHALL include a Locale field on every question entry using a language-region format as defined in the Glossary (e.g., pt-BR)
2. THE Quiz_Engine SHALL load UI labels, button text, and static messages from a locale-specific content file keyed by Locale value, rather than hardcoding them in application code
3. THE Quiz_Engine SHALL default to pt-BR as the active Locale for the MVP
4. WHEN a new Locale is added, THE Question_Store SHALL require only the addition of new content files and entries without requiring changes to application logic, such that the new Locale is available by adding translated content files that follow the existing structure
5. IF a UI label, question, or static message is not available for the active Locale, THEN THE Quiz_Engine SHALL fall back to the pt-BR version of that content

### Requirement 11: Static Hosting Architecture

**User Story:** As a project owner, I want the application hosted for free or near-zero cost, so that the project remains sustainable without funding.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL operate as a fully static client-side application for the MVP, requiring no server-side runtime, no server-side rendering, and no runtime dependencies on external APIs for core quiz functionality
2. THE Quiz_Engine SHALL produce a build output consisting exclusively of static assets (HTML, CSS, JavaScript, and data files) that can be served by any static file hosting platform (Cloudflare Pages, Vercel, Netlify, or GitHub Pages) without server-side processing or configuration
3. THE Quiz_Engine SHALL load question data from static files bundled with the application at build time
4. IF a future version requires server-side answer validation, THEN THE Quiz_Engine SHALL isolate answer-evaluation logic behind a defined interface so that the data-fetching and validation layer can be replaced with a serverless backend without modifying question presentation or UI components
5. THE Quiz_Engine SHALL function correctly when served from a subpath (e.g., repository-name subdirectory on GitHub Pages) without requiring server-side URL rewrites

### Requirement 12: Anti-Cheat Considerations

**User Story:** As a project owner, I want a clear strategy for answer security, so that the game can evolve to support competitive features later.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL include correct answer data in client-side code for the learning-focused MVP without obfuscation or encryption
2. THE Quiz_Engine SHALL include a visible notice in the application's documentation (README or equivalent project documentation file) stating that the MVP is designed for learning purposes and does not provide answer security suitable for competitive certification
3. IF a competitive mode or leaderboard is added in a future version, THEN THE Quiz_Engine SHALL support server-side answer validation to prevent trivial answer extraction
4. THE Quiz_Engine SHALL store correct answer identifiers in a separate data structure or file from question presentation data (question text, answer option labels, and explanations) so that answer resolution can be replaced with a server call without modifying question rendering logic
5. THE Quiz_Engine SHALL not render correct answer identifiers in the DOM before the user submits their answer for the current question

### Requirement 13: Content Sourcing and Review

**User Story:** As a content maintainer, I want questions linked to official documentation, so that I can verify accuracy and update content when documentation changes.

#### Acceptance Criteria

1. THE Question_Store SHALL include an official Kiro documentation URL for each question as the source of truth
2. THE Question_Store SHALL include a review status field (reviewed, needs-review, draft) for each question
3. THE Question_Store SHALL include a last-reviewed date for each question in ISO 8601 date format (YYYY-MM-DD)
4. WHEN a content maintainer provides a documentation URL that has been updated, THE Content_Validator SHALL produce a list of all questions whose source URL matches the changed URL, including each question's identifier and current review status
5. WHEN the Content_Validator identifies questions referencing an updated documentation URL, THE Content_Validator SHALL set the review status of those questions to needs-review
6. WHEN a new question is added to the Question_Store without an explicit review status, THE Question_Store SHALL assign the default review status of draft

### Requirement 14: Contributor Workflow

**User Story:** As a community contributor, I want to suggest new questions through pull requests, so that the question database can grow with community input.

#### Acceptance Criteria

1. THE Question_Store SHALL use a file structure where new questions can be added by creating new files without modifying existing question files, allowing individual questions or question groups of up to 50 questions per file to be contributed via standard Git pull request workflows
2. WHEN a pull request adds new questions and the Content_Validator detects validation errors, THE Content_Validator SHALL report a failing CI status on the pull request with the list of validation errors including affected question identifiers and error descriptions
3. THE Question_Store SHALL include contribution documentation that describes the question format, all required fields, valid values for each field, a complete example question entry for each Question_Type, and step-by-step contribution guidelines
4. WHEN new questions are added via a pull request, THE Question_Store SHALL assign those questions a review status of "draft" until a maintainer explicitly changes the status
