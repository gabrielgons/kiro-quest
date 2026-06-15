import { describe, it, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { BADGE_DESIGNS } from '../badgeDesigns';
import type { LearningStage } from '../types';

/**
 * Property tests for the badge design configuration.
 *
 * Property 9: Badge Design Configuration Completeness and Validity
 * For any LearningStage value in the enumeration, BADGE_DESIGNS SHALL
 * contain a defined entry with a non-empty emoji icon, valid hex color
 * codes for primary and secondary colors, and a Portuguese display name
 * not exceeding 30 characters.
 *
 * Validates: Requirements 6.1, 6.2
 */

/** The complete enumeration of LearningStage values (13 total). */
const ALL_STAGES: LearningStage[] = [
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

/** Matches a 3- or 6-digit hex color code (e.g. #fff or #3b82f6). */
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

describe('Badge Design Configuration (Property 9)', () => {
  describe('Property 9: Completeness and Validity', () => {
    fcTest.prop([fc.constantFrom(...ALL_STAGES)])(
      'every LearningStage has a complete and valid BADGE_DESIGNS entry',
      (stage) => {
        const design = BADGE_DESIGNS[stage];

        // Entry is defined for the stage.
        expect(design).toBeDefined();

        // The entry's stage field matches its key.
        expect(design.stage).toBe(stage);

        // Non-empty emoji icon.
        expect(typeof design.icon).toBe('string');
        expect(design.icon.length).toBeGreaterThan(0);
        expect(design.icon.trim().length).toBeGreaterThan(0);

        // Valid hex color codes for primary and secondary colors.
        expect(design.primaryColor).toMatch(HEX_COLOR_REGEX);
        expect(design.secondaryColor).toMatch(HEX_COLOR_REGEX);

        // Non-empty Portuguese display name not exceeding 30 characters.
        expect(typeof design.displayName).toBe('string');
        expect(design.displayName.trim().length).toBeGreaterThan(0);
        expect(design.displayName.length).toBeLessThanOrEqual(30);
      }
    );
  });

  // Unit tests covering specific examples and the completeness edge case.
  describe('example-based checks', () => {
    it('defines an entry for all 13 LearningStage values', () => {
      expect(Object.keys(BADGE_DESIGNS)).toHaveLength(13);
      for (const stage of ALL_STAGES) {
        expect(BADGE_DESIGNS).toHaveProperty(stage);
      }
    });

    it('has no extra/unknown stage keys', () => {
      const knownStages = new Set<string>(ALL_STAGES);
      for (const key of Object.keys(BADGE_DESIGNS)) {
        expect(knownStages.has(key)).toBe(true);
      }
    });

    it('uses the expected design for kiro-basics', () => {
      const design = BADGE_DESIGNS['kiro-basics'];
      expect(design.icon).toBe('🚀');
      expect(design.primaryColor).toBe('#3b82f6');
      expect(design.secondaryColor).toBe('#1d4ed8');
      expect(design.displayName).toBe('Fundamentos do Kiro');
    });
  });
});
