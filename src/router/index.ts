import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { STAGE_ORDER } from '@/engine/quizEngine';
import type { LearningStage } from '@/engine/types';

/**
 * Valid stage identifiers for route parameter validation.
 */
const VALID_STAGES: Set<string> = new Set(STAGE_ORDER);

/**
 * Route definitions for the Kiro Quiz Game.
 * Uses hash mode for GitHub Pages compatibility.
 * All view components are lazy-loaded for code splitting.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
  },
  {
    path: '/stages',
    name: 'stages',
    component: () => import('@/views/StageSelect.vue'),
  },
  {
    path: '/quiz/:stage',
    name: 'quiz',
    component: () => import('@/views/QuizFlow.vue'),
    props: true,
  },
  {
    path: '/summary/:stage',
    name: 'summary',
    component: () => import('@/views/StageSummary.vue'),
    props: true,
  },
  {
    path: '/achievement',
    name: 'achievement',
    component: () => import('@/views/FinalAchievement.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/stages',
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Navigation guards:
 * - Validate :stage params against LearningStage union
 * - Guard /achievement route (requires all stages complete)
 * - Guard /summary/:stage route (requires stage completion)
 */
router.beforeEach((to, _from, next) => {
  const stageParam = to.params.stage as string | undefined;

  // Validate :stage parameter for quiz and summary routes
  if ((to.name === 'quiz' || to.name === 'summary') && stageParam) {
    if (!VALID_STAGES.has(stageParam)) {
      return next({ path: '/stages' });
    }
  }

  // Guard /achievement: redirect if not all stages complete
  if (to.name === 'achievement') {
    // Lazy import to avoid circular dependency at module init
    import('@/stores/quizStore').then(({ useQuizStore }) => {
      const quizStore = useQuizStore();
      if (!quizStore.isAllComplete) {
        next({ path: '/stages' });
      } else {
        next();
      }
    });
    return;
  }

  // Guard /summary/:stage: redirect if stage not completed and quizPhase not stage-complete
  if (to.name === 'summary' && stageParam && VALID_STAGES.has(stageParam)) {
    import('@/stores/quizStore').then(({ useQuizStore }) => {
      const quizStore = useQuizStore();
      const isCompleted = quizStore.completedStages.includes(stageParam as LearningStage);
      const isStageComplete = quizStore.quizPhase === 'stage-complete' && quizStore.currentStage === stageParam;

      if (!isCompleted && !isStageComplete) {
        next({ path: '/stages' });
      } else {
        next();
      }
    });
    return;
  }

  next();
});

export default router;
