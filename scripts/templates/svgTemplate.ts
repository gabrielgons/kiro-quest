import type { LearningStage } from '@/engine/types';
import type { BadgeDesign } from '@/badges/types';

/**
 * Pure SVG template builders for the static social-share preview cards.
 *
 * These functions take a learning stage and its {@link BadgeDesign} entry and
 * return a deterministic 1200x630 SVG string. They perform NO I/O and have no
 * side effects, so they are trivially unit/property testable.
 *
 * All user-facing copy is Brazilian Portuguese (pt-BR). Values originate from
 * the author-controlled `BADGE_DESIGNS` source of truth (not user input), but
 * every interpolated text value is still XML-escaped as a defense-in-depth
 * measure and to satisfy the feature's escaping correctness property.
 */

/** Open Graph card width in pixels. */
export const OG_WIDTH = 1200;
/** Open Graph card height in pixels. */
export const OG_HEIGHT = 630;

/**
 * Escape the five XML metacharacters so interpolated text can never break out
 * of an attribute value or element body.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the social-card SVG for a single module badge.
 *
 * Returns a deterministic 1200x630 SVG declaring
 * `width="1200" height="630" viewBox="0 0 1200 630"`, a linear-gradient
 * background from `design.primaryColor` to `design.secondaryColor`, the
 * `design.icon` (large, centered), the `design.displayName` (centered, white),
 * and a "Kiro Quest" wordmark. Pure — no I/O.
 */
export function buildBadgeSvg(stage: LearningStage, design: BadgeDesign): string {
  const name = xmlEscape(design.displayName);
  const icon = xmlEscape(design.icon);
  const primary = xmlEscape(design.primaryColor);
  const secondary = xmlEscape(design.secondaryColor);

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" ' +
    'viewBox="0 0 1200 630">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + primary + '"/>' +
    '<stop offset="1" stop-color="' + secondary + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="600" y="300" text-anchor="middle" font-size="180">' + icon + '</text>' +
    '<text x="600" y="430" text-anchor="middle" font-size="64" ' +
    'fill="#ffffff" font-family="sans-serif">' + name + '</text>' +
    '<text x="600" y="500" text-anchor="middle" font-size="34" ' +
    'fill="#ffffff" font-family="sans-serif">Kiro Quest</text>' +
    '</svg>'
  );
}

/**
 * Build the generic certificate social-card SVG.
 *
 * Returns a deterministic 1200x630 certificate card with pt-BR literal copy
 * ("Certificado de Conclusão" / "Kiro Quest") and NO per-user data. Pure.
 */
export function buildCertificateSvg(): string {
  const title = xmlEscape('Certificado de Conclusão');
  const wordmark = xmlEscape('Kiro Quest');
  const trophy = xmlEscape('🏆');

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" ' +
    'viewBox="0 0 1200 630">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#7c3aed"/>' +
    '<stop offset="1" stop-color="#4338ca"/>' +
    '</linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="600" y="290" text-anchor="middle" font-size="160">' + trophy + '</text>' +
    '<text x="600" y="430" text-anchor="middle" font-size="64" ' +
    'fill="#ffffff" font-family="sans-serif">' + title + '</text>' +
    '<text x="600" y="500" text-anchor="middle" font-size="34" ' +
    'fill="#ffffff" font-family="sans-serif">' + wordmark + '</text>' +
    '</svg>'
  );
}
