import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import type { UserInfo } from '@/auth';

export interface UseAuthReturn {
  /** Current authenticated user info, or null */
  user: ComputedRef<UserInfo | null>;
  /** Whether the user is currently authenticated */
  isAuthenticated: ComputedRef<boolean>;
  /** Whether auth is configured (Cognito env vars present) */
  isConfigured: ComputedRef<boolean>;
  /** Whether an auth operation is in progress */
  isLoading: ComputedRef<boolean>;
  /** Auth error message, if any */
  error: ComputedRef<string | null>;
  /** Initiate login flow (redirect to Cognito) */
  login: () => Promise<void>;
  /** Logout and redirect to Cognito logout */
  logout: () => void;
  /** User's display name (name or email fallback) */
  displayName: ComputedRef<string>;
  /** User's avatar URL (from Google profile picture) */
  avatarUrl: ComputedRef<string | null>;
}

/**
 * Composable that wraps the auth store for use in components.
 * Provides convenient computed properties and actions.
 */
export function useAuth(): UseAuthReturn {
  const authStore = useAuthStore();

  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isConfigured = computed(() => authStore.isConfigured);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);

  const displayName = computed(() => {
    if (!authStore.user) return '';
    return authStore.user.name || authStore.user.email || '';
  });

  const avatarUrl = computed(() => {
    return authStore.user?.picture ?? null;
  });

  async function login(): Promise<void> {
    await authStore.login();
  }

  function logout(): void {
    authStore.logout();
  }

  return {
    user,
    isAuthenticated,
    isConfigured,
    isLoading,
    error,
    login,
    logout,
    displayName,
    avatarUrl,
  };
}
