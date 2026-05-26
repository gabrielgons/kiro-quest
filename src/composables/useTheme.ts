import { ref, computed, readonly, onScopeDispose } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export type Theme = 'light' | 'dark'

export interface UseThemeReturn {
  theme: Readonly<Ref<Theme>>
  isDark: ComputedRef<boolean>
  toggleTheme: () => void
}

export const THEME_STORAGE_KEY = 'kiro-quest-theme'

/**
 * Determines the initial theme by checking localStorage first,
 * falling back to system preference via matchMedia, and defaulting to 'light'.
 *
 * - Wraps localStorage reads in try/catch for private browsing mode
 * - Guards against missing matchMedia API
 * - Always returns exactly 'light' or 'dark'
 */
export function initializeTheme(): Theme {
  // Step 1: Check saved preference in localStorage
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — fall through
  }

  // Step 2: Detect system preference via matchMedia
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }

  // Step 3: Default to light
  return 'light'
}

/**
 * Applies the given theme to the DOM by setting the `data-theme` attribute
 * on `document.documentElement`.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Composable that manages theme state, DOM synchronization, and toggle logic.
 *
 * - Initializes theme from localStorage or system preference
 * - Applies theme to DOM synchronously on execution
 * - Provides reactive `theme` ref and `isDark` computed
 * - `toggleTheme()` flips theme, syncs DOM, and persists to localStorage
 * - Listens for system preference changes when no user preference exists
 * - Cleans up event listener via onScopeDispose
 */
export function useTheme(): UseThemeReturn {
  const theme = ref<Theme>(initializeTheme())
  const isDark = computed(() => theme.value === 'dark')

  // Apply initial theme to DOM synchronously
  applyTheme(theme.value)

  // Track whether user has a saved preference or has toggled manually
  let hasUserPreference = false
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    hasUserPreference = saved === 'light' || saved === 'dark'
  } catch {
    // localStorage unavailable — treat as no user preference
  }

  // Listen for system preference changes (only react when no user preference)
  let mediaQuery: MediaQueryList | null = null
  const handler = (e: MediaQueryListEvent) => {
    if (hasUserPreference) return
    const newTheme: Theme = e.matches ? 'dark' : 'light'
    theme.value = newTheme
    applyTheme(newTheme)
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handler)
  }

  // Cleanup listener when reactive scope is disposed
  onScopeDispose(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handler)
    }
  })

  function toggleTheme(): void {
    const newTheme: Theme = theme.value === 'dark' ? 'light' : 'dark'
    theme.value = newTheme
    applyTheme(newTheme)
    // After manual toggle, stop reacting to system changes
    hasUserPreference = true
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // localStorage unavailable — theme still applied in memory and DOM
    }
  }

  return {
    theme: readonly(theme),
    isDark,
    toggleTheme,
  }
}
