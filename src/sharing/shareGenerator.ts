import type { ShareableResult } from './types';
import { formatScore } from '@/engine/scoring';

/**
 * LinkedIn share base URL.
 */
const LINKEDIN_SHARE_URL = 'https://www.linkedin.com/sharing/share-offsite/';

/**
 * Generates share text for a quiz result.
 * - Contains score in "X/Y" format
 * - Contains stage name
 * - Contains performance level (if available)
 * - Max 280 characters
 * - No personally identifiable information
 * - Text in Portuguese
 *
 * Requirements: 8.2, 8.3, 8.4
 */
export function generateShareText(result: ShareableResult): string {
  const score = formatScore(result.correctCount, result.totalCount);

  let text: string;

  if (result.isFullQuizComplete && result.performanceLevel) {
    text = `Completei o Kiro Quest! Meu resultado: ${score} - Nível: ${result.performanceLevel}. Teste seus conhecimentos sobre o Kiro!`;
  } else if (result.performanceLevel) {
    text = `Completei a fase "${result.stageName}" no Kiro Quest! Resultado: ${score} - Nível: ${result.performanceLevel}. Teste seus conhecimentos sobre o Kiro!`;
  } else {
    text = `Completei a fase "${result.stageName}" no Kiro Quest! Resultado: ${score}. Teste seus conhecimentos sobre o Kiro!`;
  }

  // Ensure max 280 chars
  if (text.length > 280) {
    text = text.substring(0, 277) + '...';
  }

  return text;
}

/**
 * Opens LinkedIn share dialog with the given text.
 * Uses window.open to navigate to LinkedIn's share URL.
 *
 * Requirement 8.1: LinkedIn sharing
 */
export function shareToLinkedIn(text: string): void {
  const url = `${LINKEDIN_SHARE_URL}?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Copies text to clipboard as a fallback sharing mechanism.
 * Uses the Clipboard API.
 *
 * Requirement 8.5: Clipboard fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or permission denied
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export interface ShareGenerator {
  generateShareText(result: ShareableResult): string;
  shareToLinkedIn(text: string): void;
  copyToClipboard(text: string): Promise<boolean>;
}

export const shareGenerator: ShareGenerator = {
  generateShareText,
  shareToLinkedIn,
  copyToClipboard,
};
