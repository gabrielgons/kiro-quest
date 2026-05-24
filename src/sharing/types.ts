import type { PerformanceLevel } from '@/engine/types';

export interface ShareableResult {
  stageName: string;
  correctCount: number;
  totalCount: number;
  performanceLevel?: PerformanceLevel;
  isFullQuizComplete: boolean;
}
