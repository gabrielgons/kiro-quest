import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeTokens,
  getStoredTokens,
  clearTokens,
  isTokenExpired,
  decodeJwtPayload,
  getUserInfoFromToken,
} from '../tokens';
import type { AuthTokens } from '../tokens';

// Base64url-encode a string the same way Cognito does: UTF-8 bytes -> base64url.
// Using btoa(JSON.stringify(...)) directly would misrepresent multi-byte
// characters, so we encode UTF-8 first to mirror real tokens.
function base64UrlEncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to create a simple JWT for testing (header.payload.signature)
function createTestJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncodeUtf8(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64UrlEncodeUtf8(JSON.stringify(payload));
  const signature = 'test-signature';
  return `${header}.${body}.${signature}`;
}

describe('tokens', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('storeTokens / getStoredTokens', () => {
    it('stores and retrieves tokens', () => {
      const tokens: AuthTokens = {
        accessToken: 'access-123',
        idToken: 'id-456',
        refreshToken: 'refresh-789',
        expiresAt: Date.now() + 3600000,
      };

      storeTokens(tokens);
      const retrieved = getStoredTokens();

      expect(retrieved).toEqual(tokens);
    });

    it('returns null when no tokens are stored', () => {
      expect(getStoredTokens()).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('removes stored tokens', () => {
      const tokens: AuthTokens = {
        accessToken: 'access-123',
        idToken: 'id-456',
        refreshToken: 'refresh-789',
        expiresAt: Date.now() + 3600000,
      };

      storeTokens(tokens);
      clearTokens();

      expect(getStoredTokens()).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for non-expired tokens', () => {
      const tokens: AuthTokens = {
        accessToken: 'access',
        idToken: 'id',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      expect(isTokenExpired(tokens)).toBe(false);
    });

    it('returns true for expired tokens', () => {
      const tokens: AuthTokens = {
        accessToken: 'access',
        idToken: 'id',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000, // 1 second ago
      };

      expect(isTokenExpired(tokens)).toBe(true);
    });

    it('returns true when token will expire within buffer', () => {
      const tokens: AuthTokens = {
        accessToken: 'access',
        idToken: 'id',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 30000, // 30 seconds from now (within default 60s buffer)
      };

      expect(isTokenExpired(tokens)).toBe(true);
    });

    it('respects custom buffer parameter', () => {
      const tokens: AuthTokens = {
        accessToken: 'access',
        idToken: 'id',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 30000, // 30 seconds from now
      };

      // With 10s buffer, token is not expired
      expect(isTokenExpired(tokens, 10000)).toBe(false);
      // With 60s buffer, token is expired
      expect(isTokenExpired(tokens, 60000)).toBe(true);
    });
  });

  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = createTestJwt(payload);

      const decoded = decodeJwtPayload(token);

      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('throws on invalid JWT format', () => {
      expect(() => decodeJwtPayload('not-a-jwt')).toThrow('Invalid JWT format');
      expect(() => decodeJwtPayload('only.two')).toThrow('Invalid JWT format');
    });

    // Regression: multi-byte UTF-8 characters (accented names) were mangled
    // ("Gonçalves" -> "GonÃ§alves") because atob() yields Latin-1 bytes.
    it('decodes multi-byte UTF-8 characters correctly', () => {
      const payload = {
        sub: 'user-123',
        name: 'Gabriel Gonçalves',
        email: 'gabriel@example.com',
      };
      const token = createTestJwt(payload);

      const decoded = decodeJwtPayload(token);

      expect(decoded.name).toBe('Gabriel Gonçalves');
    });

    it('decodes a range of non-ASCII characters', () => {
      const payload = { name: 'José da Conceição — 日本語 — Müller' };
      const token = createTestJwt(payload);

      const decoded = decodeJwtPayload(token);

      expect(decoded.name).toBe('José da Conceição — 日本語 — Müller');
    });
  });

  describe('getUserInfoFromToken', () => {
    it('extracts user info from id token', () => {
      const payload = {
        sub: 'abc-123',
        email: 'user@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        email_verified: true,
      };
      const token = createTestJwt(payload);

      const userInfo = getUserInfoFromToken(token);

      expect(userInfo.sub).toBe('abc-123');
      expect(userInfo.email).toBe('user@gmail.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.picture).toBe('https://example.com/photo.jpg');
      expect(userInfo.emailVerified).toBe(true);
    });

    it('falls back to cognito:username when name is missing', () => {
      const payload = {
        sub: 'abc-123',
        email: 'user@gmail.com',
        'cognito:username': 'cognito-user',
      };
      const token = createTestJwt(payload);

      const userInfo = getUserInfoFromToken(token);

      expect(userInfo.name).toBe('cognito-user');
    });

    it('preserves accented characters in the display name', () => {
      const payload = {
        sub: 'abc-123',
        email: 'gabriel@gmail.com',
        name: 'Gabriel Gonçalves',
      };
      const token = createTestJwt(payload);

      const userInfo = getUserInfoFromToken(token);

      expect(userInfo.name).toBe('Gabriel Gonçalves');
    });
  });
});
