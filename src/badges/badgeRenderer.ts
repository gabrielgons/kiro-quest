import { BADGE_DESIGNS } from './badgeDesigns';
import {
  createDiagonalGradient,
  drawCenteredText,
  roundedRect,
} from './canvasUtils';
import type { BadgeRendererOptions } from './types';

/**
 * The badge canvas dimensions in pixels. Badges are square and sized for
 * social-media thumbnails (see design "Badge Dimensions": 400x400).
 */
export const BADGE_WIDTH = 400;
export const BADGE_HEIGHT = 400;

/**
 * Render a stage completion badge onto the provided 2D canvas context.
 *
 * Draws (in order):
 * 1. A rounded-rectangle gradient background using the stage's primary and
 *    secondary colors from {@link BADGE_DESIGNS}.
 * 2. A theme-aware semi-transparent overlay for depth.
 * 3. The stage emoji icon.
 * 4. The stage display name.
 * 5. The score as "correct/total".
 * 6. The performance level label.
 * 7. The "Kiro Quest" branding footer.
 *
 * This implements the design's "Badge Rendering Algorithm" and relies on the
 * shared canvas primitives in `canvasUtils`. Because all text is drawn via
 * `fillText`, user-influenced strings are rendered as pixels, inherently
 * preventing XSS (Requirement 10.1).
 *
 * Preconditions:
 * - `ctx` is a valid 2D canvas rendering context backed by a 400x400 canvas.
 * - `options.stage` is a valid LearningStage key present in BADGE_DESIGNS.
 * - `options.score.correct` <= `options.score.total`.
 * - `options.score.total` > 0.
 *
 * Postconditions:
 * - The canvas contains a fully rendered 400x400 badge with the stage icon,
 *   display name, score, performance level, and "Kiro Quest" branding.
 *
 * _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_
 *
 * @param ctx     - The 2D rendering context to draw onto.
 * @param options - The stage, score, performance level, and theme to render.
 */
export function renderBadge(
  ctx: CanvasRenderingContext2D,
  options: BadgeRendererOptions,
): void {
  const { stage, score, performanceLevel, theme } = options;
  const design = BADGE_DESIGNS[stage];

  // Step 1: Draw rounded-rectangle gradient background using the stage's
  // primary/secondary colors (Requirement 1.3).
  const gradient = createDiagonalGradient(
    ctx,
    BADGE_WIDTH,
    BADGE_HEIGHT,
    design.primaryColor,
    design.secondaryColor,
  );
  roundedRect(ctx, 0, 0, BADGE_WIDTH, BADGE_HEIGHT, 24);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Step 2: Draw theme-aware semi-transparent overlay for depth
  // (Requirements 7.1, 7.2).
  ctx.fillStyle =
    theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
  roundedRect(ctx, 16, 16, BADGE_WIDTH - 32, BADGE_HEIGHT - 32, 16);
  ctx.fill();

  // All remaining text is horizontally centered around the badge's midline.
  const centerX = BADGE_WIDTH / 2;

  // Step 3: Draw the stage icon (emoji). The middle baseline keeps the large
  // glyph visually centered on its target y position.
  ctx.textBaseline = 'middle';
  drawCenteredText(ctx, design.icon, centerX, 120, '72px serif', '#ffffff');

  // Subsequent text uses the alphabetic baseline for predictable layout.
  ctx.textBaseline = 'alphabetic';

  // Step 4: Draw the stage display name.
  drawCenteredText(
    ctx,
    design.displayName,
    centerX,
    200,
    'bold 24px system-ui, sans-serif',
    '#ffffff',
  );

  // Step 5: Draw the score as "correct/total".
  drawCenteredText(
    ctx,
    `${score.correct}/${score.total}`,
    centerX,
    270,
    'bold 48px system-ui, sans-serif',
    '#ffffff',
  );

  // Step 6: Draw the performance level label.
  drawCenteredText(
    ctx,
    performanceLevel,
    centerX,
    320,
    '18px system-ui, sans-serif',
    'rgba(255, 255, 255, 0.9)',
  );

  // Step 7: Draw the "Kiro Quest" branding footer.
  drawCenteredText(
    ctx,
    'Kiro Quest',
    centerX,
    370,
    '14px system-ui, sans-serif',
    'rgba(255, 255, 255, 0.7)',
  );
}
