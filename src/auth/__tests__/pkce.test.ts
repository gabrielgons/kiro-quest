import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../pkce';

describe('PKCE utilities', () => {
  describe('generateCodeVerifier', () => {
    it('generates a non-empty string', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeTruthy();
      expect(verifier.length).toBeGreaterThan(0);
    });

    it('generates URL-safe characters only', () => {
      const verifier = generateCodeVerifier();
      // Base64url: only [A-Za-z0-9_-]
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique values each time', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it('generates verifiers of appropriate length (43-128 chars)', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
  });

  describe('generateCodeChallenge', () => {
    it('generates a non-empty string from a verifier', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeTruthy();
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('generates URL-safe characters only', async () => {
      const challenge = await generateCodeChallenge('test-verifier');
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('produces consistent output for same input', async () => {
      const verifier = 'fixed-test-verifier';
      const c1 = await generateCodeChallenge(verifier);
      const c2 = await generateCodeChallenge(verifier);
      expect(c1).toBe(c2);
    });

    it('produces different output for different input', async () => {
      const c1 = await generateCodeChallenge('verifier-1');
      const c2 = await generateCodeChallenge('verifier-2');
      expect(c1).not.toBe(c2);
    });
  });

  describe('generateState', () => {
    it('generates a non-empty string', () => {
      const state = generateState();
      expect(state).toBeTruthy();
      expect(state.length).toBeGreaterThan(0);
    });

    it('generates URL-safe characters only', () => {
      const state = generateState();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique values each time', () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });
  });
});
