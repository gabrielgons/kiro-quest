/**
 * Certificate renderer for the Shareable Badges and Certificate feature.
 *
 * Draws the full Kiro Quest completion certificate onto a 1200x800
 * (landscape) HTML5 Canvas. The implementation follows the design document's
 * "Certificate Rendering Algorithm" section, delegating shared drawing
 * primitives to `canvasUtils`.
 *
 * Because all text is drawn via `fillText` (through `drawCenteredText`), any
 * user-provided string (e.g. the entered name) is rendered as pixels and is
 * inherently safe from XSS (see Requirement 10.1).
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4, 7.3, 7.4_
 */

import type { CertificateRendererOptions } from './types';
import { drawCenteredText, roundedRect } from './canvasUtils';
import { STAGE_ORDER } from '@/engine/stages';

/** Fixed certificate width in pixels (landscape). */
export const CERTIFICATE_WIDTH = 1200;
/** Fixed certificate height in pixels (landscape). */
export const CERTIFICATE_HEIGHT = 800;

/** Fallback name shown when the user skips/omits name entry (pt-BR). */
export const FALLBACK_NAME = 'Um(a) Desbravador(a)';

/** Total number of stages in the Kiro Quest trail. */
const TOTAL_STAGES = STAGE_ORDER.length;

/**
 * Render the full completion certificate onto the provided 2D context.
 *
 * Preconditions (see design "Certificate Rendering Algorithm"):
 * - `ctx` is a valid 2D canvas rendering context whose canvas dimensions are
 *   at least 1200x800.
 * - `options.stats.completedStages` === TOTAL_STAGES (all stages).
 * - `options.stats.totalCorrect` <= `options.stats.totalQuestions`.
 * - `options.completionDate` is a valid Date object.
 *
 * Postconditions:
 * - The canvas contains a fully rendered certificate.
 * - If `userName` is empty/whitespace-only, the generic fallback
 *   "Um(a) Desbravador(a)" is displayed.
 * - All text is horizontally centered and legible against the themed
 *   background.
 *
 * @param ctx     - A valid 2D canvas rendering context (>= 1200x800).
 * @param options - The certificate content and theme to render.
 */
export function renderCertificate(
  ctx: CanvasRenderingContext2D,
  options: CertificateRendererOptions,
): void {
  const { userName, stats, performanceLevel, completionDate, theme, localizedPerformanceLevel, localizedLabels } = options;
  const WIDTH = CERTIFICATE_WIDTH;
  const HEIGHT = CERTIFICATE_HEIGHT;
  const isDark = theme === 'dark';

  // Theme-dependent palette (see Requirements 7.3, 7.4).
  const backgroundColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#1f2937';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const footerColor = isDark ? '#6b7280' : '#9ca3af';
  const accentColor = '#3b82f6';
  const borderColor = '#d4a853';

  // Center baseline used by every centered text element.
  ctx.textBaseline = 'alphabetic';
  const centerX = WIDTH / 2;

  // Step 1: Fill background.
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Step 2: Draw decorative double-line gold border.
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  roundedRect(ctx, 20, 20, WIDTH - 40, HEIGHT - 40, 12);
  ctx.stroke();
  ctx.lineWidth = 2;
  roundedRect(ctx, 36, 36, WIDTH - 72, HEIGHT - 72, 8);
  ctx.stroke();

  // Step 3: Draw title.
  drawCenteredText(
    ctx,
    localizedLabels?.title ?? 'Certificado de Conclusão',
    centerX,
    120,
    'bold 42px system-ui, sans-serif',
    textColor,
  );

  // Step 4: Draw decorative line under the title.
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - 150, 145);
  ctx.lineTo(centerX + 150, 145);
  ctx.stroke();

  // Step 5: Draw "certifies that" lead-in text.
  drawCenteredText(
    ctx,
    localizedLabels?.certifiesThat ?? 'Certifica que',
    centerX,
    200,
    '20px system-ui, sans-serif',
    mutedColor,
  );

  // Step 6: Draw user name (or generic fallback when empty/whitespace).
  const displayName = userName.trim() || FALLBACK_NAME;
  drawCenteredText(
    ctx,
    displayName,
    centerX,
    260,
    'bold 36px system-ui, sans-serif',
    accentColor,
  );

  // Step 7: Draw completion message.
  drawCenteredText(
    ctx,
    localizedLabels?.completionMessage ?? 'completou a trilha Kiro Quest com sucesso!',
    centerX,
    320,
    '22px system-ui, sans-serif',
    textColor,
  );

  // Step 8: Draw stats section.
  const statsFont = '18px system-ui, sans-serif';
  const resultLabel = localizedLabels?.resultLabel ?? 'Resultado';
  const levelLabel = localizedLabels?.levelLabel ?? 'Nível';
  const modulesLabel = localizedLabels?.modulesLabel ?? 'Módulos completados';
  drawCenteredText(
    ctx,
    `${resultLabel}: ${stats.totalCorrect}/${stats.totalQuestions} (${stats.percentage}%)`,
    centerX,
    400,
    statsFont,
    mutedColor,
  );
  drawCenteredText(
    ctx,
    `${levelLabel}: ${localizedPerformanceLevel ?? performanceLevel}`,
    centerX,
    435,
    statsFont,
    mutedColor,
  );
  drawCenteredText(
    ctx,
    `${modulesLabel}: ${stats.completedStages}/${TOTAL_STAGES}`,
    centerX,
    470,
    statsFont,
    mutedColor,
  );

  // Step 9: Draw completion date formatted in the user's locale.
  // Enforce the design precondition that `completionDate` must not be in the
  // future: if a future date slips in from an external source, clamp it to now.
  const effectiveDate =
    completionDate.getTime() > Date.now() ? new Date() : completionDate;
  const dateLocale = localizedLabels?.locale ?? 'pt-BR';
  const dateStr = effectiveDate.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dateLabel = localizedLabels?.dateLabel ?? 'Data';
  drawCenteredText(
    ctx,
    `${dateLabel}: ${dateStr}`,
    centerX,
    540,
    '16px system-ui, sans-serif',
    mutedColor,
  );

  // Step 10: Draw branding.
  drawCenteredText(
    ctx,
    '🏆 Kiro Quest',
    centerX,
    700,
    'bold 24px system-ui, sans-serif',
    accentColor,
  );
  drawCenteredText(
    ctx,
    localizedLabels?.brandingSubtitle ?? 'Trilha de Aprendizado Kiro',
    centerX,
    730,
    '14px system-ui, sans-serif',
    footerColor,
  );
}
