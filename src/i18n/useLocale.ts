import { ref, type Ref } from 'vue'
import type { LocaleMessages } from './types'

// Import the default pt-BR locale messages at build time
import ptBRMessages from '../../content/i18n/pt-BR/ui.json'

type Locale = 'pt-BR' | string

// Store loaded locale messages keyed by locale identifier
const loadedMessages: Record<string, LocaleMessages> = {
  'pt-BR': ptBRMessages as LocaleMessages,
}

// Shared reactive state across all composable instances
const activeLocale: Ref<Locale> = ref('pt-BR')

/**
 * Vue composable for accessing localized UI strings.
 *
 * - Loads UI labels from locale-specific content files
 * - Falls back to pt-BR when a key is missing in the active locale
 * - Logs a warning in development mode for missing keys
 * - Defaults to pt-BR for MVP
 */
export function useLocale() {
  const locale = activeLocale

  /**
   * Set the active locale and load its messages.
   * If messages for the locale are already loaded, reuses them.
   */
  function setLocale(newLocale: Locale, messages?: LocaleMessages): void {
    if (messages) {
      loadedMessages[newLocale] = messages
    }
    activeLocale.value = newLocale
  }

  /**
   * Returns the translated string for the given key.
   * Falls back to pt-BR if the key is missing in the active locale.
   * Logs a warning in development mode if the key is missing entirely.
   */
  function t(key: string): string {
    const currentLocale = activeLocale.value
    const currentMessages = loadedMessages[currentLocale]

    // Try active locale first
    if (currentMessages && key in currentMessages) {
      return currentMessages[key]
    }

    // Fallback to pt-BR
    const fallbackMessages = loadedMessages['pt-BR']
    if (fallbackMessages && key in fallbackMessages) {
      if (import.meta.env.DEV && currentLocale !== 'pt-BR') {
        console.warn(
          `[i18n] Missing key "${key}" in locale "${currentLocale}", falling back to pt-BR`
        )
      }
      return fallbackMessages[key]
    }

    // Key not found in any locale
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] Missing key "${key}" in all locales`
      )
    }

    return key
  }

  return { locale, t, setLocale }
}
