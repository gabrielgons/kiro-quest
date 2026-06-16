/**
 * Property-based and unit tests for the certificate renderer.
 *
 * Implements Task 3.2 of the "Shareable Badges and Certificate" spec, covering:
 * - Property 2: Certificate Dimension Invariant — canvas is always 1200×800
 * - Property 6: Certificate Generation Success — non-null PNG Blob for valid inputs
 * - Property 7: Certificate Name Display — trimmed non-empty name, else fallback
 * - Property 12: Certificate Theme Consistency — dark vs light bg/text colors
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.3, 7.4
 *
 * The jsdom test environment does not provide a real Canvas 2D implementation,
 * so we use a lightweight mock CanvasRenderingContext2D that records the
 * drawing calls (fillRect / fillText) together with the active fillStyle and
 * font. Assertions are made against these recorded calls.
 */

import { describe, it, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';

import {
  renderCertificate,
  CERTIFICATE_WIDTH,
  CERTIFICATE_HEIGHT,
  FALLBACK_NAME,
} from '../certificateRenderer';
import { canvasToBlob } from '../canvasUtils';
import type { CertificateRendererOptions } from '../types';
import type { PerformanceLevel } from '@/engine/types';

// ---------------------------------------------------------------------------
// Mock canvas context
// ---------------------------------------------------------------------------

interface FillRectCall {
  x: number;
  y: number;
  width: number;
  height: number;
  fillStyle: string;
}

interface FillTextCall {
  text: string;
  x: number;
  y: number;
  fillStyle: string;
  font: string;
  textAlign: string;
}

/**
 * Minimal mock of the subset of CanvasRenderingContext2D used by the
 * certificate renderer (and the shared canvas utilities it calls). Records
 * fillRect and fillText invocations along with the styling state active at
 * the moment of the call.
 */
class MockCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  font = '';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  lineWidth = 1;

  fillRectCalls: FillRectCall[] = [];
  fillTextCalls: FillTextCall[] = [];

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fillRectCalls.push({
      x,
      y,
      width,
      height,
      fillStyle: String(this.fillStyle),
    });
  }

  fillText(text: string, x: number, y: number): void {
    this.fillTextCalls.push({
      text,
      x,
      y,
      fillStyle: String(this.fillStyle),
      font: String(this.font),
      textAlign: String(this.textAlign),
    });
  }

  // Path / stroke primitives used by roundedRect and the decorative lines.
  // They have no observable effect on our assertions, so they are no-ops.
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arcTo(): void {}
  stroke(): void {}
  fill(): void {}
}

/** Cast the mock to the structural type the renderer expects. */
function createMockCtx(): MockCanvasContext {
  return new MockCanvasContext();
}

function renderWith(options: CertificateRendererOptions): MockCanvasContext {
  const ctx = createMockCtx();
  renderCertificate(ctx as unknown as CanvasRenderingContext2D, options);
  return ctx;
}

/** Find the full-canvas background fill (the rect covering the whole canvas). */
function findBackgroundFill(ctx: MockCanvasContext): FillRectCall | undefined {
  return ctx.fillRectCalls.find(
    (c) =>
      c.x === 0 &&
      c.y === 0 &&
      c.width === CERTIFICATE_WIDTH &&
      c.height === CERTIFICATE_HEIGHT,
  );
}

/** Find the fillText call for a given exact text. */
function findText(ctx: MockCanvasContext, text: string): FillTextCall | undefined {
  return ctx.fillTextCalls.find((c) => c.text === text);
}

// ---------------------------------------------------------------------------
// fast-check generators
// ---------------------------------------------------------------------------

const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  'Iniciante em Kiro',
  'Praticante de Kiro',
  'Especialista em Kiro',
  'Mestre em Kiro',
];

const performanceLevelArb = fc.constantFrom<PerformanceLevel>(...PERFORMANCE_LEVELS);

const themeArb = fc.constantFrom<'light' | 'dark'>('light', 'dark');

/** Names including empty / whitespace-only / leading-trailing-whitespace cases. */
const userNameArb = fc.oneof(
  fc.string(),
  fc.constantFrom('', ' ', '   ', '\t', '\n  ', '\t \n'),
  // Names surrounded by whitespace, to exercise trimming.
  fc.string({ minLength: 1, maxLength: 40 }).map((s) => `  ${s}  `),
);

/**
 * Valid completion stats: completedStages is always 13 and
 * totalCorrect <= totalQuestions (totalQuestions >= 1).
 */
const statsArb = fc
  .integer({ min: 1, max: 200 })
  .chain((totalQuestions) =>
    fc.integer({ min: 0, max: totalQuestions }).map((totalCorrect) => ({
      totalQuestions,
      totalCorrect,
      percentage: Math.round((totalCorrect / totalQuestions) * 100),
      completedStages: 13,
    })),
  );

const completionDateArb = fc.date({
  min: new Date(2020, 0, 1),
  max: new Date(2030, 11, 31),
});

const optionsArb: fc.Arbitrary<CertificateRendererOptions> = fc.record({
  userName: userNameArb,
  stats: statsArb,
  performanceLevel: performanceLevelArb,
  completionDate: completionDateArb,
  theme: themeArb,
});

// ---------------------------------------------------------------------------
// Property 2: Certificate Dimension Invariant
// ---------------------------------------------------------------------------

describe('Property 2: Certificate Dimension Invariant', () => {
  it('exports fixed 1200x800 dimension constants', () => {
    expect(CERTIFICATE_WIDTH).toBe(1200);
    expect(CERTIFICATE_HEIGHT).toBe(800);
  });

  fcTest.prop([optionsArb])(
    'always fills the background covering the full 1200x800 canvas',
    (options) => {
      const ctx = renderWith(options);
      const bg = findBackgroundFill(ctx);
      expect(bg).toBeDefined();
      expect(bg!.width).toBe(1200);
      expect(bg!.height).toBe(800);
    },
  );
});

// ---------------------------------------------------------------------------
// Property 6: Certificate Generation Success
// ---------------------------------------------------------------------------

describe('Property 6: Certificate Generation Success', () => {
  fcTest.prop([optionsArb])(
    'renders without throwing and produces drawing output for valid inputs',
    (options) => {
      const ctx = renderWith(options);
      // A successful render must produce both the background and text content.
      expect(ctx.fillRectCalls.length).toBeGreaterThan(0);
      expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    },
  );

  fcTest.prop([optionsArb])(
    'produces a non-null PNG Blob via canvasToBlob for valid inputs',
    async (options) => {
      const ctx = renderWith(options);
      expect(findBackgroundFill(ctx)).toBeDefined();

      // jsdom lacks a real toBlob, so mock the canvas surface. This mirrors
      // the generateCertificate pipeline: render -> canvasToBlob -> PNG Blob.
      const fakeCanvas = {
        toBlob(
          callback: (blob: Blob | null) => void,
          type?: string,
        ): void {
          callback(new Blob(['png-bytes'], { type: type ?? 'image/png' }));
        },
      } as unknown as HTMLCanvasElement;

      const blob = await canvasToBlob(fakeCanvas);
      expect(blob).not.toBeNull();
      expect(blob!.type).toBe('image/png');
    },
  );
});

// ---------------------------------------------------------------------------
// Property 7: Certificate Name Display
// ---------------------------------------------------------------------------

describe('Property 7: Certificate Name Display', () => {
  fcTest.prop([userNameArb, statsArb, performanceLevelArb, themeArb, completionDateArb])(
    'displays the trimmed name when non-empty, otherwise the fallback',
    (userName, stats, performanceLevel, theme, completionDate) => {
      const ctx = renderWith({
        userName,
        stats,
        performanceLevel,
        completionDate,
        theme,
      });

      const trimmed = userName.trim();
      const expected = trimmed !== '' ? trimmed : FALLBACK_NAME;

      // The display name is the only text drawn at the name baseline (y=260).
      const nameCall = ctx.fillTextCalls.find((c) => c.y === 260);
      expect(nameCall).toBeDefined();
      expect(nameCall!.text).toBe(expected);

      // Whenever the input is empty/whitespace-only, the fallback must appear.
      if (trimmed === '') {
        expect(findText(ctx, FALLBACK_NAME)).toBeDefined();
      }
    },
  );

  it('shows the fallback name for an empty string', () => {
    const ctx = renderWith({
      userName: '',
      stats: { totalCorrect: 10, totalQuestions: 10, percentage: 100, completedStages: 13 },
      performanceLevel: 'Mestre em Kiro',
      completionDate: new Date(2024, 0, 15),
      theme: 'light',
    });
    expect(findText(ctx, FALLBACK_NAME)).toBeDefined();
  });

  it('shows the trimmed name for a padded input', () => {
    const ctx = renderWith({
      userName: '  Maria Silva  ',
      stats: { totalCorrect: 8, totalQuestions: 10, percentage: 80, completedStages: 13 },
      performanceLevel: 'Especialista em Kiro',
      completionDate: new Date(2024, 5, 1),
      theme: 'dark',
    });
    const nameCall = ctx.fillTextCalls.find((c) => c.y === 260);
    expect(nameCall?.text).toBe('Maria Silva');
  });
});

// ---------------------------------------------------------------------------
// Property 12: Certificate Theme Consistency
// ---------------------------------------------------------------------------

describe('Property 12: Certificate Theme Consistency', () => {
  fcTest.prop([optionsArb])(
    'dark theme uses dark background (#1f2937) with light title text',
    (options) => {
      const ctx = renderWith({ ...options, theme: 'dark' });
      const bg = findBackgroundFill(ctx);
      expect(bg?.fillStyle).toBe('#1f2937');

      const title = findText(ctx, 'Certificado de Conclusão');
      expect(title?.fillStyle).toBe('#f9fafb');
    },
  );

  fcTest.prop([optionsArb])(
    'light theme uses white background (#ffffff) with dark title text',
    (options) => {
      const ctx = renderWith({ ...options, theme: 'light' });
      const bg = findBackgroundFill(ctx);
      expect(bg?.fillStyle).toBe('#ffffff');

      const title = findText(ctx, 'Certificado de Conclusão');
      expect(title?.fillStyle).toBe('#1f2937');
    },
  );
});
