/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0 SPA flow.
 *
 * Implements RFC 7636 using the Web Crypto API for secure code challenge generation.
 */

/**
 * Generates a cryptographically random code verifier string.
 * Must be between 43-128 characters using unreserved URI characters.
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generates a code challenge from the code verifier using SHA-256.
 * The challenge is sent in the authorization request.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64url-encodes a Uint8Array (no padding, URL-safe characters).
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a random state parameter for CSRF protection.
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}
