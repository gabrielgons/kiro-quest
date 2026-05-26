<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    :aria-label="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    @click="toggleTheme"
  >
    <span v-if="isDark">☀️</span>
    <span v-else>🌙</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: center;

  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;

  border: 2px solid var(--color-border);
  border-radius: 50%;
  background-color: var(--color-background-card);
  color: var(--color-text);
  cursor: pointer;
  padding: 0;

  font-size: 1.25rem;
  line-height: 1;

  box-shadow: var(--shadow-md);
  transition: background-color var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.theme-toggle:hover {
  background-color: var(--color-background-secondary);
  border-color: var(--color-border-focus);
}

.theme-toggle:focus-visible {
  outline: 3px solid var(--color-border-focus);
  outline-offset: 2px;
  box-shadow: var(--shadow-md), 0 0 0 3px var(--color-primary-light);
}
</style>
