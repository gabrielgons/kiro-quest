<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { STAGE_ORDER } from '@/engine/quizEngine';
import StageCard from '@/components/StageCard.vue';
import type { StageStatus } from '@/components/types';
import type { LearningStage } from '@/engine/types';

const router = useRouter();
const { t } = useLocale();
const quizStore = useQuizStore();

function getStageStatus(stage: LearningStage): StageStatus {
  if (quizStore.completedStages.includes(stage)) return 'completed';
  if (quizStore.currentStage === stage && !quizStore.completedStages.includes(stage) &&
      Object.keys(quizStore.userAnswersByStage).includes(stage)) return 'in-progress';
  return 'not-started';
}

const stages = computed(() =>
  STAGE_ORDER.map((stage) => ({
    stage,
    status: getStageStatus(stage),
    isRecommended: quizStore.recommendedNextStage === stage,
  }))
);

function handleSelectStage(stage: LearningStage) {
  quizStore.startStage(stage);
  router.push(`/quiz/${stage}`);
}
</script>

<template>
  <main class="stage-select">
    <h1 class="page-title">{{ t('stage.select') }}</h1>

    <div class="stages-grid">
      <StageCard
        v-for="item in stages"
        :key="item.stage"
        :stage="item.stage"
        :status="item.status"
        :is-recommended="item.isRecommended"
        @select="handleSelectStage"
      />
    </div>
  </main>
</template>

<style scoped>
.stage-select {
  padding: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-align: center;
}

.stages-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
