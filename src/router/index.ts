import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route definitions for the Kiro Quiz Game.
 * Uses hash mode for GitHub Pages compatibility (Requirement 11.5).
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
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
