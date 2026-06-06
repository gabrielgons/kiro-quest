<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import NameInputModal from '@/components/NameInputModal.vue';
import ShareBadgeButton from '@/components/ShareBadgeButton.vue';
import type { CertificateRendererOptions } from '@/badges';

const router = useRouter();
const { t } = useLocale();
const quizStore = useQuizStore();

/** Total number of learning stages in the trail. */
const TOTAL_STAGES = 11;

/** Controls visibility of the name-entry modal. */
const showNameModal = ref(false);
/** Whether the certificate generation UI has been revealed. */
const showCertificate = ref(false);
/** The name to print on the certificate (empty uses a fallback). */
const userName = ref('');

/** Aggregate completion statistics passed to the certificate renderer. */
const certificateStats = computed<CertificateRendererOptions['stats']>(() => ({
  totalCorrect: quizStore.correctAnswerCount,
  totalQuestions: quizStore.questionsAnswered,
  percentage: quizStore.overallPercentage,
  completedStages: TOTAL_STAGES,
}));

onMounted(() => {
  if (!quizStore.isAllComplete) {
    router.replace('/stages');
  }
});

function handleOpenNameModal() {
  showNameModal.value = true;
}

function handleConfirmName(name: string) {
  userName.value = name;
  showNameModal.value = false;
  showCertificate.value = true;
}

function handleSkipName() {
  userName.value = '';
  showNameModal.value = false;
  showCertificate.value = true;
}

function handleCloseModal() {
  showNameModal.value = false;
}

function handleBackToStages() {
  router.push('/stages');
}

function handleBackToHome() {
  router.push('/');
}
</script>

<template>
  <main v-if="quizStore.isAllComplete" class="achievement">
    <div class="content">
      <h1 class="title">{{ t('achievement.title') }}</h1>
      <p class="subtitle">{{ t('achievement.subtitle') }}</p>

      <div class="stats">
        <p class="percentage">{{ quizStore.overallPercentage }}%</p>
        <p class="performance-level">{{ quizStore.performanceLevel }}</p>
        <p class="score-detail">
          {{ quizStore.correctAnswerCount }} de {{ quizStore.questionsAnswered }}
        </p>
      </div>

      <div class="certificate-section">
        <button
          v-if="!showCertificate"
          class="btn-primary"
          @click="handleOpenNameModal"
        >
          Gerar Certificado
        </button>

        <ShareBadgeButton
          v-else
          type="certificate"
          :stats="certificateStats"
          :performance-level="quizStore.performanceLevel"
          :user-name="userName"
        />
      </div>

      <div class="actions">
        <button class="btn-secondary" @click="handleBackToStages">
          {{ t('achievement.backToStages') }}
        </button>
        <button class="btn-link" @click="handleBackToHome">
          {{ t('achievement.backToHome') }}
        </button>
      </div>
    </div>

    <NameInputModal
      :visible="showNameModal"
      @confirm="handleConfirmName"
      @skip="handleSkipName"
      @close="handleCloseModal"
    />
  </main>
</template>

<style scoped>
.achievement {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.content {
  text-align: center;
  max-width: 500px;
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
  margin-bottom: 2rem;
}

.stats {
  padding: 2rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  margin-bottom: 2rem;
  background: var(--color-surface, #fff);
}

.percentage {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
  margin-bottom: 0.5rem;
}

.performance-level {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  margin-bottom: 0.5rem;
}

.score-detail {
  font-size: 1rem;
  color: var(--color-text-secondary, #6b7280);
}

.certificate-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background-color: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  min-width: 200px;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover, #2563eb);
}

.btn-primary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: transparent;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  min-width: 200px;
}

.btn-secondary:hover {
  border-color: var(--color-primary, #3b82f6);
}

.btn-secondary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.875rem;
  min-height: 44px;
}

.btn-link:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}
</style>
