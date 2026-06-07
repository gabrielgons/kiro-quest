import { BADGE_DESIGNS } from './badgeDesigns';
import type { ImageShareOptions, LearningStage, PerformanceLevel } from './types';
import { copyToClipboard } from '@/sharing/shareGenerator';
import { SITE_ORIGIN } from '@/config/siteOrigin';

/**
 * Image sharing and download helpers for generated badge / certificate PNGs.
 *
 * This module extends the text-only sharing in `@/sharing/shareGenerator` with
 * image/blob support: downloading PNGs to disk, sharing image files via the
 * native Web Share API (mobile), and opening URL-based share dialogs for
 * LinkedIn and Twitter/X.
 *
 * Security (see design "Security Considerations"):
 * - Download filenames are stripped of path separator characters so a stage
 *   id (or any caller-supplied name) can never escape into a directory path
 *   (Requirement 10.2).
 * - All user-provided text is `encodeURIComponent`-encoded before being placed
 *   into social share URLs (Requirements 9.3, 10.3).
 *
 * Share text (see design "Share Text Generation"):
 * - All generated share text is in Portuguese (pt-BR) and never exceeds 280
 *   characters (Requirements 5.6, 9.4).
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2,
 * 9.3, 9.4, 10.2, 10.3_
 */

/** Maximum allowed length for any generated share text. */
export const MAX_SHARE_TEXT_LENGTH = 280;

/** Twitter / X "intent" share base URL. */
const TWITTER_SHARE_URL = 'https://twitter.com/intent/tweet';

/**
 * Documented production origin, used as the fallback when
 * `window.location.origin` is unavailable (e.g. SSR / non-browser contexts).
 * Re-exported from the centralized config for DRY compliance.
 */
const PRODUCTION_ORIGIN = SITE_ORIGIN;

/**
 * Resolve the absolute site origin used to build crawlable share URLs.
 *
 * Prefers the live `window.location.origin`; falls back to the documented
 * {@link PRODUCTION_ORIGIN} when `window` (or a usable `origin`) is
 * unavailable.
 *
 * @returns The absolute site origin (no trailing slash).
 */
function resolveShareOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
}

/**
 * Build the crawlable, non-hash share URL for a stage badge.
 *
 * Returns `${origin}/s/badge/${stage}` — a static, build-time-generated share
 * page that carries per-module Open Graph / Twitter tags so social crawlers
 * render a recognizable preview card (see design "Component 4: Client
 * share-URL builder", Property 7). The URL is generic per module and carries
 * no per-user query params.
 *
 * @param stage - The LearningStage the badge was generated for.
 * @returns The absolute `/s/badge/<stage>` share URL.
 */
export function buildBadgeShareUrl(stage: LearningStage): string {
  return `${resolveShareOrigin()}/s/badge/${stage}`;
}

/**
 * Build the crawlable, non-hash share URL for the completion certificate.
 *
 * Returns `${origin}/s/certificate` — the static certificate share page
 * (Property 7). No per-user query params.
 *
 * @returns The absolute `/s/certificate` share URL.
 */
export function buildCertificateShareUrl(): string {
  return `${resolveShareOrigin()}/s/certificate`;
}

/**
 * Remove path separator characters (`/` and `\`) from a filename so the
 * resulting name can never traverse or escape into a directory path.
 *
 * Implements Requirement 10.2 / Property 18 (Filename Path Separator
 * Stripping): the returned filename is guaranteed to contain no `/` or `\`.
 *
 * @param fileName - The raw, possibly unsafe filename.
 * @returns The filename with all path separators removed.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[/\\]/g, '');
}

/**
 * Build the canonical download filename for a stage badge.
 *
 * Follows the pattern `kiro-quest-badge-{stage-id}.png` (Requirement 4.1 /
 * Property 17) and strips any path separators for safety.
 *
 * @param stage - The LearningStage the badge was generated for.
 * @returns The sanitized badge filename.
 */
export function getBadgeFileName(stage: LearningStage): string {
  return sanitizeFileName(`kiro-quest-badge-${stage}.png`);
}

/**
 * Build the canonical download filename for the completion certificate.
 *
 * The certificate filename is constant: `kiro-quest-certificate.png`
 * (Requirement 4.2).
 *
 * @returns The certificate filename.
 */
export function getCertificateFileName(): string {
  return sanitizeFileName('kiro-quest-certificate.png');
}

/**
 * Clamp a string to {@link MAX_SHARE_TEXT_LENGTH} characters, appending an
 * ellipsis when truncation occurs. Keeps all share text within the 280-char
 * limit (Requirements 5.6, 9.4).
 *
 * @param text - The candidate share text.
 * @returns The text, truncated with an ellipsis if it exceeded the limit.
 */
function clampShareText(text: string): string {
  if (text.length <= MAX_SHARE_TEXT_LENGTH) {
    return text;
  }
  return `${text.substring(0, MAX_SHARE_TEXT_LENGTH - 3)}...`;
}

/**
 * Generate Portuguese (pt-BR) share text for a stage completion badge.
 *
 * The text includes the stage display name (from {@link BADGE_DESIGNS}) and
 * the performance level (Requirement 9.1) and is guaranteed to be at most 280
 * characters (Requirements 5.6, 9.4).
 *
 * @param stage            - The completed LearningStage.
 * @param performanceLevel - The computed performance tier label.
 * @returns The badge share text in Portuguese.
 */
export function generateBadgeShareText(
  stage: LearningStage,
  performanceLevel: PerformanceLevel,
): string {
  const { displayName } = BADGE_DESIGNS[stage];
  const text =
    `Completei a fase "${displayName}" no Kiro Quest! ` +
    `Nível: ${performanceLevel}. Teste seus conhecimentos sobre o Kiro!`;
  return clampShareText(text);
}

/**
 * Generate Portuguese (pt-BR) share text for the completion certificate.
 *
 * The text includes the overall performance level and a completion message in
 * Portuguese (Requirement 9.2) and is guaranteed to be at most 280 characters
 * (Requirements 5.6, 9.4).
 *
 * @param performanceLevel - The computed overall performance tier label.
 * @returns The certificate share text in Portuguese.
 */
export function generateCertificateShareText(
  performanceLevel: PerformanceLevel,
): string {
  const text =
    `Concluí toda a trilha Kiro Quest e ganhei meu certificado! ` +
    `Nível: ${performanceLevel}. Complete você também e teste seus ` +
    `conhecimentos sobre o Kiro!`;
  return clampShareText(text);
}

/**
 * Trigger a browser download of the given image blob.
 *
 * Creates an object URL from the blob, triggers a download via a temporary
 * anchor element, and immediately revokes the object URL to avoid memory
 * leaks (Requirements 4.3, 4.4 / Property 16). The filename is sanitized to
 * strip any path separators (Requirement 10.2).
 *
 * @param blob     - The image blob to download (expected non-zero size).
 * @param fileName - The desired filename; path separators are stripped.
 */
export function downloadImage(blob: Blob, fileName: string): void {
  const safeName = sanitizeFileName(fileName);
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Revoke immediately — the download has already been initiated and the
    // browser holds its own reference to the blob data.
    URL.revokeObjectURL(url);
  }
}

/**
 * Determine whether the native Web Share API is available with file-sharing
 * support in the current environment.
 *
 * Both `navigator.share` and `navigator.canShare` must be present; the latter
 * is what lets us verify file attachments are supported before attempting a
 * share (Requirement 5.3).
 *
 * @returns `true` if the Web Share API can be used, otherwise `false`.
 */
export function canUseWebShareAPI(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * Share an image file using the native Web Share API.
 *
 * Wraps the blob in a `File`, verifies the browser can share it, and invokes
 * `navigator.share`. Returns `false` (without surfacing an error) when the API
 * is unavailable, the data cannot be shared, or the user cancels the dialog
 * (`AbortError`) — see Requirement 5.4 and design "Web Share API Integration".
 *
 * @param blob     - The image blob to attach.
 * @param text     - The share text (<= 280 characters).
 * @param fileName - The filename for the attached file; path separators
 *                   stripped.
 * @returns A promise resolving to `true` on a successful share, else `false`.
 */
export async function shareViaWebAPI(
  blob: Blob,
  text: string,
  fileName: string,
): Promise<boolean> {
  if (!canUseWebShareAPI()) {
    return false;
  }

  const file = new File([blob], sanitizeFileName(fileName), { type: blob.type });
  const shareData: ShareData = { text, files: [file] };

  // Verify the browser can actually share this specific payload before trying.
  if (!navigator.canShare(shareData)) {
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (err) {
    // User cancellation (AbortError) is an expected outcome, not an error.
    if (err instanceof Error && err.name === 'AbortError') {
      return false;
    }
    return false;
  }
}

/**
 * Open a Twitter/X share dialog in a new window with the given pre-filled
 * text, URL-encoded.
 *
 * When `pageUrl` is provided (e.g. a crawlable `/s/...` share URL from
 * {@link buildBadgeShareUrl} / {@link buildCertificateShareUrl}) it is used as
 * the shared link so social crawlers fetch the per-module preview card.
 * Otherwise it falls back to the current page URL (`window.location.href`),
 * preserving the previous behavior.
 *
 * @param text     - The share text to pre-fill.
 * @param pageUrl  - Optional explicit URL to share; defaults to the current
 *                   page URL when omitted.
 */
function openShareWindow(
  text: string,
  pageUrl?: string,
): void {
  const resolvedPageUrl =
    pageUrl ??
    (typeof window !== 'undefined' ? window.location.href : PRODUCTION_ORIGIN);

  const shareUrl =
    `${TWITTER_SHARE_URL}?text=${encodeURIComponent(text)}` +
    `&url=${encodeURIComponent(resolvedPageUrl)}`;

  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Share a generated image to a social platform.
 *
 * Behavior by platform (see design "Function: shareToSocial()"):
 * - `'twitter'`: opens the platform share URL in a new window with
 *   URL-encoded, pre-filled text and returns `true` (Requirements 5.1, 5.2).
 * - `'generic'`: attempts the native Web Share API with the image file
 *   attached; if unavailable, falls back to copying the share text to the
 *   clipboard (Requirements 5.3, 5.5).
 *
 * LinkedIn is handled exclusively via {@link buildLinkedInAddToProfileUrl} in
 * the component layer.
 *
 * @param options - The blob, filename, share text, and target platform.
 * @returns A promise resolving to whether a share action was initiated.
 */
export async function shareToSocial(options: ImageShareOptions): Promise<boolean> {
  const { blob, fileName, shareText, platform, shareUrl } = options;

  if (platform === 'twitter') {
    openShareWindow(shareText, shareUrl);
    return true;
  }

  // Generic: prefer native Web Share API (with the image), fall back to
  // copying the share text to the clipboard.
  if (canUseWebShareAPI()) {
    const shared = await shareViaWebAPI(blob, shareText, fileName);
    if (shared) {
      return true;
    }
  }

  return copyToClipboard(shareText);
}

/** LinkedIn "Add to Profile" base URL (Certification). */
const LINKEDIN_ADD_TO_PROFILE_URL = 'https://www.linkedin.com/profile/add';

/**
 * Options for building a LinkedIn "Add to Profile" URL.
 *
 * Uses a discriminated union on `type`:
 * - `'badge'`: requires `stage` (the learning stage the badge was earned for).
 * - `'certificate'`: `stage` is not applicable.
 */
export type LinkedInAddToProfileOptions =
  | { type: 'badge'; stage: LearningStage; issueDate?: Date }
  | { type: 'certificate'; stage?: never; issueDate?: Date };

/**
 * Build a LinkedIn "Add to Profile" (Certification) URL that opens a
 * pre-filled form for the user to add the certification to their profile.
 *
 * For badges the certification name is "Kiro Quest - {displayName}" and the
 * certUrl points to the crawlable badge share page. For the certificate, the
 * name is "Kiro Quest - Certificado de Conclusao" and certUrl points to the
 * certificate share page.
 *
 * All query parameter values are URL-encoded via `encodeURIComponent`.
 *
 * @param options - Configuration specifying type, stage, and optional date.
 * @returns The fully-qualified LinkedIn Add to Profile URL.
 */
export function buildLinkedInAddToProfileUrl(options: LinkedInAddToProfileOptions): string {
  const { type, issueDate } = options;
  const date = issueDate ?? new Date();
  const issueYear = date.getFullYear().toString();
  const issueMonth = (date.getMonth() + 1).toString();

  let name: string;
  let certUrl: string;

  if (type === 'badge') {
    const { stage } = options;
    if (!stage) {
      throw new Error('stage is required when type is "badge"');
    }
    const { displayName } = BADGE_DESIGNS[stage];
    name = `Kiro Quest - ${displayName}`;
    certUrl = buildBadgeShareUrl(stage);
  } else {
    name = 'Kiro Quest - Certificado de Conclusao';
    certUrl = buildCertificateShareUrl();
  }

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name,
    organizationName: 'Kiro Quest',
    issueYear,
    issueMonth,
    certUrl,
  });

  return `${LINKEDIN_ADD_TO_PROFILE_URL}?${params.toString()}`;
}

/**
 * Object-style facade mirroring the `ImageSharer` interface in the design,
 * grouping the module's public functions for ergonomic imports.
 */
export interface ImageSharer {
  downloadImage(blob: Blob, fileName: string): void;
  shareToSocial(options: ImageShareOptions): Promise<boolean>;
  canUseWebShareAPI(): boolean;
  shareViaWebAPI(blob: Blob, text: string, fileName: string): Promise<boolean>;
}

export const imageSharer: ImageSharer = {
  downloadImage,
  shareToSocial,
  canUseWebShareAPI,
  shareViaWebAPI,
};
