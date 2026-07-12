/**
 * Typed API client for Kiro Quest Backend.
 *
 * Handles authenticated requests to the API Gateway endpoints.
 * Falls back gracefully when API is not configured or user is not authenticated.
 */

import { getAccessToken } from '@/auth';

// API base URL - configured via environment variable at build time
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiProgressEntry {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: string;
  userAnswers: Array<{
    questionId: string;
    selectedOptionId: string | string[];
    isCorrect: boolean;
    answeredAt: number;
  }>;
  lastUpdated: number;
}

export interface ApiSubmitResultRequest {
  stageId: string;
  correctCount: number;
  totalCount: number;
}

export interface ApiSubmitResultResponse {
  stageId: string;
  correctCount: number;
  totalCount: number;
  completedAt: number;
}

export interface ApiRankingEntry {
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  completedAt: number;
}

export interface ApiRankingsResponse {
  stageId: string;
  rankings: ApiRankingEntry[];
}

export interface ApiUserProfile {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  completedStages: string[];
  totalScore: number;
  lastActive: string;
}

export interface ApiSaveProgressRequest {
  stageId: string;
  currentQuestionIndex: number;
  quizPhase: string;
  userAnswers: Array<{
    questionId: string;
    selectedOptionId: string | string[];
    isCorrect: boolean;
    answeredAt: number;
  }>;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Returns true if the API is configured (VITE_API_URL is set).
 */
export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}

/**
 * Makes an authenticated request to the API.
 * Automatically attaches the access token from the auth module.
 */
async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError(401, 'Not authenticated');
  }

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  return response;
}

/**
 * Save progress for a stage.
 */
export async function saveProgress(data: ApiSaveProgressRequest): Promise<void> {
  await authenticatedFetch('/api/progress', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all progress for the authenticated user.
 */
export async function getProgress(stageId?: string): Promise<ApiProgressEntry[]> {
  const params = stageId ? `?stageId=${encodeURIComponent(stageId)}` : '';
  const response = await authenticatedFetch(`/api/progress${params}`);
  const data = (await response.json()) as { progress: ApiProgressEntry[] };
  return data.progress;
}

/**
 * Submit a stage result (score).
 */
export async function submitResult(
  data: ApiSubmitResultRequest,
): Promise<ApiSubmitResultResponse> {
  const response = await authenticatedFetch('/api/results', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return (await response.json()) as ApiSubmitResultResponse;
}

/**
 * Get rankings for a stage.
 */
export async function getRankings(
  stageId: string,
  limit?: number,
): Promise<ApiRankingsResponse> {
  const params = new URLSearchParams({ stageId });
  if (limit) params.set('limit', String(limit));
  const response = await authenticatedFetch(`/api/rankings?${params.toString()}`);
  return (await response.json()) as ApiRankingsResponse;
}

/**
 * Get the current user's profile.
 */
export async function getProfile(): Promise<ApiUserProfile> {
  const response = await authenticatedFetch('/api/profile');
  return (await response.json()) as ApiUserProfile;
}

export const api = {
  isConfigured: isApiConfigured,
  saveProgress,
  getProgress,
  submitResult,
  getRankings,
  getProfile,
};
