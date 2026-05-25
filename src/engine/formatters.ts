/**
 * Formats the progress indicator for the quiz flow.
 * Displays as "{current} / {total}" where current is 1-based question number.
 *
 * Requirement 9.3: Progress indicator format
 */
export function formatProgressIndicator(current: number, total: number): string {
  return `${current} / ${total}`;
}
