import { ref, type Ref } from 'vue'
import type { LocaleMessages } from './types'

// Import locale messages at build time
import ptBRMessages from '../../content/i18n/pt-BR/ui.json'
import enMessages from '../../content/i18n/en/ui.json'

export type Locale = 'pt-BR' | 'en'

const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'en']

const LOCALE_STORAGE_KEY = 'kiroquest-locale'

// Store loaded locale messages keyed by locale identifier
const loadedMessages: Record<string, LocaleMessages> = {
  'pt-BR': ptBRMessages as LocaleMessages,
  'en': enMessages as LocaleMessages,
}

/**
 * Detect initial locale from localStorage or browser language.
 * Guards against non-browser environments (SSR, Node.js tests without jsdom).
 */
function detectInitialLocale(): Locale {
  // Guard for non-browser environments (SSR, tests without DOM)
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'pt-BR'
  }

  // Check localStorage first
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale
    }
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }

  // Detect from browser language
  const browserLang = navigator.language || ''
  if (browserLang.startsWith('pt')) return 'pt-BR'
  return 'en'
}

// Shared reactive state across all composable instances
const activeLocale: Ref<string> = ref(detectInitialLocale())

/**
 * Vue composable for accessing localized UI strings.
 *
 * - Loads UI labels from locale-specific content files
 * - Falls back to pt-BR when a key is missing in the active locale
 * - Logs a warning in development mode for missing keys
 * - Supports pt-BR and en locales
 * - Persists locale preference to localStorage
 * - Auto-detects locale from browser language on first visit
 * - Supports parameter interpolation: t('key', { name: 'value' })
 */
export function useLocale() {
  const locale = activeLocale

  /**
   * Set the active locale and persist the choice.
   * If messages for the locale are already loaded, reuses them.
   * Accepts any string to allow future extensibility and testing.
   */
  function setLocale(newLocale: Locale | string, messages?: LocaleMessages): void {
    if (messages) {
      loadedMessages[newLocale] = messages
    }
    activeLocale.value = newLocale as Locale

    // Persist choice (guard for non-browser environments)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
      }
    } catch {
      // localStorage unavailable
    }

    // Update document lang attribute (guard for non-browser environments)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale === 'pt-BR' ? 'pt-BR' : 'en'
    }
  }

  /**
   * Returns the translated string for the given key.
   * Falls back to pt-BR if the key is missing in the active locale.
   * Logs a warning in development mode if the key is missing entirely.
   * Supports parameter interpolation: t('key', { name: 'value' })
   */
  function t(key: string, params?: Record<string, string | number>): string {
    const currentLocale = activeLocale.value
    const currentMessages = loadedMessages[currentLocale]
    let value: string | undefined

    // Try active locale first
    if (currentMessages && key in currentMessages) {
      value = currentMessages[key]
    }

    // Fallback to pt-BR
    if (value === undefined) {
      const fallbackMessages = loadedMessages['pt-BR']
      if (fallbackMessages && key in fallbackMessages) {
        if (import.meta.env.DEV && currentLocale !== 'pt-BR') {
          console.warn(
            `[i18n] Missing key "${key}" in locale "${currentLocale}", falling back to pt-BR`
          )
        }
        value = fallbackMessages[key]
      }
    }

    // Key not found in any locale
    if (value === undefined) {
      if (import.meta.env.DEV) {
        console.warn(
          `[i18n] Missing key "${key}" in all locales`
        )
      }
      return key
    }

    // Interpolate parameters: replace all occurrences of {paramName} with value
    if (params) {
      let result = value
      for (const [k, v] of Object.entries(params)) {
        result = result.split(`{${k}}`).join(String(v))
      }
      return result
    }

    return value
  }

  return { locale, t, setLocale, supportedLocales: SUPPORTED_LOCALES }
}
