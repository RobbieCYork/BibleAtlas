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

// Injected at build time by vite-plugin-paid-content.ts from paid-content.config.json: where the
// paid part of each article comes from — 'bundle' (shipped in the JS, as before sql/043) or
// 'server' (content_paid, behind has_entitlement('plus')). See src/lib/paidContent.ts.
declare const __PAID_CONTENT_SOURCE__: "bundle" | "server";
