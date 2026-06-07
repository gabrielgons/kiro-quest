/**
 * Property-based and unit tests for the image sharer module.
 *
 * Implements Task 5.2 of the "Shareable Badges and Certificate" spec, covering:
 * - Property 13: Share Text Length Limit — generated share text never exceeds
 *   280 characters
 * - Property 14: Share Text Achievement Content — badge text contains the
 *   stage display name + performance level; certificate text contains the
 *   performance level + a Portuguese completion message
 * - Property 15: Share URL Encoding — encodeURIComponent is applied to all
 *   user-provided text placed into social share URLs
 * - Property 16: Download Object URL Lifecycle — an object URL is created and
 *   subsequently revoked (no memory leaks)
 * - Property 17: Download Filename Contains Stage Identifier — badge filenames
 *   match the pattern "kiro-quest-badge-{stage-id}.png"
 * - Property 18: Filename Path Separator Stripping — generated filenames never
 *   contain "/" or "\"
 *
 * Validates: Requirements 4.1, 4.3, 4.4, 5.6, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3
 *
 * The jsdom environment does not implement `URL.createObjectURL`,
 * `URL.revokeObjectURL`, or real `window.open`/anchor navigation, so these are
 * mocked with vi.fn() spies and assertions are made against the recorded calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';

import {
  MAX_SHARE_TEXT_LENGTH,
  sanitizeFileName,
  getBadgeFileName,
  getCertificateFileName,
  generateBadgeShareText,
  generateCertificateShareText,
  downloadImage,
  shareToSocial,
  buildBadgeShareUrl,
  buildCertificateShareUrl,
  buildLinkedInAddToProfileUrl,
} from '../imageSharer';
import { BADGE_DESIGNS } from '../badgeDesigns';
import { STAGE_ORDER } from '@/engine/quizEngine';
import type { LearningStage, PerformanceLevel } from '../types';

// ---------------------------------------------------------------------------
// Shared generators / fixtures
// ---------------------------------------------------------------------------

/** The complete enumeration of LearningStage values (11 total). */
const ALL_STAGES = Object.keys(BADGE_DESIGNS) as LearningStage[];

/** The four computed performance tier labels. */
const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  'Iniciante em Kiro',
  'Praticante de Kiro',
  'Especialista em Kiro',
  'Mestre em Kiro',
];

const stageArb = fc.constantFrom(...ALL_STAGES);
const performanceArb = fc.constantFrom(...PERFORMANCE_LEVELS);

/**
 * Strings that exercise URL-encoding: arbitrary unicode plus curated values
 * that contain spaces, ampersands, equals signs, accented characters and
 * other URL-significant punctuation.
 */
const specialTextArb = fc.oneof(
  fc.string(),
  fc.fullUnicodeString({ maxLength: 60 }),
  fc.constantFrom(
    'olá mundo & amigos',
    'café com açúcar = 100%',
    'a/b\\c?d#e',
    'Nível: Mestre em Kiro!',
    'spaces and "quotes"',
    '<script>alert(1)</script>',
    'emoji 🚀 test',
  ),
);

/** Arbitrary filenames, frequently containing path separator characters. */
const filenameWithSeparatorsArb = fc.oneof(
  fc.string(),
  fc.constantFrom(
    '../../etc/passwd',
    'C:\\Windows\\System32\\evil.png',
    'folder/sub/file.png',
    'a/b\\c/d.png',
    '/leading/slash.png',
    'normal-file.png',
  ),
);

// ---------------------------------------------------------------------------
// Property 13: Share Text Length Limit
// ---------------------------------------------------------------------------

describe('Property 13: Share Text Length Limit', () => {
  it('exposes a 280-character maximum', () => {
    // Validates: Requirements 5.6, 9.4
    expect(MAX_SHARE_TEXT_LENGTH).toBe(280);
  });

  fcTest.prop([stageArb, performanceArb])(
    'badge share text never exceeds 280 characters',
    (stage, performanceLevel) => {
      // Validates: Requirements 5.6, 9.4
      const text = generateBadgeShareText(stage, performanceLevel);
      expect(text.length).toBeLessThanOrEqual(MAX_SHARE_TEXT_LENGTH);
    },
  );

  fcTest.prop([performanceArb])(
    'certificate share text never exceeds 280 characters',
    (performanceLevel) => {
      // Validates: Requirements 5.6, 9.4
      const text = generateCertificateShareText(performanceLevel);
      expect(text.length).toBeLessThanOrEqual(MAX_SHARE_TEXT_LENGTH);
    },
  );
});

// ---------------------------------------------------------------------------
// Property 14: Share Text Achievement Content
// ---------------------------------------------------------------------------

describe('Property 14: Share Text Achievement Content', () => {
  fcTest.prop([stageArb, performanceArb])(
    'badge text contains the stage display name and the performance level',
    (stage, performanceLevel) => {
      // Validates: Requirement 9.1
      const text = generateBadgeShareText(stage, performanceLevel);
      const { displayName } = BADGE_DESIGNS[stage];
      expect(text).toContain(displayName);
      expect(text).toContain(performanceLevel);
    },
  );

  fcTest.prop([performanceArb])(
    'certificate text contains the performance level and a Portuguese completion message',
    (performanceLevel) => {
      // Validates: Requirement 9.2
      const text = generateCertificateShareText(performanceLevel);
      expect(text).toContain(performanceLevel);
      // The Portuguese completion message mentions completing the Kiro Quest
      // trail and earning the certificate.
      expect(text).toContain('Kiro Quest');
      expect(text.toLowerCase()).toContain('certificado');
    },
  );

  it('produces the expected Portuguese badge text for a concrete example', () => {
    const text = generateBadgeShareText('kiro-basics', 'Especialista em Kiro');
    expect(text).toContain('Fundamentos do Kiro');
    expect(text).toContain('Especialista em Kiro');
  });
});

// ---------------------------------------------------------------------------
// Property 15: Share URL Encoding
// ---------------------------------------------------------------------------

describe('Property 15: Share URL Encoding', () => {
  let openSpy: MockInstance<typeof window.open>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const dummyBlob = new Blob(['x'], { type: 'image/png' });

  fcTest.prop([specialTextArb, fc.constantFrom<'twitter'>('twitter')])(
    'opens a share URL containing the encodeURIComponent-encoded share text',
    async (shareText, platform) => {
      // Validates: Requirements 9.3, 10.3
      openSpy.mockClear();

      const result = await shareToSocial({
        blob: dummyBlob,
        fileName: 'kiro-quest-badge-specs.png',
        shareText,
        platform,
      });

      expect(result).toBe(true);
      expect(openSpy).toHaveBeenCalledTimes(1);

      const calledUrl = String(openSpy.mock.calls[0]![0]);
      // The raw text must be encoded, never embedded verbatim.
      expect(calledUrl).toContain(encodeURIComponent(shareText));
    },
  );

  it('encodes text with spaces and ampersands for Twitter', async () => {
    // Validates: Requirements 9.3, 10.3
    const shareText = 'olá mundo & amigos';
    await shareToSocial({
      blob: dummyBlob,
      fileName: 'kiro-quest-certificate.png',
      shareText,
      platform: 'twitter',
    });
    const calledUrl = String(openSpy.mock.calls[0]![0]);
    expect(calledUrl).toContain(`text=${encodeURIComponent(shareText)}`);
    // The unencoded form must not appear in the URL.
    expect(calledUrl).not.toContain('olá mundo & amigos');
  });

  it('encodes text for Twitter/X', async () => {
    // Validates: Requirements 9.3, 10.3
    const shareText = 'café = 100%';
    await shareToSocial({
      blob: dummyBlob,
      fileName: 'kiro-quest-badge-mcp.png',
      shareText,
      platform: 'twitter',
    });
    const calledUrl = String(openSpy.mock.calls[0]![0]);
    expect(calledUrl).toContain(`text=${encodeURIComponent(shareText)}`);
  });
});

// ---------------------------------------------------------------------------
// Property 16: Download Object URL Lifecycle
// ---------------------------------------------------------------------------

describe('Property 16: Download Object URL Lifecycle', () => {
  const MOCK_URL = 'blob:mock-object-url';
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;
  let createElementSpy: MockInstance<typeof document.createElement>;
  let appendChildSpy: MockInstance<typeof document.body.appendChild>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => MOCK_URL);
    revokeObjectURLSpy = vi.fn();
    // jsdom does not implement these; assign mocks directly.
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

    clickSpy = vi.fn();
    removeSpy = vi.fn();

    const mockAnchor = {
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
        if (tag === 'a') return mockAnchor;
        return originalCreateElement(tag);
      });

    // The mock anchor is not a real Node, so stub appendChild to accept it.
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.restoreAllMocks();
  });

  fcTest.prop([fc.string(), filenameWithSeparatorsArb])(
    'creates an object URL and revokes the same URL on every download',
    (content, fileName) => {
      // Validates: Requirements 4.3, 4.4
      createObjectURLSpy.mockClear();
      revokeObjectURLSpy.mockClear();
      clickSpy.mockClear();

      const blob = new Blob([content], { type: 'image/png' });
      expect(() => downloadImage(blob, fileName)).not.toThrow();

      // Exactly one object URL is created from the blob...
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      // ...the download is triggered...
      expect(clickSpy).toHaveBeenCalledTimes(1);
      // ...and the same URL is revoked afterward (no leak).
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(MOCK_URL);
    },
  );

  it('revokes the object URL even though the download was initiated', () => {
    // Validates: Requirements 4.3, 4.4
    const blob = new Blob(['png'], { type: 'image/png' });
    downloadImage(blob, 'kiro-quest-badge-specs.png');

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(MOCK_URL);
  });
});

// ---------------------------------------------------------------------------
// Property 17: Download Filename Contains Stage Identifier
// ---------------------------------------------------------------------------

describe('Property 17: Download Filename Contains Stage Identifier', () => {
  fcTest.prop([stageArb])(
    'badge filename follows the pattern "kiro-quest-badge-{stage-id}.png"',
    (stage) => {
      // Validates: Requirement 4.1
      const fileName = getBadgeFileName(stage);
      expect(fileName).toBe(`kiro-quest-badge-${stage}.png`);
      expect(fileName).toContain(stage);
    },
  );

  it('certificate filename is the fixed "kiro-quest-certificate.png"', () => {
    // Validates: Requirement 4.2
    expect(getCertificateFileName()).toBe('kiro-quest-certificate.png');
  });
});

// ---------------------------------------------------------------------------
// Property 18: Filename Path Separator Stripping
// ---------------------------------------------------------------------------

describe('Property 18: Filename Path Separator Stripping', () => {
  fcTest.prop([filenameWithSeparatorsArb])(
    'sanitized filenames never contain "/" or "\\"',
    (rawName) => {
      // Validates: Requirement 10.2
      const safe = sanitizeFileName(rawName);
      expect(safe).not.toContain('/');
      expect(safe).not.toContain('\\');
    },
  );

  fcTest.prop([stageArb])(
    'generated badge filenames contain no path separators',
    (stage) => {
      // Validates: Requirement 10.2
      const fileName = getBadgeFileName(stage);
      expect(fileName).not.toContain('/');
      expect(fileName).not.toContain('\\');
    },
  );

  it('strips separators from a path-traversal style name', () => {
    // Validates: Requirement 10.2
    expect(sanitizeFileName('../../etc/passwd')).toBe('....etcpasswd');
    expect(sanitizeFileName('C:\\Windows\\evil.png')).toBe('C:Windowsevil.png');
  });

  it('certificate filename contains no path separators', () => {
    // Validates: Requirement 10.2
    const fileName = getCertificateFileName();
    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain('\\');
  });
});


// ---------------------------------------------------------------------------
// Task 8.3: Crawlable share-URL builders (unit tests)
// ---------------------------------------------------------------------------

describe('Crawlable share-URL builders', () => {
  /** The documented production-origin fallback (see imageSharer.ts). */
  const PRODUCTION_ORIGIN = 'https://kiro-quest.trilha.workers.dev';

  it('buildBadgeShareUrl returns `${origin}/s/badge/<stage>`', () => {
    // Validates: Requirements 6.1, 6.3
    const origin = window.location.origin;
    expect(buildBadgeShareUrl('kiro-basics')).toBe(`${origin}/s/badge/kiro-basics`);
  });

  it('buildCertificateShareUrl returns `${origin}/s/certificate`', () => {
    // Validates: Requirements 6.2, 6.3
    const origin = window.location.origin;
    expect(buildCertificateShareUrl()).toBe(`${origin}/s/certificate`);
  });

  it('falls back to the documented production origin when window.location.origin is unavailable', () => {
    // Validates: Requirement 6.6
    const originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    try {
      // Simulate a non-browser / origin-less context: location has no origin.
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { href: '' },
      });

      expect(buildBadgeShareUrl('specs')).toBe(`${PRODUCTION_ORIGIN}/s/badge/specs`);
      expect(buildCertificateShareUrl()).toBe(`${PRODUCTION_ORIGIN}/s/certificate`);
    } finally {
      if (originalLocation) {
        Object.defineProperty(window, 'location', originalLocation);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Share routing: the opened social URL uses the crawlable /s/... share URL
// ---------------------------------------------------------------------------

describe('Social share routing uses the crawlable /s/... URL', () => {
  let openSpy: MockInstance<typeof window.open>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const dummyBlob = new Blob(['x'], { type: 'image/png' });

  it('Twitter share opens a URL containing the provided /s/badge/<stage> path', async () => {
    // Validates: Requirements 6.4, 6.5
    const shareUrl = buildBadgeShareUrl('mcp');
    await shareToSocial({
      blob: dummyBlob,
      fileName: 'kiro-quest-badge-mcp.png',
      shareText: 'texto',
      shareUrl,
      platform: 'twitter',
    });
    const calledUrl = String(openSpy.mock.calls[0]![0]);
    expect(calledUrl).toContain(encodeURIComponent(shareUrl));
    expect(decodeURIComponent(calledUrl)).toContain('/s/badge/mcp');
  });

  it('Twitter share opens a URL containing the provided /s/certificate path', async () => {
    // Validates: Requirements 6.4, 6.5
    const shareUrl = buildCertificateShareUrl();
    await shareToSocial({
      blob: dummyBlob,
      fileName: 'kiro-quest-certificate.png',
      shareText: 'texto',
      shareUrl,
      platform: 'twitter',
    });
    const calledUrl = String(openSpy.mock.calls[0]![0]);
    expect(calledUrl).toContain(encodeURIComponent(shareUrl));
    expect(decodeURIComponent(calledUrl)).toContain('/s/certificate');
  });

  it('omitting shareUrl preserves the legacy current-page-URL behavior (no /s/ path)', async () => {
    // Backward-compatibility: existing callers that pass no shareUrl are unaffected.
    await shareToSocial({
      blob: dummyBlob,
      fileName: 'kiro-quest-badge-specs.png',
      shareText: 'texto',
      platform: 'twitter',
    });
    const calledUrl = decodeURIComponent(String(openSpy.mock.calls[0]![0]));
    expect(calledUrl).not.toContain('/s/badge/');
    expect(calledUrl).not.toContain('/s/certificate');
  });
});

// ---------------------------------------------------------------------------
// Property 7: Client URL builders produce same-origin /s/... paths
// Feature: dynamic-social-share-preview, Property 7
// ---------------------------------------------------------------------------

describe('Property 7: Client URL builders produce same-origin /s/... paths', () => {
  const stageOrderArb = fc.constantFrom(...STAGE_ORDER);

  fcTest.prop([stageOrderArb], { numRuns: 100 })(
    'buildBadgeShareUrl(stage) === `${origin}/s/badge/${stage}` for every STAGE_ORDER stage',
    (stage) => {
      // Validates: Requirements 6.1, 6.2, 6.6
      const origin = window.location.origin;
      expect(buildBadgeShareUrl(stage)).toBe(`${origin}/s/badge/${stage}`);
    },
  );

  fcTest.prop([stageOrderArb], { numRuns: 100 })(
    'buildCertificateShareUrl() === `${origin}/s/certificate` regardless of stage iteration',
    () => {
      // Validates: Requirements 6.2, 6.6
      const origin = window.location.origin;
      expect(buildCertificateShareUrl()).toBe(`${origin}/s/certificate`);
    },
  );
});

// ---------------------------------------------------------------------------
// buildLinkedInAddToProfileUrl tests
// ---------------------------------------------------------------------------

describe('buildLinkedInAddToProfileUrl', () => {
  const LINKEDIN_BASE = 'https://www.linkedin.com/profile/add';

  it('builds a badge URL with the correct certification name and stage share URL', () => {
    const fixedDate = new Date(2024, 5, 15); // June 2024
    const url = buildLinkedInAddToProfileUrl({
      type: 'badge',
      stage: 'kiro-basics',
      issueDate: fixedDate,
    });

    expect(url).toContain(LINKEDIN_BASE);
    expect(url).toContain('startTask=CERTIFICATION_NAME');
    // URLSearchParams encodes spaces as `+`
    expect(url).toContain('name=Kiro+Quest+-+Fundamentos+do+Kiro');
    expect(url).toContain('organizationName=Kiro+Quest');
    expect(url).toContain('issueYear=2024');
    expect(url).toContain('issueMonth=6');
    // certUrl is encoded by URLSearchParams (uses + for spaces, %XX for others)
    const expectedCertUrl = buildBadgeShareUrl('kiro-basics');
    expect(decodeURIComponent(url)).toContain(expectedCertUrl);
  });

  it('builds a certificate URL with the correct certification name', () => {
    const fixedDate = new Date(2025, 0, 1); // January 2025
    const url = buildLinkedInAddToProfileUrl({
      type: 'certificate',
      issueDate: fixedDate,
    });

    expect(url).toContain(LINKEDIN_BASE);
    expect(url).toContain('startTask=CERTIFICATION_NAME');
    // URLSearchParams encodes spaces as `+`
    expect(url).toContain('name=Kiro+Quest+-+Certificado+de+Conclusao');
    expect(url).toContain('organizationName=Kiro+Quest');
    expect(url).toContain('issueYear=2025');
    expect(url).toContain('issueMonth=1');
    const expectedCertUrl = buildCertificateShareUrl();
    expect(decodeURIComponent(url)).toContain(expectedCertUrl);
  });

  it('defaults to the current date when issueDate is not provided', () => {
    const now = new Date();
    const url = buildLinkedInAddToProfileUrl({
      type: 'certificate',
    });

    expect(url).toContain(`issueYear=${now.getFullYear()}`);
    expect(url).toContain(`issueMonth=${now.getMonth() + 1}`);
  });

  fcTest.prop([stageArb])(
    'builds a valid URL for every stage with URL-encoded values',
    (stage) => {
      const url = buildLinkedInAddToProfileUrl({
        type: 'badge',
        stage,
        issueDate: new Date(2024, 11, 25),
      });

      expect(url).toContain(LINKEDIN_BASE);
      expect(url).toContain('startTask=CERTIFICATION_NAME');
      expect(url).toContain('organizationName=Kiro+Quest');
      expect(url).toContain('issueYear=2024');
      expect(url).toContain('issueMonth=12');

      const { displayName } = BADGE_DESIGNS[stage];
      const expectedName = `Kiro Quest - ${displayName}`;
      // Decode the URL and check that the name is present
      const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
      expect(decoded).toContain(expectedName);

      const expectedCertUrl = buildBadgeShareUrl(stage);
      expect(decoded).toContain(expectedCertUrl);
    },
  );

  it('certificate type uses certificate URL', () => {
    const url = buildLinkedInAddToProfileUrl({
      type: 'certificate',
      issueDate: new Date(2024, 3, 10),
    });

    expect(url).toContain('name=Kiro+Quest+-+Certificado+de+Conclusao');
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain(buildCertificateShareUrl());
    expect(decoded).not.toContain(buildBadgeShareUrl('mcp'));
  });
});
