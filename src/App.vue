<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuizStore } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/composables/useTheme';
import { useLocale } from '@/i18n/useLocale';
import ThemeToggle from '@/components/ThemeToggle.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import LoginButton from '@/components/LoginButton.vue';
import UserMenu from '@/components/UserMenu.vue';
import { version } from '../package.json';

const quizStore = useQuizStore();
const authStore = useAuthStore();
const { t } = useLocale();
useTheme();
const showRecoveryError = ref(false);
const appVersion = version;

onMounted(() => {
  const wasCorrupted = quizStore.restoreProgress();
  if (wasCorrupted) {
    showRecoveryError.value = true;
    setTimeout(() => { showRecoveryError.value = false; }, 5000);
    // Attempt cloud recovery as fallback
    void restoreFromCloudIfNeeded();
    return;
  }

  // Fire-and-forget: cloud restore runs in background
  void restoreFromCloudIfNeeded();
});

async function restoreFromCloudIfNeeded() {
  await authStore.initialize();
  if (authStore.isAuthenticated && !quizStore.hasAnyProgress) {
    // Re-check after async boundary to avoid TOCTOU race
    if (quizStore.quizPhase === 'answering' && quizStore.currentQuestionIndex === 0 && !quizStore.isRestoringFromCloud) {
      await quizStore.restoreProgressFromCloud();
    }
  }
}

function dismissError() {
  showRecoveryError.value = false;
}
</script>

<template>
  <!-- Recovery error notification -->
  <div v-if="showRecoveryError" class="notification error" role="alert">
    <p>{{ t('progress.corrupted') }}</p>
    <button @click="dismissError()">{{ t('notification.dismiss') }}</button>
  </div>

  <header class="app-header">
    <LocaleSwitcher />
    <UserMenu />
    <LoginButton />
  </header>

  <ThemeToggle />
  <router-view />

  <span class="app-version">v{{ appVersion }}</span>
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

.app-version {
  position: fixed;
  bottom: 0.5rem;
  left: 0.75rem;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}
</style>
