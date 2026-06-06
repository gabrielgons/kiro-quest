# Implementation Plan: Shareable Badges and Certificate

## Overview

This plan implements client-side image generation for shareable achievement badges and a full completion certificate in the Kiro Quest application. The implementation uses the HTML5 Canvas API for rendering, TypeScript for type safety, and integrates with the existing Vue 3 + Pinia architecture. Tasks are organized to build foundational types and utilities first, then renderers, then the composable and sharing layer, and finally integrate into existing views.

## Tasks

- [x] 1. Set up badges module structure and core types
  - [x] 1.1 Create badge types and interfaces
    - Create `src/badges/types.ts` with all TypeScript interfaces: `BadgeDesign`, `BadgeRendererOptions`, `CertificateRendererOptions`, `CertificateStats`, `ImageShareOptions`, and type re-exports for `LearningStage` and `PerformanceLevel`
    - Include the `UseBadgeCanvasReturn` interface for the composable
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 6.1, 6.2_

  - [x] 1.2 Create badge design configuration
    - Create `src/badges/badgeDesigns.ts` with the `BADGE_DESIGNS` record mapping all 11 `LearningStage` values to their `BadgeDesign` entries (icon, primaryColor, secondaryColor, displayName in Portuguese)
    - Ensure all display names are ≤ 30 characters and all colors are valid hex codes
    - _Requirements: 6.1, 6.2, 6.3_

  - [x]* 1.3 Write property tests for badge design configuration
    - **Property 9: Badge Design Configuration Completeness and Validity**
    - Test that every LearningStage has an entry with non-empty emoji icon, valid hex colors, and displayName ≤ 30 chars
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Implement canvas utilities and badge renderer
  - [x] 2.1 Create shared canvas utilities
    - Create `src/badges/canvasUtils.ts` with helper functions: `roundedRect()` for drawing rounded rectangles, `canvasToBlob()` for converting canvas to PNG Blob, and any other shared drawing primitives
    - _Requirements: 1.1, 2.1, 8.1_

  - [x] 2.2 Implement badge renderer
    - Create `src/badges/badgeRenderer.ts` implementing the `renderBadge()` function
    - Draw gradient background using stage-specific colors from `BADGE_DESIGNS`
    - Draw semi-transparent overlay (theme-aware), stage icon, stage name, score, performance level, and "Kiro Quest" branding
    - Badge canvas size: 400×400 pixels
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_

  - [x]* 2.3 Write property tests for badge renderer
    - **Property 1: Badge Dimension Invariant** — For any valid LearningStage and score, the badge canvas is 400×400
    - **Property 5: Badge Generation Success** — For any valid stage/score, generation returns non-null PNG Blob
    - **Property 10: Badge Renders From Stage Design Config** — Badge uses correct colors from BADGE_DESIGNS
    - **Property 11: Badge Theme Consistency** — Theme parameter determines overlay styling
    - **Validates: Requirements 1.1, 1.3, 1.4, 7.1, 7.2**

- [x] 3. Implement certificate renderer
  - [x] 3.1 Implement certificate renderer
    - Create `src/badges/certificateRenderer.ts` implementing the `renderCertificate()` function
    - Draw decorative border, "Certificado de Conclusão" title, user name (or "Um(a) Desbravador(a)" fallback), completion message in Portuguese, stats, pt-BR formatted date, and branding
    - Certificate canvas size: 1200×800 pixels (landscape)
    - Support light/dark theme with appropriate background and text colors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.3, 7.4_

  - [x]* 3.2 Write property tests for certificate renderer
    - **Property 2: Certificate Dimension Invariant** — Canvas is always 1200×800
    - **Property 6: Certificate Generation Success** — Returns non-null PNG Blob for valid inputs
    - **Property 7: Certificate Name Display** — Non-empty trimmed name shown; empty shows fallback
    - **Property 12: Certificate Theme Consistency** — Dark theme = dark bg/light text; light = white bg/dark text
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.3, 7.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement image sharer and share text generation
  - [x] 5.1 Implement image sharer module
    - Create `src/badges/imageSharer.ts` with functions: `downloadImage()`, `shareToSocial()`, `canUseWebShareAPI()`, `shareViaWebAPI()`, and `generateBadgeShareText()` / `generateCertificateShareText()`
    - `downloadImage()` creates object URL, triggers download via anchor element, and revokes URL immediately
    - `shareToSocial()` opens LinkedIn/Twitter share URLs in new window with URL-encoded text
    - `shareViaWebAPI()` uses navigator.share with file attachment when available
    - Download filenames: "kiro-quest-badge-{stage-id}.png" for badges, "kiro-quest-certificate.png" for certificates
    - Strip path separators from filenames for security
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3_

  - [x]* 5.2 Write property tests for image sharer
    - **Property 13: Share Text Length Limit** — Generated share text never exceeds 280 characters
    - **Property 14: Share Text Achievement Content** — Badge text contains stage name + performance level; certificate text contains performance level + completion message
    - **Property 15: Share URL Encoding** — encodeURIComponent applied to all user text in URLs
    - **Property 16: Download Object URL Lifecycle** — Object URL created and revoked (no leaks)
    - **Property 17: Download Filename Contains Stage Identifier** — Filename matches pattern "kiro-quest-badge-{stage-id}.png"
    - **Property 18: Filename Path Separator Stripping** — No / or \ in filenames
    - **Validates: Requirements 4.1, 4.3, 4.4, 5.6, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3**

- [x] 6. Implement Vue composable for badge canvas lifecycle
  - [x] 6.1 Create useBadgeCanvas composable
    - Create `src/badges/useBadgeCanvas.ts` implementing the `useBadgeCanvas()` composable
    - Manage offscreen canvas creation, call badge/certificate renderers, convert to Blob via `canvasToBlob()`
    - Create object URLs for preview, cache generated Blobs to avoid re-rendering
    - Manage `isGenerating`, `previewUrl`, and `error` reactive states
    - Revoke all object URLs on component unmount (onUnmounted lifecycle hook)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 6.2 Write unit tests for useBadgeCanvas composable
    - Test canvas creation, blob generation, URL lifecycle, error handling, and cleanup on unmount
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Create NameInputModal component
    - Create `src/components/NameInputModal.vue` with text input, validation (max 60 chars), "Confirmar" and "Pular" buttons
    - Implement focus trap, ARIA labels (role="dialog", aria-modal, aria-labelledby), and Escape key to close
    - Emit 'confirm' with name, 'skip', and 'close' events
    - All labels in Portuguese (pt-BR)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 8.2 Write property test for name input validation
    - **Property 8: Name Input Length Validation** — Rejects names > 60 chars, accepts ≤ 60 chars
    - **Validates: Requirement 3.2**

  - [x] 8.3 Create ShareBadgeButton component
    - Create `src/components/ShareBadgeButton.vue` with generation trigger button, loading state, image preview display, and download/share action buttons (LinkedIn, Twitter/X, Download)
    - Props: `type` ('badge' | 'certificate'), optional `stage`, optional `label`
    - Emit 'generated' event with Blob
    - Integrate with `useBadgeCanvas()` composable and `imageSharer` functions
    - All labels in Portuguese (pt-BR)
    - _Requirements: 1.4, 2.5, 4.1, 4.2, 5.1, 5.2_

- [x] 9. Integrate into existing views
  - [x] 9.1 Add share badge button to StageSummary view
    - Modify `src/views/StageSummary.vue` to import and render `ShareBadgeButton` component
    - Pass current stage, stageResult score, and performance level as props
    - Position the button in the actions section after the result card
    - Use `useTheme()` composable to pass current theme to badge generation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.3, 7.1, 7.2_

  - [x] 9.2 Add certificate generation to FinalAchievement view
    - Modify `src/views/FinalAchievement.vue` to import `ShareBadgeButton`, `NameInputModal`, and `useBadgeCanvas`
    - Add "Gerar Certificado" button that opens the NameInputModal
    - On name confirmation/skip, generate certificate with full stats from quizStore
    - Display certificate preview and share/download actions
    - Use `useTheme()` composable to pass current theme
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 7.3, 7.4_

- [x] 10. Create module barrel export and final wiring
  - [x] 10.1 Create badges module index
    - Create `src/badges/index.ts` barrel file exporting all public APIs: `useBadgeCanvas`, `renderBadge`, `renderCertificate`, `downloadImage`, `shareToSocial`, `canUseWebShareAPI`, `shareViaWebAPI`, `BADGE_DESIGNS`, and all types
    - Ensure all imports across views and components use the barrel export for clean module boundaries
    - _Requirements: 8.1_

  - [x]* 10.2 Write integration tests for full badge/certificate flow
    - Test end-to-end flow: composable creates canvas → renderer draws → blob generated → download triggered
    - Test certificate flow with name input → generation → share
    - Mock CanvasRenderingContext2D for unit-testable assertions
    - _Requirements: 1.4, 2.5, 4.3, 4.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses `vitest run` for test execution and `fast-check` for property-based testing
- All user-facing text must be in Portuguese (pt-BR)
- The `useTheme()` composable is already available at `src/composables/useTheme.ts` for theme detection
- The existing `src/sharing/shareGenerator.ts` provides `generateShareText()` and `shareToLinkedIn()` which can be referenced but the new `imageSharer.ts` extends sharing with image/blob support

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "8.1", "8.3"] },
    { "id": 6, "tasks": ["8.2", "9.1", "9.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2"] }
  ]
}
```
