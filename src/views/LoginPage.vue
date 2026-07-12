<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { login, isAuthenticated } = useAuth();

onMounted(() => {
  if (isAuthenticated.value) {
    router.replace('/stages');
  }
});

async function handleLogin() {
  await login();
}
</script>

<template>
  <div class="login-page">
    <!-- Background decorative elements -->
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="orb orb-indigo" aria-hidden="true"></div>
    <div class="orb orb-emerald" aria-hidden="true"></div>

    <!-- Login card -->
    <div class="login-card">
      <!-- Logo -->
      <div class="logo-container">
        <svg
          class="logo"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="kq-login-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#6366f1" />
              <stop offset="0.55" stop-color="#7c5cf0" />
              <stop offset="1" stop-color="#10b981" />
            </linearGradient>
            <linearGradient id="kq-login-shine" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#ffffff" stop-opacity="0.18" />
              <stop offset="0.6" stop-color="#ffffff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- Shield shape -->
          <path
            d="M12 4 L52 4 Q56 4 56 8 L56 30 Q56 44 32 54 Q8 44 8 30 L8 8 Q8 4 12 4 Z"
            fill="url(#kq-login-grad)"
          />
          <!-- Shine overlay -->
          <path
            d="M12 4 L52 4 Q56 4 56 8 L56 26 Q44 18 32 18 Q20 18 8 26 L8 8 Q8 4 12 4 Z"
            fill="url(#kq-login-shine)"
          />
          <!-- Letter K -->
          <g
            stroke="#ffffff"
            stroke-width="5.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          >
            <line x1="24" y1="15" x2="24" y2="41" />
            <line x1="24" y1="28" x2="38" y2="15" />
            <line x1="24" y1="28" x2="40" y2="41" />
          </g>
          <!-- Sparkle -->
          <path
            d="M47 5 C47.5 9 49 10.5 53 11 C49 11.5 47.5 13 47 17 C46.5 13 45 11.5 41 11 C45 10.5 46.5 9 47 5 Z"
            fill="#ffffff"
          />
        </svg>
      </div>

      <!-- Brand name -->
      <h1 class="brand">
        <span class="brand-kiro">Kiro</span><span class="brand-quest">Quest</span>
      </h1>

      <!-- Headline -->
      <h2 class="headline">Comece sua jornada</h2>

      <!-- Subtitle -->
      <p class="subtitle">
        Teste seus conhecimentos sobre o Kiro e conquiste badges exclusivos
      </p>

      <!-- Google login button -->
      <button class="btn-google" @click="handleLogin">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Continuar com Google</span>
      </button>

      <!-- Security note -->
      <p class="security-note">
        &#x1F512; Login seguro via Google OAuth
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 70%);
  overflow: hidden;
}

/* Subtle grid pattern */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* Decorative orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.orb-indigo {
  top: -10%;
  right: -5%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  filter: blur(120px);
}

.orb-emerald {
  bottom: -10%;
  left: -5%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
  filter: blur(120px);
}

/* Login card with glassmorphism */
.login-card {
  position: relative;
  max-width: 420px;
  width: 100%;
  padding: 48px 40px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  animation: card-entrance 600ms ease-out both;
}

@keyframes card-entrance {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo */
.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.logo {
  width: 64px;
  height: 64px;
}

/* Brand */
.brand {
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.brand-kiro {
  color: #ffffff;
}

.brand-quest {
  color: #10b981;
}

/* Headline */
.headline {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
}

/* Subtitle */
.subtitle {
  margin: 0 0 2rem;
  font-size: 1rem;
  color: #94a3b8;
  line-height: 1.5;
}

/* Google button */
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  height: 52px;
  padding: 0 1.5rem;
  border: none;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-family: var(--font-family-base);
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.btn-google:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
}

.btn-google:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.5);
  outline-offset: 2px;
}

.btn-google:active {
  transform: translateY(0);
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Security note */
.security-note {
  margin: 1.25rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

/* Responsive - mobile */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 20px;
  }

  .headline {
    font-size: 1.25rem;
  }

  .brand {
    font-size: 1.5rem;
  }
}
</style>
