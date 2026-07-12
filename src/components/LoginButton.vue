<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';

const { isConfigured, isAuthenticated, login, isLoading } = useAuth();
</script>

<template>
  <button
    v-if="isConfigured && !isAuthenticated"
    class="login-button"
    :disabled="isLoading"
    @click="login"
  >
    <svg
      class="login-button__icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
    <span class="login-button__text">Entrar</span>
  </button>
</template>

<style scoped>
.login-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  min-height: var(--min-touch-target, 44px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 0.375rem);
  background: var(--color-background-card);
  color: var(--color-text);
  font-size: var(--font-size-sm, 0.875rem);
  cursor: pointer;
  transition: background-color var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
}

.login-button:hover:not(:disabled) {
  background: var(--color-background-secondary);
  border-color: var(--color-primary);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-button__icon {
  flex-shrink: 0;
}

.login-button__text {
  white-space: nowrap;
}
</style>
