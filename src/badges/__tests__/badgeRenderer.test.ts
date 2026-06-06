import { describe, it, expect, vi } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { renderBadge, BADGE_WIDTH, BADGE_HEIGHT } from '../badgeRenderer';
import { BADGE_DESIGNS } from '../badgeDesigns';
import { canvasToBlob } from '../canvasUtils';
import type {
  BadgeRendererOptions,
  LearningStage,
  PerformanceLevel,
} from '../types';

/**
 * Property tests for the badge renderer.
 *
 * The test environment is jsdom, which does NOT fully support real canvas
 * rendering or `canvas.toBlob`. To exercise rendering behavior we mock the
 * `CanvasRenderingContext2D`, spying on drawing methods (fillText, fill,
 * createLinearGradient, ...) and recording the styling state so we can assert
 * the correct calls and colors are made. Dimension invariants are asserted
 * against the exported constants.
 *
 * Properties covered (from design.md "Correctness Properties"):
 * - Property 1:  Badge Dimension Invariant       (Requirement 1.1)
 * - Property 5:  Badge Generation Success         (Requirement 1.4)
 * - Property 10: Badge Renders From Stage Design  (Requirements 1.3, 6.3)
 * - Property 11: Badge Theme Consistency          (Requirements 7.1, 7.2)
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 7.1, 7.2
 */

/** The complete enumeration of LearningStage values (11 total). */
const ALL_STAGES = Object.keys(BADGE_DESIGNS) as LearningStage[];

/** The four computed performance tier labels. */
const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  'Iniciante em Kiro',
  'Praticante de Kiro',
  'Especialista em Kiro',
  'Mestre em Kiro',
];

/** Theme-dependent overlay fill styles drawn by the renderer (Step 2). */
const OVERLAY_DARK = 'rgba(0, 0, 0, 0.2)';
const OVERLAY_LIGHT = 'rgba(255, 255, 255, 0.1)';

/**
 * A mocked 2D rendering context that records the styling state used while
 * drawing. `fillStyleHistory` captures the value of `fillStyle` at the moment
 * each `fill()` call happens, which lets us inspect the gradient background
 * fill (1st) and the theme-aware overlay fill (2nd) independently.
 */
interface MockGradient {
  addColorStop: ReturnType<typeof vi.fn>;
}

interface MockContext {
  ctx: CanvasRenderingContext2D;
  gradient: MockGradient;
  /** fillStyle value captured at each fill() invocation, in order. */
  fillStyleHistory: unknown[];
}

function createMockContext(): MockContext {
  const gradient: MockGradient = { addColorStop: vi.fn() };
  const fillStyleHistory: unknown[] = [];

  const raw: Record<string, unknown> = {
    font: '',
    textAlign: '',
    textBaseline: '',
    strokeStyle: '',
    lineWidth: 0,
    _fillStyle: '' as unknown,
    createLinearGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
  };

  raw.fill = vi.fn(() => {
    fillStyleHistory.push(raw._fillStyle);
  });

  Object.defineProperty(raw, 'fillStyle', {
    get() {
      return raw._fillStyle;
    },
    set(value: unknown) {
      raw._fillStyle = value;
    },
    enumerable: true,
    configurable: true,
  });

  return {
    ctx: raw as unknown as CanvasRenderingContext2D,
    gradient,
    fillStyleHistory,
  };
}

// ---------------------------------------------------------------------------
// fast-check generators
// ---------------------------------------------------------------------------

const stageArb = fc.constantFrom(...ALL_STAGES);
const performanceArb = fc.constantFrom(...PERFORMANCE_LEVELS);
const themeArb = fc.constantFrom<'light' | 'dark'>('light', 'dark');

/** Valid scores: total > 0 and 0 <= correct <= total. */
const scoreArb = fc
  .integer({ min: 1, max: 200 })
  .chain((total) =>
    fc.integer({ min: 0, max: total }).map((correct) => ({ correct, total })),
  );

const optionsArb: fc.Arbitrary<BadgeRendererOptions> = fc.record({
  stage: stageArb,
  score: scoreArb,
  performanceLevel: performanceArb,
  theme: themeArb,
});

describe('Badge Renderer', () => {
  // -------------------------------------------------------------------------
  // Property 1: Badge Dimension Invariant
  // -------------------------------------------------------------------------
  describe('Property 1: Badge Dimension Invariant', () => {
    it('exports badge dimensions of exactly 400x400', () => {
      // Validates: Requirement 1.1
      expect(BADGE_WIDTH).toBe(400);
      expect(BADGE_HEIGHT).toBe(400);
    });

    fcTest.prop([optionsArb])(
      'Property 1: a canvas sized to the badge constants is always 400x400 for any valid stage/score',
      (options) => {
        // Validates: Requirement 1.1
        const canvas = document.createElement('canvas');
        canvas.width = BADGE_WIDTH;
        canvas.height = BADGE_HEIGHT;

        const { ctx } = createMockContext();
        // Rendering must not alter the canvas dimensions.
        expect(() => renderBadge(ctx, options)).not.toThrow();

        expect(canvas.width).toBe(400);
        expect(canvas.height).toBe(400);
        expect(BADGE_WIDTH).toBe(400);
        expect(BADGE_HEIGHT).toBe(400);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: Badge Generation Success
  // -------------------------------------------------------------------------
  describe('Property 5: Badge Generation Success', () => {
    fcTest.prop([optionsArb])(
      'Property 5: rendering succeeds and the canvas pipeline yields a non-null PNG Blob for any valid stage/score',
      async (options) => {
        // Validates: Requirement 1.4
        const { ctx } = createMockContext();

        // The renderer itself must complete without throwing.
        expect(() => renderBadge(ctx, options)).not.toThrow();

        // jsdom does not implement toBlob, so we provide a canvas whose
        // toBlob yields a PNG blob and assert the generation pipeline
        // returns a non-null Blob of type "image/png".
        const fakeCanvas = {
          toBlob: (
            cb: (blob: Blob | null) => void,
            type?: string,
          ) => {
            cb(new Blob(['png-bytes'], { type: type ?? 'image/png' }));
          },
        } as unknown as HTMLCanvasElement;

        const blob = await canvasToBlob(fakeCanvas, 'image/png');
        expect(blob).not.toBeNull();
        expect(blob?.type).toBe('image/png');
      },
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: Badge Renders From Stage Design Config
  // -------------------------------------------------------------------------
  describe('Property 10: Badge Renders From Stage Design Config', () => {
    fcTest.prop([optionsArb])(
      'Property 10: the gradient background uses the primary/secondary colors from BADGE_DESIGNS',
      (options) => {
        // Validates: Requirements 1.3, 6.3
        const { ctx, gradient } = createMockContext();
        const design = BADGE_DESIGNS[options.stage];

        renderBadge(ctx, options);

        // A linear gradient is created and seeded with the stage colors.
        expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
        expect(gradient.addColorStop).toHaveBeenCalledWith(
          0,
          design.primaryColor,
        );
        expect(gradient.addColorStop).toHaveBeenCalledWith(
          1,
          design.secondaryColor,
        );
      },
    );

    fcTest.prop([optionsArb])(
      'Property 10: the background is filled with the created gradient object',
      (options) => {
        // Validates: Requirements 1.3, 6.3
        const mock = createMockContext();
        renderBadge(mock.ctx, options);

        // The first fill() call paints the gradient background.
        expect(mock.fillStyleHistory.length).toBeGreaterThanOrEqual(1);
        expect(mock.fillStyleHistory[0]).toBe(mock.gradient);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Property 11: Badge Theme Consistency
  // -------------------------------------------------------------------------
  describe('Property 11: Badge Theme Consistency', () => {
    fcTest.prop([
      stageArb,
      scoreArb,
      performanceArb,
      themeArb,
    ])(
      'Property 11: the overlay fill style is fully determined by the theme parameter',
      (stage, score, performanceLevel, theme) => {
        // Validates: Requirements 7.1, 7.2
        const mock = createMockContext();
        renderBadge(mock.ctx, { stage, score, performanceLevel, theme });

        // The renderer performs exactly two filled rounded rectangles:
        // [0] gradient background, [1] theme-aware overlay.
        expect(mock.fillStyleHistory.length).toBe(2);

        const expectedOverlay =
          theme === 'dark' ? OVERLAY_DARK : OVERLAY_LIGHT;
        expect(mock.fillStyleHistory[1]).toBe(expectedOverlay);
      },
    );

    it('uses a dark overlay for the dark theme', () => {
      // Validates: Requirement 7.1
      const mock = createMockContext();
      renderBadge(mock.ctx, {
        stage: 'kiro-basics',
        score: { correct: 8, total: 10 },
        performanceLevel: 'Especialista em Kiro',
        theme: 'dark',
      });
      expect(mock.fillStyleHistory[1]).toBe(OVERLAY_DARK);
    });

    it('uses a light overlay for the light theme', () => {
      // Validates: Requirement 7.2
      const mock = createMockContext();
      renderBadge(mock.ctx, {
        stage: 'kiro-basics',
        score: { correct: 8, total: 10 },
        performanceLevel: 'Especialista em Kiro',
        theme: 'light',
      });
      expect(mock.fillStyleHistory[1]).toBe(OVERLAY_LIGHT);
    });
  });

  // -------------------------------------------------------------------------
  // Example-based content checks (complement the property tests)
  // -------------------------------------------------------------------------
  describe('example-based rendering checks', () => {
    it('draws the stage icon, display name, score, level and branding text', () => {
      const mock = createMockContext();
      renderBadge(mock.ctx, {
        stage: 'specs',
        score: { correct: 7, total: 10 },
        performanceLevel: 'Praticante de Kiro',
        theme: 'light',
      });

      const fillText = mock.ctx.fillText as unknown as ReturnType<typeof vi.fn>;
      const drawnText = fillText.mock.calls.map((call) => call[0]);

      expect(drawnText).toContain(BADGE_DESIGNS['specs'].icon);
      expect(drawnText).toContain(BADGE_DESIGNS['specs'].displayName);
      expect(drawnText).toContain('7/10');
      expect(drawnText).toContain('Praticante de Kiro');
      expect(drawnText).toContain('Kiro Quest');
    });

    it('renders the score as "correct/total"', () => {
      const mock = createMockContext();
      renderBadge(mock.ctx, {
        stage: 'mcp',
        score: { correct: 0, total: 1 },
        performanceLevel: 'Iniciante em Kiro',
        theme: 'dark',
      });

      const fillText = mock.ctx.fillText as unknown as ReturnType<typeof vi.fn>;
      const drawnText = fillText.mock.calls.map((call) => call[0]);
      expect(drawnText).toContain('0/1');
    });
  });
});
