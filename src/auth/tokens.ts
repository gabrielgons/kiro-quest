/**
 * Token management for Cognito OAuth tokens.
 *
 * Handles storage, retrieval, refresh, and decoding of JWT tokens.
 * Uses localStorage for persistence across page reloads.
 */

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface UserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

const TOKEN_STORAGE_KEY = 'kiro-quest:auth:tokens';

/**
 * Stores auth tokens in localStorage.
 */
export function storeTokens(tokens: AuthTokens): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // localStorage unavailable - tokens only held in memory
  }
}

/**
 * Retrieves stored auth tokens, or null if not found or expired.
 */
export function getStoredTokens(): AuthTokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    const tokens = JSON.parse(stored) as AuthTokens;
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Removes stored tokens (on logout).
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Returns true if the access token is expired or will expire within the buffer period.
 */
export function isTokenExpired(tokens: AuthTokens, bufferMs: number = 60_000): boolean {
  return Date.now() >= tokens.expiresAt - bufferMs;
}

/**
 * Decodes a JWT token payload without verification.
 * Token verification happens server-side; the client only reads claims for display.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1]!;
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(padded);
  return JSON.parse(decoded) as Record<string, unknown>;
}

/**
 * Extracts user info from the ID token.
 */
export function getUserInfoFromToken(idToken: string): UserInfo {
  const payload = decodeJwtPayload(idToken);
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string | undefined) || (payload['cognito:username'] as string | undefined),
    picture: payload.picture as string | undefined,
    emailVerified: payload.email_verified as boolean | undefined,
  };
}
