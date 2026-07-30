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
  getProfile,
};
