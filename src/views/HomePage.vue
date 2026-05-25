<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';

const router = useRouter();
const { t } = useLocale();
const quizStore = useQuizStore();

const showConfirmDialog = ref(false);

const hasProgress = computed(() => {
  return quizStore.completedStages.length > 0 ||
    Object.keys(quizStore.userAnswersByStage).length > 0;
});

function handleStart() {
  router.push('/stages');
}

function handleContinue() {
  quizStore.restoreProgress();
  if (quizStore.quizPhase === 'stage-complete') {
    router.push(`/summary/${quizStore.currentStage}`);
  } else {
    router.push(`/quiz/${quizStore.currentStage}`);
  }
}

function handleRestart() {
  showConfirmDialog.value = true;
}

function confirmRestart() {
  quizStore.resetProgress();
  showConfirmDialog.value = false;
  router.push('/stages');
}

function cancelRestart() {
  showConfirmDialog.value = false;
}
</script>

<template>
  <main class="home">
    <div class="content">
      <h1 class="title">{{ t('app.title') }}</h1>
      <p class="subtitle">{{ t('home.subtitle') }}</p>
      <p class="welcome">{{ t('home.welcome') }}</p>

      <div class="actions">
        <template v-if="!hasProgress">
          <button class="btn-primary" @click="handleStart">
            {{ t('home.start') }}
          </button>
        </template>

        <template v-else>
          <button class="btn-primary" @click="handleContinue">
            {{ t('home.resume') }}
          </button>
          <button class="btn-secondary" @click="handleRestart">
            {{ t('home.restart') }}
          </button>
        </template>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="dialog-overlay" @click.self="cancelRestart">
      <div class="dialog" role="alertdialog" aria-labelledby="restart-title">
        <p id="restart-title" class="dialog-text">{{ t('home.restartConfirm') }}</p>
        <div class="dialog-actions">
          <button class="btn-danger" @click="confirmRestart">
            {{ t('home.restartConfirmYes') }}
          </button>
          <button class="btn-secondary" @click="cancelRestart">
            {{ t('home.restartConfirmNo') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.content {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.title {
  font-size: 2.5rem;
  color: var(--color-primary, #3b82f6);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 1rem;
}

.welcome {
  font-size: 1rem;
  color: var(--color-text, #1f2937);
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  font-size: 1.125rem;
  background-color: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  min-width: 240px;
  min-height: 44px;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark, #2563eb);
}

.btn-primary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  min-width: 240px;
  min-height: 44px;
}

.btn-secondary:hover {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}

.btn-secondary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-danger {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background-color: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
}

.btn-danger:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-surface, #fff);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.dialog-text {
  margin-bottom: 1.5rem;
  font-size: 1rem;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
</style>
