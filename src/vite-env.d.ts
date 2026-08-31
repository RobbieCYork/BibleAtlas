/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected at build time by vite-plugin-build-id.ts — a unique id for the currently
// loaded build, used to detect when a newer deployment is available.
declare const __BUILD_ID__: string;
