/**
 * Cognito authentication configuration.
 *
 * These values are populated from environment variables at build time.
 * For local development, create a .env.local file with:
 *   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
 *   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
 *   VITE_COGNITO_DOMAIN=https://kiro-quest.auth.us-east-1.amazoncognito.com
 *   VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
 *   VITE_AUTH_LOGOUT_URI=http://localhost:5173/
 */
export interface AuthConfig {
  /** Cognito User Pool ID (e.g., us-east-1_xxxxxxx) */
  userPoolId: string;
  /** Cognito App Client ID (no secret - SPA with PKCE) */
  clientId: string;
  /** Cognito hosted UI domain URL (e.g., https://kiro-quest.auth.us-east-1.amazoncognito.com) */
  domain: string;
  /** OAuth redirect URI after login */
  redirectUri: string;
  /** URI to redirect to after logout */
  logoutUri: string;
  /** OAuth scopes to request */
  scopes: string[];
}

export function getAuthConfig(): AuthConfig {
  return {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
    redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    logoutUri: import.meta.env.VITE_AUTH_LOGOUT_URI || window.location.origin,
    scopes: ['openid', 'email', 'profile'],
  };
}

/**
 * Returns true if auth is configured (all required values present).
 * The app remains fully functional without auth.
 */
export function isAuthConfigured(): boolean {
  const config = getAuthConfig();
  return !!(config.clientId && config.domain);
}
