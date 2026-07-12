<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuizStore } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/composables/useTheme';
import ThemeToggle from '@/components/ThemeToggle.vue';
import LoginButton from '@/components/LoginButton.vue';
import UserMenu from '@/components/UserMenu.vue';

const quizStore = useQuizStore();
const authStore = useAuthStore();
useTheme();
const showRecoveryError = ref(false);

onMounted(() => {
  // Restore auth session from stored tokens (if any)
  authStore.initialize();

  const wasCorrupted = quizStore.restoreProgress();

  if (wasCorrupted) {
    showRecoveryError.value = true;
    setTimeout(() => { showRecoveryError.value = false; }, 5000);
  }
});

function dismissError() {
  showRecoveryError.value = false;
}
</script>

<template>
  <!-- Recovery error notification -->
  <div v-if="showRecoveryError" class="notification error" role="alert">
    <p>Progresso anterior não pôde ser recuperado</p>
    <button @click="dismissError()">Fechar</button>
  </div>

  <header class="app-header">
    <UserMenu />
    <LoginButton />
  </header>

  <ThemeToggle />
  <router-view />
</template>

<style>
#app {
  font-family: var(--font-family-base);
  color: var(--color-text);
  background-color: var(--color-background);
  min-height: 100vh;
}

.app-header {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notification {
  position: fixed;
  top: var(--spacing-md);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  max-width: 90%;
}

.notification.error {
  background: var(--color-error-light);
  border: 1px solid var(--color-error);
  color: var(--color-error-dark);
}

.notification button {
  background: none;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  color: inherit;
  font-size: var(--font-size-sm);
}
</style>
