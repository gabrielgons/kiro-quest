<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useProgressStore } from '@/stores/progressStore';

const router = useRouter();
const { t } = useLocale();
const progressStore = useProgressStore();

const hasProgress = progressStore.currentProgress.completedStages.length > 0;

function handleStart() {
  router.push('/stages');
}
</script>

<template>
  <main :class="$style.home">
    <div :class="$style.content">
      <h1 :class="$style.title">{{ t('app.title') }}</h1>
      <p :class="$style.subtitle">{{ t('home.subtitle') }}</p>
      <p :class="$style.welcome">{{ t('home.welcome') }}</p>

      <div :class="$style.actions">
        <button
          :class="$style.startButton"
          @click="handleStart"
          @keydown.enter="handleStart"
        >
          {{ hasProgress ? t('home.resume') : t('home.start') }}
        </button>
      </div>
    </div>
  </main>
</template>

<style module>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-lg);
}

.content {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.title {
  font-size: var(--font-size-xxl, 2.5rem);
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.subtitle {
  font-size: var(--font-size-lg, 1.25rem);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.welcome {
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}

.actions {
  display: flex;
  justify-content: center;
}

.startButton {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-lg, 1.25rem);
  background-color: var(--color-primary);
  color: var(--color-white, #fff);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  min-width: 200px;
  min-height: 44px;
  transition: background-color 0.2s ease;
}

.startButton:hover {
  background-color: var(--color-primary-dark);
}

.startButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
