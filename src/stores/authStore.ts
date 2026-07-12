import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import {
  isAuthConfigured,
  login as authLogin,
  logout as authLogout,
  handleCallback as authHandleCallback,
  getStoredTokens,
  getUserInfoFromToken,
  isTokenExpired,
  refreshTokens,
} from '@/auth';
import type { UserInfo } from '@/auth';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<UserInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed ---
  const isAuthenticated = computed(() => user.value !== null);
  const isConfigured = computed(() => isAuthConfigured());

  // --- Actions ---

  /**
   * Initializes auth state from stored tokens.
   * Call this on app startup to restore session.
   */
  function initialize(): void {
    if (!isAuthConfigured()) return;

    const tokens = getStoredTokens();
    if (!tokens) return;

    if (isTokenExpired(tokens)) {
      // Try to refresh in the background
      isLoading.value = true;
      refreshTokens()
        .then((refreshed) => {
          if (refreshed) {
            user.value = getUserInfoFromToken(refreshed.idToken);
          } else {
            user.value = null;
          }
        })
        .catch(() => {
          user.value = null;
        })
        .finally(() => {
          isLoading.value = false;
        });
      return;
    }

    try {
      user.value = getUserInfoFromToken(tokens.idToken);
    } catch {
      user.value = null;
    }
  }

  /**
   * Redirects the user to the Cognito hosted UI for login.
   */
  async function login(): Promise<void> {
    error.value = null;
    await authLogin();
  }

  /**
   * Handles the OAuth callback after redirect from Cognito.
   * Extracts user info from the returned tokens.
   */
  async function handleCallback(callbackUrl: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const tokens = await authHandleCallback(callbackUrl);
      if (tokens) {
        user.value = getUserInfoFromToken(tokens.idToken);
        return true;
      } else {
        error.value = 'Falha na autenticacao. Tente novamente.';
        return false;
      }
    } catch (err) {
      error.value = 'Erro inesperado durante autenticacao.';
      console.error('[AuthStore] Callback error:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logs out the user and redirects to Cognito logout.
   */
  function logout(): void {
    user.value = null;
    error.value = null;
    authLogout();
  }

  /**
   * Clears only the local state without redirecting to Cognito.
   * Useful for silent logout or cleanup.
   */
  function clearSession(): void {
    user.value = null;
    error.value = null;
  }

  return {
    // State
    user,
    isLoading,
    error,
    // Computed
    isAuthenticated,
    isConfigured,
    // Actions
    initialize,
    login,
    handleCallback,
    logout,
    clearSession,
  };
});
