/**
 * Integration tests for the full badge / certificate flow (Task 10.2).
 *
 * Unlike the unit tests, which exercise each module of the badges feature in
 * isolation, these tests wire the real pieces together end-to-end:
 *
 *   useBadgeCanvas() → renderer (badge / certificate) → canvasToBlob → Blob
 *                    → imageSharer (downloadImage / shareToSocial)
 *
 * Two complete user journeys are covered:
 *
 * 1. Badge flow: a stage completion generates a 400x400 PNG blob via the
 *    composable, which is then downloaded to disk through `downloadImage`.
 *    Assertions verify the object-URL lifecycle (create + revoke), that the
 *    download anchor is clicked, and that the filename matches the documented
 *    pattern "kiro-quest-badge-{stage}.png".
 *
 * 2. Certificate flow: a name-input result feeds `generateCertificate`, whose
 *    PNG blob is shared to LinkedIn via `shareToSocial`. Assertions verify a
 *    URL-encoded share window is opened and that `true` is returned.
 *
 * 3. Object URL lifecycle: createObjectURL / revokeObjectURL stay balanced
 *    across a download (Requirements 4.3, 4.4).
 *
 * Validates: Requirements 1.4, 2.5, 4.3, 4.4
 *
 * The composable is imported directly from its module file (rather than the
 * '@/badges' barrel) to stay decoupled from `src/badges/index.ts`, which is
 * authored by a parallel task.
 *
 * Environment notes (jsdom + Vue 3 + vitest + @vue/test-utils): jsdom does not
 * implement the Canvas 2D context, `canvas.toBlob`, `URL.createObjectURL`/
 * `revokeObjectURL`, anchor-driven downloads, or `window.open`. Each of these
 * is stubbed below so the orchestration logic can be asserted deterministically.
 * The composable is mounted inside a harness component so its `onUnmounted`
 * cleanup hook is wired to a real component instance.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { useBadgeCanvas } from '../useBadgeCanvas';
import {
  downloadImage,
  shareToSocial,
  getBadgeFileName,
  getCertificateFileName,
  generateCertificateShareText,
} from '../imageSharer';
import type {
  BadgeRendererOptions,
  CertificateRendererOptions,
  LearningStage,
  PerformanceLevel,
  UseBadgeCanvasReturn,
} from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const STAGE: LearningStage = 'kiro-basics';
const PERFORMANCE_LEVEL: PerformanceLevel = 'Especialista em Kiro';

const BADGE_OPTIONS: BadgeRendererOptions = {
  stage: STAGE,
  score: { correct: 8, total: 10 },
  performanceLevel: PERFORMANCE_LEVEL,
  theme: 'light',
};

// ---------------------------------------------------------------------------
// Canvas / URL / DOM stubs
// ---------------------------------------------------------------------------

/**
 * Build a stub 2D rendering context implementing exactly the surface the badge
 * and certificate renderers touch. Drawing methods are no-ops (we assert on
 * the produced blob + sharing behavior, not pixel output) but must exist so
 * the real renderers execute without throwing.
 */
function createStubContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    // Path primitives (roundedRect, certificate decorative lines).
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    // Fill / stroke operations.
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // Gradient factory used for the badge background.
    createLinearGradient: vi.fn(() => gradient),
    // Mutable style properties the renderers assign to.
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 0,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// Originals, restored after each test.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

// Spies/state populated fresh in beforeEach.
let getContextSpy: ReturnType<typeof vi.fn>;
let toBlobSpy: ReturnType<typeof vi.fn>;
let createObjectURLSpy: ReturnType<typeof vi.fn>;
let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

// Download anchor stub state.
let clickSpy: ReturnType<typeof vi.fn>;
let removeSpy: ReturnType<typeof vi.fn>;
let mockAnchor: HTMLAnchorElement;
let createElementSpy: MockInstance<typeof document.createElement>;
let appendChildSpy: MockInstance<typeof document.body.appendChild>;

// window.open stub.
let openSpy: MockInstance<typeof window.open>;

/**
 * Mount the composable inside a minimal harness component so its onUnmounted
 * lifecycle hook is bound to a real component instance.
 */
function mountComposable(): {
  api: UseBadgeCanvasReturn;
  wrapper: ReturnType<typeof mount>;
} {
  let api!: UseBadgeCanvasReturn;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useBadgeCanvas();
        return () => h('div');
      },
    }),
  );
  return { api, wrapper };
}

beforeEach(() => {
  // --- Canvas: getContext returns a fresh stub 2D context. ---
  getContextSpy = vi.fn(() => createStubContext());
  HTMLCanvasElement.prototype.getContext =
    getContextSpy as unknown as typeof HTMLCanvasElement.prototype.getContext;

  // --- Canvas: toBlob synchronously yields a valid PNG blob. ---
  toBlobSpy = vi.fn((callback: BlobCallback, type?: string) => {
    const blob = new Blob(['fake-png-bytes'], { type: type ?? 'image/png' });
    callback(blob);
  });
  HTMLCanvasElement.prototype.toBlob =
    toBlobSpy as unknown as typeof HTMLCanvasElement.prototype.toBlob;

  // --- URL lifecycle: unique fake blob URL per create call. ---
  let urlCounter = 0;
  createObjectURLSpy = vi.fn(() => `blob:mock/${++urlCounter}`);
  revokeObjectURLSpy = vi.fn();
  URL.createObjectURL =
    createObjectURLSpy as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL =
    revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

  // --- Download anchor stub. ---
  clickSpy = vi.fn();
  removeSpy = vi.fn();
  mockAnchor = {
    href: '',
    download: '',
    rel: '',
    click: clickSpy,
    remove: removeSpy,
  } as unknown as HTMLAnchorElement;

  const originalCreateElement = document.createElement.bind(document);
  createElementSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string) => {
      // Only the download anchor is intercepted; the composable's offscreen
      // <canvas> must remain a real element so getContext/toBlob run.
      if (tag === 'a') return mockAnchor;
      return originalCreateElement(tag);
    });

  // The mock anchor is not a real Node, so stub appendChild to accept it.
  appendChildSpy = vi
    .spyOn(document.body, 'appendChild')
    .mockImplementation((node) => node);

  // --- window.open stub for social sharing. ---
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  createElementSpy.mockRestore();
  appendChildSpy.mockRestore();
  openSpy.mockRestore();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Badge flow: generate → download
// ---------------------------------------------------------------------------

describe('Integration: badge generation → download flow', () => {
  it('generates a PNG badge blob and downloads it with the expected filename', async () => {
    // Validates: Requirements 1.4, 4.3, 4.4
    const { api, wrapper } = mountComposable();

    // Step 1: the composable creates a canvas, the renderer draws onto it, and
    // a PNG blob is produced.
    const blob = await api.generateBadge(BADGE_OPTIONS);

    expect(blob).not.toBeNull();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');

    // The full pipeline ran end-to-end: a 2D context was requested, the
    // gradient background drew, text was rendered, and the canvas serialized.
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect(toBlobSpy).toHaveBeenCalledTimes(1);

    // The composable created exactly one preview object URL for the blob.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const previewUrlCreations = createObjectURLSpy.mock.calls.length;

    // Step 2: download the generated blob. downloadImage creates its own
    // object URL, triggers the anchor click, then revokes that URL.
    const fileName = getBadgeFileName(STAGE);
    expect(() => downloadImage(blob as Blob, fileName)).not.toThrow();

    // The anchor was configured with the documented badge filename pattern.
    expect(mockAnchor.download).toBe('kiro-quest-badge-kiro-basics.png');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    // downloadImage created one more object URL (on top of the preview one)...
    expect(createObjectURLSpy).toHaveBeenCalledTimes(previewUrlCreations + 1);
    expect(createObjectURLSpy).toHaveBeenLastCalledWith(blob);
    // ...and immediately revoked it (Requirements 4.3, 4.4).
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('uses the stage identifier in the download filename', async () => {
    // Validates: Requirement 1.4 / 4.1 (filename carries the stage id)
    const { api, wrapper } = mountComposable();

    const blob = await api.generateBadge({
      ...BADGE_OPTIONS,
      stage: 'mcp',
      score: { correct: 5, total: 5 },
    });

    expect(blob).not.toBeNull();
    downloadImage(blob as Blob, getBadgeFileName('mcp'));

    expect(mockAnchor.download).toBe('kiro-quest-badge-mcp.png');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});

// ---------------------------------------------------------------------------
// 2. Certificate flow: name input → generate → share
// ---------------------------------------------------------------------------

describe('Integration: certificate generation → share flow', () => {
  it('generates a certificate from a name-input result and shares it to LinkedIn', async () => {
    // Validates: Requirements 2.5, 5.1, 9.3
    const { api, wrapper } = mountComposable();

    // Simulate the result of the name-input modal: the user confirmed a name.
    const userName = 'Maria Silva';

    const certificateOptions: CertificateRendererOptions = {
      userName,
      stats: {
        totalCorrect: 95,
        totalQuestions: 110,
        percentage: 86,
        completedStages: 11,
      },
      performanceLevel: PERFORMANCE_LEVEL,
      completionDate: new Date('2024-01-15T12:00:00Z'),
      theme: 'light',
    };

    // Step 1: generate the certificate PNG blob through the composable.
    const blob = await api.generateCertificate(certificateOptions);

    expect(blob).not.toBeNull();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect(toBlobSpy).toHaveBeenCalledTimes(1);

    // Step 2: share the generated certificate to LinkedIn.
    const shareText = generateCertificateShareText(PERFORMANCE_LEVEL);
    const result = await shareToSocial({
      blob: blob as Blob,
      fileName: getCertificateFileName(),
      shareText,
      platform: 'linkedin',
    });

    // A share window was opened and the action reported success.
    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalledTimes(1);

    // The opened URL is a LinkedIn share URL carrying the URL-encoded text.
    const calledUrl = String(openSpy.mock.calls[0]![0]);
    expect(calledUrl).toContain('linkedin.com');
    expect(calledUrl).toContain(encodeURIComponent(shareText));
    // The raw (unencoded) performance level must not appear verbatim.
    expect(calledUrl).toContain(encodeURIComponent(PERFORMANCE_LEVEL));

    wrapper.unmount();
  });

  it('falls back to the generic name when the name input is skipped (empty)', async () => {
    // Validates: Requirement 2.5 (certificate still generates with empty name)
    const { api, wrapper } = mountComposable();

    const blob = await api.generateCertificate({
      userName: '',
      stats: {
        totalCorrect: 80,
        totalQuestions: 110,
        percentage: 73,
        completedStages: 11,
      },
      performanceLevel: 'Praticante de Kiro',
      completionDate: new Date('2024-03-01T09:30:00Z'),
      theme: 'dark',
    });

    // Generation still succeeds for an empty (skipped) name.
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('image/png');
    expect(toBlobSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});

// ---------------------------------------------------------------------------
// 3. Object URL lifecycle balance for downloads
// ---------------------------------------------------------------------------

describe('Integration: object URL lifecycle (Req 4.3, 4.4)', () => {
  it('balances createObjectURL and revokeObjectURL for a standalone download', () => {
    // Validates: Requirements 4.3, 4.4
    const blob = new Blob(['png-bytes'], { type: 'image/png' });

    downloadImage(blob, getBadgeFileName('specs'));

    // Exactly one URL created from the blob, and exactly one revoked.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    // The same URL that was created is the one revoked (no leak, no mismatch).
    const created = createObjectURLSpy.mock.results[0]!.value as string;
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(created);
  });

  it('revokes one URL per download across repeated downloads', () => {
    // Validates: Requirements 4.3, 4.4
    const blob = new Blob(['png-bytes'], { type: 'image/png' });

    downloadImage(blob, getBadgeFileName('hooks'));
    downloadImage(blob, getCertificateFileName());

    // Two downloads → two creations and two revocations remain balanced.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
  });
});
