import type { LearningStage } from './types';

/**
 * Ordered list of all Learning Stages.
 * Single source of truth for stage progression order.
 */
export const STAGE_ORDER: LearningStage[] = [
  'kiro-basics',
  'specs',
  'feature-specs',
  'bugfix-specs',
  'steering',
  'hooks',
  'mcp',
  'powers',
  'skills',
  'real-world-workflows',
  'enterprise-scenarios',
  'kiro-cli',
  'kiro-web',
];
