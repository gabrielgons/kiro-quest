/**
 * Authentication module public API.
 *
 * Provides a lightweight OIDC client for Amazon Cognito with PKCE flow.
 * No external dependencies - uses native fetch and Web Crypto API.
 */

export { getAuthConfig, isAuthConfigured } from './config';
export { login, logout, handleCallback, refreshTokens, getAccessToken } from './client';
export { getStoredTokens, clearTokens, getUserInfoFromToken, isTokenExpired } from './tokens';
export type { AuthTokens, UserInfo } from './tokens';
export type { AuthConfig } from './config';
