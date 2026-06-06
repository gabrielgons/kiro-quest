/**
 * Public barrel export for the Shareable Badges and Certificate module.
 *
 * This is the single, stable entry point for the badges feature. Views,
 * components, and tests should import everything they need from `@/badges`
 * rather than reaching into individual module files, keeping the feature's
 * module boundary clean and cohesive.
 *
 * Surface (see design "Components and Interfaces"):
 * - Composable: {@link useBadgeCanvas} for canvas lifecycle + blob generation.
 * - Renderers: {@link renderBadge}, {@link renderCertificate}.
 * - Sharing: {@link downloadImage}, {@link shareToSocial},
 *   {@link canUseWebShareAPI}, {@link shareViaWebAPI}, plus share-text and
 *   filename helpers.
 * - Configuration: {@link BADGE_DESIGNS}.
 * - Dimension / constant exports and all shared types.
 *
 * _Requirements: 8.1_
 */

// --- Composable -------------------------------------------------------------
export { useBadgeCanvas } from './useBadgeCanvas';

// --- Renderers --------------------------------------------------------------
export { renderBadge, BADGE_WIDTH, BADGE_HEIGHT } from './badgeRenderer';
export {
  renderCertificate,
  CERTIFICATE_WIDTH,
  CERTIFICATE_HEIGHT,
  FALLBACK_NAME,
} from './certificateRenderer';

// --- Badge design configuration --------------------------------------------
export { BADGE_DESIGNS } from './badgeDesigns';

// --- Image download & sharing ----------------------------------------------
export {
  downloadImage,
  shareToSocial,
  canUseWebShareAPI,
  shareViaWebAPI,
  generateBadgeShareText,
  generateCertificateShareText,
  getBadgeFileName,
  getCertificateFileName,
  sanitizeFileName,
  imageSharer,
  MAX_SHARE_TEXT_LENGTH,
} from './imageSharer';
export type { ImageSharer } from './imageSharer';

// --- Canvas utilities -------------------------------------------------------
export {
  roundedRect,
  canvasToBlob,
  createCanvas,
  drawCenteredText,
  createDiagonalGradient,
  DEFAULT_IMAGE_TYPE,
  DEFAULT_IMAGE_QUALITY,
} from './canvasUtils';

// --- Types ------------------------------------------------------------------
export type {
  BadgeDesign,
  BadgeRendererOptions,
  CertificateRendererOptions,
  CertificateStats,
  ImageShareOptions,
  UseBadgeCanvasReturn,
  LearningStage,
  PerformanceLevel,
} from './types';
