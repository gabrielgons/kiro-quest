<script setup lang="ts">
import { useLocale } from '@/i18n/useLocale';
import type { MistakeItem } from './types';

defineProps<{
  mistakes: MistakeItem[];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="mistake-review">
    <h3 class="review-title">{{ t('review.title') }}</h3>
    <div
      v-for="(mistake, index) in mistakes"
      :key="index"
      class="mistake-card"
    >
      <p class="mistake-question">{{ mistake.questionText }}</p>
      <p class="mistake-user-answer">
        <span class="label">{{ t('review.yourAnswer') }}</span> {{ mistake.userAnswerLabel }}
      </p>
      <p class="mistake-correct-answer">
        <span class="label">{{ t('review.correctAnswer') }}</span> {{ mistake.correctAnswerLabel }}
      </p>
      <p class="mistake-explanation">{{ mistake.explanation }}</p>
      <a
        v-if="mistake.sourceUrl"
        :href="mistake.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="source-link"
      >
        {{ t('feedback.source') }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.mistake-review {
  margin-top: 1.5rem;
}

.review-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.mistake-card {
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  margin-bottom: 1rem;
  background: var(--color-surface, #fff);
}

.mistake-question {
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.mistake-user-answer {
  color: var(--color-error, #dc2626);
  margin-bottom: 0.25rem;
}

.mistake-correct-answer {
  color: var(--color-success, #16a34a);
  margin-bottom: 0.5rem;
}

.label {
  font-weight: 600;
}

.mistake-explanation {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.source-link {
  color: var(--color-primary, #3b82f6);
  text-decoration: underline;
  font-size: 0.875rem;
}
</style>
