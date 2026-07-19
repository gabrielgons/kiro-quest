<script setup lang="ts">
import { ref } from 'vue';
import { useLocale, type Locale } from '@/i18n/useLocale';

const { locale, setLocale } = useLocale();
const announcement = ref('');

function toggleLocale() {
  const newLocale: Locale = locale.value === 'pt-BR' ? 'en' : 'pt-BR';
  setLocale(newLocale);
  announcement.value = newLocale === 'en' ? 'Language changed to English' : 'Idioma alterado para Português';
}
</script>

<template>
  <button
    class="locale-switcher"
    :aria-label="locale === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'"
    :title="locale === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'"
    @click="toggleLocale"
  >
    <span class="locale-flag" aria-hidden="true">{{ locale === 'pt-BR' ? '🇧🇷' : '🇺🇸' }}</span>
    <span class="locale-label">{{ locale === 'pt-BR' ? 'PT' : 'EN' }}</span>
  </button>
  <span class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
</template>

<style scoped>
.locale-switcher {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--color-surface, #fff);
  border: 1.5px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  min-height: 36px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.locale-switcher:hover {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary-light, #e0e7ff);
}

.locale-switcher:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.locale-flag {
  font-size: 1rem;
  line-height: 1;
}

.locale-label {
  letter-spacing: 0.5px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
