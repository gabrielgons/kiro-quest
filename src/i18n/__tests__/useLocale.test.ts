import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLocale } from '../useLocale'

describe('useLocale', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Reset locale to pt-BR before each test
    const { setLocale } = useLocale()
    setLocale('pt-BR')
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns the default locale as pt-BR', () => {
    const { locale } = useLocale()
    expect(locale.value).toBe('pt-BR')
  })

  it('returns a translated string for a known key', () => {
    const { t } = useLocale()
    expect(t('app.title')).toBe('Kiro Quiz Game')
  })

  it('returns the key itself when not found in any locale', () => {
    const { t } = useLocale()
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('falls back to pt-BR when key is missing in active locale', () => {
    const { t, setLocale } = useLocale()

    // Set a new locale with partial messages
    setLocale('en-US', { 'app.title': 'Kiro Quiz Game (EN)' })

    // Key exists in en-US
    expect(t('app.title')).toBe('Kiro Quiz Game (EN)')

    // Key missing in en-US, falls back to pt-BR
    expect(t('home.welcome')).toBe('Teste seus conhecimentos sobre Kiro!')
  })

  it('logs a warning in dev mode when falling back to pt-BR', () => {
    const { t, setLocale } = useLocale()

    setLocale('en-US', { 'app.title': 'Kiro Quiz Game (EN)' })

    // Access a key that only exists in pt-BR
    t('home.welcome')

    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Missing key "home.welcome" in locale "en-US", falling back to pt-BR'
    )
  })

  it('logs a warning in dev mode when key is missing in all locales', () => {
    const { t } = useLocale()

    t('totally.missing.key')

    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Missing key "totally.missing.key" in all locales'
    )
  })

  it('does not log a warning when key exists in active locale', () => {
    const { t } = useLocale()

    t('app.title')

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('allows changing the active locale', () => {
    const { locale, setLocale } = useLocale()

    setLocale('en-US', { 'app.title': 'Kiro Quiz (EN)' })

    expect(locale.value).toBe('en-US')
  })

  it('shares locale state across multiple composable instances', () => {
    const instance1 = useLocale()
    const instance2 = useLocale()

    instance1.setLocale('en-US', { 'app.title': 'English Title' })

    expect(instance2.locale.value).toBe('en-US')
    expect(instance2.t('app.title')).toBe('English Title')
  })

  it('returns pt-BR values when active locale has no messages loaded', () => {
    const { t, setLocale } = useLocale()

    // Set locale without providing messages
    setLocale('fr-FR')

    // Should fall back to pt-BR
    expect(t('app.title')).toBe('Kiro Quiz Game')
  })
})
