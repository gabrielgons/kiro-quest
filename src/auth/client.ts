/**
 * Lightweight OAuth 2.0 / OIDC client for Cognito.
 *
 * Implements the Authorization Code flow with PKCE for SPAs.
 * No external dependencies - uses fetch and Web Crypto API.
 */

import { getAuthConfig, isAuthConfigured } from './config';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';
import type { AuthTokens } from './tokens';
import { storeTokens, getStoredTokens, clearTokens, isTokenExpired } from './tokens';

const VERIFIER_KEY = 'kiro-quest:auth:pkce_verifier';
const STATE_KEY = 'kiro-quest:auth:state';

/**
 * Initiates the login flow by redirecting to the Cognito hosted UI.
 * Generates PKCE code verifier/challenge and stores verifier for the callback.
 */
export async function login(): Promise<void> {
  if (!isAuthConfigured()) {
    console.warn('[Auth] Authentication is not configured. Set VITE_COGNITO_* env vars.');
    return;
  }

  const config = getAuthConfig();
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  // Store verifier and state for callback validation
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${config.domain}/oauth2/authorize?${params.toString()}`;
}

/**
 * Handles the OAuth callback by exchanging the authorization code for tokens.
 * Should be called when the user is redirected back to the app.
 *
 * @returns The auth tokens if successful, null otherwise.
 */
export async function handleCallback(callbackUrl: string): Promise<AuthTokens | null> {
  if (!isAuthConfigured()) return null;

  const config = getAuthConfig();
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('[Auth] OAuth error:', error, url.searchParams.get('error_description'));
    cleanup();
    return null;
  }

  if (!code) {
    console.error('[Auth] No authorization code in callback URL');
    cleanup();
    return null;
  }

  // Validate state parameter (CSRF protection)
  const storedState = sessionStorage.getItem(STATE_KEY);
  if (!storedState || storedState !== state) {
    console.error('[Auth] State mismatch - possible CSRF attack');
    cleanup();
    return null;
  }

  // Retrieve PKCE verifier
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    console.error('[Auth] No PKCE verifier found - login flow may have been interrupted');
    cleanup();
    return null;
  }

  // Exchange code for tokens
  const tokenEndpoint = `${config.domain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Auth] Token exchange failed:', response.status, errorBody);
      cleanup();
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      id_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const tokens: AuthTokens = {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    storeTokens(tokens);
    cleanup();
    return tokens;
  } catch (err) {
    console.error('[Auth] Token exchange network error:', err);
    cleanup();
    return null;
  }
}

/**
 * Refreshes the access token using the refresh token.
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  if (!isAuthConfigured()) return null;

  const stored = getStoredTokens();
  if (!stored?.refreshToken) return null;

  const config = getAuthConfig();
  const tokenEndpoint = `${config.domain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: stored.refreshToken,
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', response.status);
      clearTokens();
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      id_token: string;
      expires_in: number;
    };

    const tokens: AuthTokens = {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: stored.refreshToken, // Refresh token is not returned on refresh
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    storeTokens(tokens);
    return tokens;
  } catch (err) {
    console.error('[Auth] Token refresh network error:', err);
    return null;
  }
}

/**
 * Logs out the user by clearing tokens and redirecting to Cognito logout endpoint.
 */
export function logout(): void {
  clearTokens();

  if (!isAuthConfigured()) return;

  const config = getAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.logoutUri,
  });

  window.location.href = `${config.domain}/logout?${params.toString()}`;
}

/**
 * Returns the current valid access token, refreshing if needed.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (isTokenExpired(tokens)) {
    const refreshed = await refreshTokens();
    return refreshed?.accessToken ?? null;
  }

  return tokens.accessToken;
}

/**
 * Cleans up session storage after callback handling.
 */
function cleanup(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}
