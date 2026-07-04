import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { STAGE_ORDER } from '@/engine/quizEngine';
import type { LearningStage } from '@/engine/types';
import { useQuizStore } from '@/stores/quizStore';
import { useAuthStore } from '@/stores/authStore';

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
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { skipAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/UserProfile.vue'),
    meta: { requiresAuth: true },
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
 * - Optional auth guard for routes with meta.requiresAuth
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
    const quizStore = useQuizStore();
    if (!quizStore.isAllComplete) {
      return next({ path: '/stages' });
    }
  }

  // Guard /summary/:stage: redirect if stage not completed and quizPhase not stage-complete
  if (to.name === 'summary' && stageParam && VALID_STAGES.has(stageParam)) {
    const quizStore = useQuizStore();
    const isCompleted = quizStore.completedStages.includes(stageParam as LearningStage);
    const isStageComplete = quizStore.quizPhase === 'stage-complete' && quizStore.currentStage === stageParam;

    if (!isCompleted && !isStageComplete) {
      return next({ path: '/stages' });
    }
  }

  // Optional auth guard: routes with meta.requiresAuth redirect to home if not authenticated
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      return next({ path: '/' });
    }
  }

  next();
});

export default router;
