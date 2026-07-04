/**
 * Typed environment configuration for Kiro Quest.
 *
 * All values are sourced from Vite environment variables (import.meta.env).
 * See .env.development and .env.production for the required variables.
 *
 * Usage:
 *   import { env } from '@/config/environment';
 *   console.log(env.apiUrl);
 */

export interface EnvironmentConfig {
  /** Base URL for the backend API (e.g., https://xxx.execute-api.us-east-1.amazonaws.com) */
  apiUrl: string;

  /** Cognito User Pool ID (e.g., us-east-1_xxxxxxx) */
  cognitoUserPoolId: string;

  /** Cognito App Client ID (public, no secret) */
  cognitoClientId: string;

  /** Cognito Hosted UI domain (e.g., https://kiro-quest.auth.us-east-1.amazoncognito.com) */
  cognitoDomain: string;

  /** OAuth redirect URI after login */
  authRedirectUri: string;

  /** URI to redirect to after logout */
  authLogoutUri: string;

  /** Whether the app is running in production mode */
  isProduction: boolean;

  /** Whether the API backend is configured and available */
  isApiConfigured: boolean;

  /** Whether authentication (Cognito) is configured */
  isAuthConfigured: boolean;
}

function getEnvironmentConfig(): EnvironmentConfig {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const cognitoUserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
  const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
  const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN || '';
  const authRedirectUri =
    import.meta.env.VITE_AUTH_REDIRECT_URI ||
    (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');
  const authLogoutUri =
    import.meta.env.VITE_AUTH_LOGOUT_URI ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return {
    apiUrl,
    cognitoUserPoolId,
    cognitoClientId,
    cognitoDomain,
    authRedirectUri,
    authLogoutUri,
    isProduction: import.meta.env.PROD,
    isApiConfigured: !!apiUrl,
    isAuthConfigured: !!(cognitoClientId && cognitoDomain),
  };
}

/**
 * Singleton environment configuration.
 * Evaluated once at module load time from Vite env variables.
 */
export const env: EnvironmentConfig = getEnvironmentConfig();
