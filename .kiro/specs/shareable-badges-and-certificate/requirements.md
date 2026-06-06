# Requirements Document

## Introduction

This document defines the requirements for the Shareable Badges and Certificate feature of Kiro Quest — a Portuguese (pt-BR) learning application built with Vue 3, TypeScript, and Pinia. The feature enables users to generate, download, and share achievement badges upon completing individual quiz stages, and a full completion certificate upon finishing all 11 stages. Image generation is performed client-side using the HTML5 Canvas API with no external dependencies.

## Glossary

- **Badge_Generator**: The client-side module responsible for rendering stage completion badges onto an HTML5 Canvas and producing PNG Blob output
- **Certificate_Generator**: The client-side module responsible for rendering the full completion certificate onto an HTML5 Canvas and producing PNG Blob output
- **Image_Sharer**: The module responsible for downloading generated images and sharing them to social platforms via Web Share API or URL-based sharing
- **Name_Input_Modal**: The modal dialog component that prompts the user for their name before certificate generation
- **Badge_Design_Config**: The data structure mapping each LearningStage to its visual properties (icon, colors, display name)
- **LearningStage**: One of the 11 quiz modules in the Kiro Quest application
- **Performance_Level**: A computed label indicating the user's achievement tier (Iniciante, Praticante, Especialista, or Mestre em Kiro)
- **Web_Share_API**: The browser-native sharing mechanism (navigator.share) used primarily on mobile devices
- **Canvas_Composable**: The Vue composable (useBadgeCanvas) that manages canvas lifecycle, blob generation, and cleanup

## Requirements

### Requirement 1: Stage Completion Badge Generation

**User Story:** As a learner, I want to receive a shareable badge image when I complete a quiz stage, so that I can celebrate and share my achievement on social media.

#### Acceptance Criteria

1. WHEN a user completes a quiz stage, THE Badge_Generator SHALL render a 400×400 pixel PNG badge image using the HTML5 Canvas API
2. WHEN rendering a badge, THE Badge_Generator SHALL display the stage-specific icon, stage display name, score (correct/total), performance level, and "Kiro Quest" branding
3. WHEN rendering a badge, THE Badge_Generator SHALL apply a linear gradient background using the stage-specific primary and secondary colors from Badge_Design_Config
4. WHEN a valid LearningStage and score (where correct ≤ total and total > 0) are provided, THE Badge_Generator SHALL return a non-null PNG Blob
5. IF the Canvas 2D context is unavailable, THEN THE Badge_Generator SHALL return null and the UI SHALL display a fallback message offering text-only sharing

### Requirement 2: Full Completion Certificate Generation

**User Story:** As a learner who has completed all stages, I want to receive a personalized completion certificate, so that I can showcase my full achievement on professional networks.

#### Acceptance Criteria

1. WHEN all 11 stages are completed, THE Certificate_Generator SHALL render a 1200×800 pixel PNG certificate image in landscape orientation
2. WHEN rendering a certificate, THE Certificate_Generator SHALL display "Certificado de Conclusão" as the title, the user's name, a completion message in Portuguese, overall score statistics, performance level, completion date formatted in pt-BR locale, and "Kiro Quest" branding
3. WHEN the user provides a name (non-empty after trimming), THE Certificate_Generator SHALL display that name on the certificate
4. WHEN the user name is empty or whitespace-only, THE Certificate_Generator SHALL display "Um(a) Desbravador(a)" as the fallback name
5. WHEN valid certificate statistics are provided (completedStages equals 11, totalCorrect ≤ totalQuestions), THE Certificate_Generator SHALL return a non-null PNG Blob
6. IF the Canvas 2D context is unavailable, THEN THE Certificate_Generator SHALL return null and the UI SHALL display a fallback message

### Requirement 3: Name Input for Certificate Personalization

**User Story:** As a learner, I want the option to enter my name for the certificate, so that I can personalize it without being forced to provide personal information.

#### Acceptance Criteria

1. WHEN the user initiates certificate generation, THE Name_Input_Modal SHALL appear with a text input field for the user's name
2. WHEN the user enters a name, THE Name_Input_Modal SHALL validate that the name does not exceed 60 characters
3. WHEN the user clicks "Skip" or dismisses the modal, THE Name_Input_Modal SHALL emit a skip event and certificate generation SHALL proceed with an empty name
4. WHEN the user confirms a valid name, THE Name_Input_Modal SHALL emit a confirm event with the entered name
5. WHILE the Name_Input_Modal is open, THE Name_Input_Modal SHALL trap focus within the modal, provide proper ARIA labels, and close when the Escape key is pressed

### Requirement 4: Image Download

**User Story:** As a learner, I want to download my badges and certificates as PNG files, so that I can save them locally and share them anywhere.

#### Acceptance Criteria

1. WHEN the user clicks the download button for a badge, THE Image_Sharer SHALL trigger a browser download with filename pattern "kiro-quest-badge-{stage-id}.png"
2. WHEN the user clicks the download button for a certificate, THE Image_Sharer SHALL trigger a browser download with filename "kiro-quest-certificate.png"
3. WHEN triggering a download, THE Image_Sharer SHALL create an object URL from the Blob, trigger the download, and immediately revoke the object URL to prevent memory leaks
4. WHEN a valid Blob with non-zero size is provided, THE Image_Sharer SHALL successfully trigger the download without throwing exceptions

### Requirement 5: Social Media Sharing

**User Story:** As a learner, I want to share my badges and certificates directly to LinkedIn and Twitter, so that I can showcase my achievements to my professional network with minimal friction.

#### Acceptance Criteria

1. WHEN the user selects LinkedIn sharing, THE Image_Sharer SHALL open the LinkedIn share URL in a new window with pre-filled, URL-encoded share text
2. WHEN the user selects Twitter sharing, THE Image_Sharer SHALL open the Twitter/X share URL in a new window with pre-filled, URL-encoded share text
3. WHEN the Web Share API is available and supports file sharing, THE Image_Sharer SHALL offer native sharing using navigator.share with the image file attached
4. IF the user cancels the Web Share dialog (AbortError), THEN THE Image_Sharer SHALL return false without displaying an error message
5. IF the Web Share API is unavailable, THEN THE Image_Sharer SHALL fall back to URL-based sharing for LinkedIn/Twitter or clipboard copy for generic sharing
6. THE Image_Sharer SHALL ensure all share text does not exceed 280 characters

### Requirement 6: Badge Design Configuration

**User Story:** As a learner, I want each stage badge to have a unique and recognizable visual identity, so that I can distinguish my achievements across different modules.

#### Acceptance Criteria

1. THE Badge_Design_Config SHALL define a unique design entry for each of the 11 LearningStage values
2. THE Badge_Design_Config SHALL specify for each stage: a valid emoji icon, a primary hex color, a secondary hex color, and a display name in Portuguese not exceeding 30 characters
3. WHEN a badge is rendered for any valid LearningStage, THE Badge_Generator SHALL use the corresponding entry from Badge_Design_Config for visual styling

### Requirement 7: Theme Support

**User Story:** As a learner, I want badges and certificates to respect my chosen light or dark theme, so that generated images match my visual preference.

#### Acceptance Criteria

1. WHEN the current app theme is "dark", THE Badge_Generator SHALL render the badge with dark-appropriate overlay and contrast
2. WHEN the current app theme is "light", THE Badge_Generator SHALL render the badge with light-appropriate overlay and contrast
3. WHEN the current app theme is "dark", THE Certificate_Generator SHALL render the certificate with a dark background and light text
4. WHEN the current app theme is "light", THE Certificate_Generator SHALL render the certificate with a white background and dark text

### Requirement 8: Canvas Composable Lifecycle Management

**User Story:** As a developer, I want the canvas composable to manage resources correctly, so that the feature does not cause memory leaks or stale state.

#### Acceptance Criteria

1. WHEN generating an image, THE Canvas_Composable SHALL create an offscreen canvas, invoke the appropriate renderer, and convert the result to a PNG Blob
2. WHEN an image has been generated, THE Canvas_Composable SHALL create an object URL for preview and cache the Blob to avoid re-rendering on repeated preview or share actions
3. WHEN the component using the Canvas_Composable unmounts, THE Canvas_Composable SHALL revoke all created object URLs
4. WHILE image generation is in progress, THE Canvas_Composable SHALL set the isGenerating state to true and reset it to false upon completion or failure
5. IF image generation fails, THEN THE Canvas_Composable SHALL set the error state with a descriptive message and return null

### Requirement 9: Share Text Generation

**User Story:** As a learner, I want the share text to be pre-filled with relevant achievement information in Portuguese, so that my social media posts are informative without requiring manual editing.

#### Acceptance Criteria

1. WHEN generating share text for a badge, THE Image_Sharer SHALL include the stage display name and performance level in Portuguese
2. WHEN generating share text for a certificate, THE Image_Sharer SHALL include the overall performance level and a completion message in Portuguese
3. THE Image_Sharer SHALL ensure all generated share text is URL-encoded before being passed to social media share URLs
4. THE Image_Sharer SHALL ensure all generated share text does not exceed 280 characters

### Requirement 10: Security and Input Safety

**User Story:** As a developer, I want all user-provided input to be handled safely, so that the feature is secure against injection attacks.

#### Acceptance Criteria

1. WHEN rendering user-provided text on canvas, THE Badge_Generator and Certificate_Generator SHALL use Canvas fillText which renders text as pixels, inherently preventing XSS
2. WHEN generating download filenames, THE Image_Sharer SHALL strip any path separator characters from the filename
3. WHEN constructing social share URLs, THE Image_Sharer SHALL apply encodeURIComponent to all user-provided text parameters
