import type { Ref } from 'vue';
import type { LearningStage, PerformanceLevel } from '@/engine/types';

/**
 * Re-export the shared domain types so the badges module has a single,
 * cohesive surface for all of its type dependencies.
 */
export type { LearningStage, PerformanceLevel };

/**
 * Visual configuration for a single stage badge.
 *
 * Validation rules (see design "Badge Design Configuration"):
 * - `icon` must be a valid (non-empty) emoji/unicode string
 * - `primaryColor` and `secondaryColor` must be valid hex color codes
 * - `displayName` must be non-empty and <= 30 characters
 */
export interface BadgeDesign {
  /** The LearningStage this design applies to. */
  stage: LearningStage;
  /** Emoji or unicode character displayed on the badge. */
  icon: string;
  /** Hex color used as the gradient start. */
  primaryColor: string;
  /** Hex color used as the gradient end. */
  secondaryColor: string;
  /** Portuguese stage name shown on the badge (<= 30 chars). */
  displayName: string;
}

/**
 * Options passed to the badge renderer to draw a stage completion badge
 * onto an HTML5 Canvas. Badge dimensions are 400x400 pixels.
 */
export interface BadgeRendererOptions {
  /** The completed stage to render a badge for. */
  stage: LearningStage;
  /** The user's score for the stage. `correct` must be <= `total`. */
  score: { correct: number; total: number };
  /** The computed performance tier label. */
  performanceLevel: PerformanceLevel;
  /** The active app theme, determining overlay/contrast styling. */
  theme: 'light' | 'dark';
}

/**
 * Options passed to the certificate renderer to draw the full completion
 * certificate onto an HTML5 Canvas. Certificate dimensions are 1200x800 pixels.
 */
export interface CertificateRendererOptions {
  /** The user's name. Empty string when the user skipped name entry. */
  userName: string;
  /** Aggregate completion statistics displayed on the certificate. */
  stats: {
    totalCorrect: number;
    totalQuestions: number;
    percentage: number;
    completedStages: number;
  };
  /** The computed overall performance tier label. */
  performanceLevel: PerformanceLevel;
  /** The date the trail was completed (formatted in pt-BR locale). */
  completionDate: Date;
  /** The active app theme, determining background/text colors. */
  theme: 'light' | 'dark';
}

/**
 * Aggregate statistics describing a full Kiro Quest completion.
 *
 * Validation rules (see design "Certificate Stats"):
 * - `totalCorrect` <= `totalQuestions`
 * - `percentage` = Math.round((totalCorrect / totalQuestions) * 100)
 * - `completedStages` must equal 11 (all stages)
 * - `completionDate` must not be in the future
 */
export interface CertificateStats {
  totalCorrect: number;
  totalQuestions: number;
  percentage: number;
  completedStages: number;
  performanceLevel: PerformanceLevel;
  completionDate: Date;
}

/**
 * Options describing how a generated image should be shared to a social
 * platform via the Image_Sharer.
 */
export interface ImageShareOptions {
  /** The generated PNG image blob to share. */
  blob: Blob;
  /** The file name used when sharing/downloading the image. */
  fileName: string;
  /** Pre-filled share text (<= 280 characters). */
  shareText: string;
  /** The target sharing platform. */
  platform: 'twitter' | 'generic';
  /**
   * Optional crawlable share URL (e.g. `${origin}/s/badge/<stage>` or
   * `${origin}/s/certificate`) used as the shared link for LinkedIn / Twitter
   * so social crawlers fetch the per-module preview card. When omitted, the
   * current page URL is used (backward compatible).
   */
  shareUrl?: string;
}

/**
 * The reactive API returned by the `useBadgeCanvas()` composable, which
 * manages canvas lifecycle, image generation, and blob creation.
 */
export interface UseBadgeCanvasReturn {
  /** Reference to the canvas element (when mounted in the DOM). */
  canvasRef: Ref<HTMLCanvasElement | null>;
  /** True while an image is being generated. */
  isGenerating: Ref<boolean>;
  /** Object URL for previewing the most recently generated image. */
  previewUrl: Ref<string | null>;
  /** Descriptive error message set when generation fails. */
  error: Ref<string | null>;
  /** Generate a stage badge PNG blob, or null on failure. */
  generateBadge: (options: BadgeRendererOptions) => Promise<Blob | null>;
  /** Generate a completion certificate PNG blob, or null on failure. */
  generateCertificate: (options: CertificateRendererOptions) => Promise<Blob | null>;
  /** Revoke object URLs and reset state. */
  cleanup: () => void;
}
