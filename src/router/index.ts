import { createRouter, createWebHistory } from 'vue-router';
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
 * Uses HTML5 history mode (path-based) so OAuth redirect URIs like
 * /auth/callback work without a fragment. CloudFront rewrites non-file
 * paths to /index.html (see FrontendStack SpaRoutingFunction).
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
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { skipAuth: true },
    beforeEnter: () => {
      const authStore = useAuthStore();
      if (authStore.isAuthenticated) {
        return { name: 'stages' };
      }
    },
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
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Navigation guards:
 * - Redirect legacy hash-based URLs (#/) to equivalent history paths
 * - Validate :stage params against LearningStage union
 * - Guard /achievement route (requires all stages complete)
 * - Guard /summary/:stage route (requires stage completion)
 * - Optional auth guard for routes with meta.requiresAuth
 */
router.beforeEach((to, _from, next) => {
  // Handle legacy hash-based URLs: redirect /#/path to /path
  if (to.fullPath === '/' && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1); // Remove the '#'
    return next(hashPath);
  }

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
