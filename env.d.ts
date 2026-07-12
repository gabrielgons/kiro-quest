/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_AUTH_REDIRECT_URI: string
  readonly VITE_AUTH_LOGOUT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}

declare module 'vue-router' {
  interface RouteMeta {
    /** If true, route requires authentication */
    requiresAuth?: boolean
    /** If true, skip auth checks (e.g., callback route) */
    skipAuth?: boolean
  }
}
