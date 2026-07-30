/**
 * Backend allowlist for the quiz stages and their current question counts.
 *
 * Keep this catalog aligned with content/questions/<locale>/*.json. The API uses
 * it to reject arbitrary partition keys and progress states that the frontend
 * could never produce.
 */
export const STAGE_QUESTION_COUNTS = {
  'kiro-basics': 4,
  specs: 4,
  'feature-specs': 4,
  'bugfix-specs': 4,
  steering: 4,
  hooks: 4,
  mcp: 3,
  powers: 3,
  skills: 3,
  'real-world-workflows': 3,
  'enterprise-scenarios': 3,
  'kiro-cli': 7,
  'kiro-web': 7,
  'chat-modes': 8,
  'custom-agents': 6,
  'editor-tools': 8,
  automations: 6,
  'privacy-security': 6,
} as const;

export type StageId = keyof typeof STAGE_QUESTION_COUNTS;

export function isStageId(value: unknown): value is StageId {
  return (
    typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(STAGE_QUESTION_COUNTS, value)
  );
}
