import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthConfig, isAuthConfigured } from '../config';

describe('auth config', () => {
  beforeEach(() => {
    // Reset env vars for each test
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', '');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', '');
    vi.stubEnv('VITE_COGNITO_DOMAIN', '');
    vi.stubEnv('VITE_AUTH_REDIRECT_URI', '');
    vi.stubEnv('VITE_AUTH_LOGOUT_URI', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isAuthConfigured', () => {
    it('returns false when no config is set', () => {
      expect(isAuthConfigured()).toBe(false);
    });

    it('returns false when only clientId is set', () => {
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
      expect(isAuthConfigured()).toBe(false);
    });

    it('returns true when clientId and domain are set', () => {
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
      vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://test.auth.us-east-1.amazoncognito.com');
      expect(isAuthConfigured()).toBe(true);
    });
  });

  describe('getAuthConfig', () => {
    it('returns config with default scopes', () => {
      const config = getAuthConfig();
      expect(config.scopes).toEqual(['openid', 'email', 'profile']);
    });

    it('returns configured values', () => {
      vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_test');
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'my-client-id');
      vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://myapp.auth.us-east-1.amazoncognito.com');

      const config = getAuthConfig();

      expect(config.userPoolId).toBe('us-east-1_test');
      expect(config.clientId).toBe('my-client-id');
      expect(config.domain).toBe('https://myapp.auth.us-east-1.amazoncognito.com');
    });

    // Regression: trailing whitespace in .env files leaked into OAuth URLs as
    // "%20"/"+", producing an invalid Cognito authorize URL (DNS_PROBE / Invalid state).
    it('trims surrounding whitespace from all values', () => {
      vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_test ');
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', ' my-client-id ');
      vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://myapp.auth.us-east-1.amazoncognito.com ');
      vi.stubEnv('VITE_AUTH_REDIRECT_URI', 'https://app.example.com/auth/callback ');
      vi.stubEnv('VITE_AUTH_LOGOUT_URI', ' https://app.example.com/ ');

      const config = getAuthConfig();

      expect(config.userPoolId).toBe('us-east-1_test');
      expect(config.clientId).toBe('my-client-id');
      expect(config.domain).toBe('https://myapp.auth.us-east-1.amazoncognito.com');
      expect(config.redirectUri).toBe('https://app.example.com/auth/callback');
      expect(config.logoutUri).toBe('https://app.example.com/');
    });

    it('reports configured when values have trailing whitespace', () => {
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'my-client-id ');
      vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://myapp.auth.us-east-1.amazoncognito.com ');
      expect(isAuthConfigured()).toBe(true);
    });
  });
});
