/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Where the downloadable Bible files are served from, if not this app's own /bibles/. */
  readonly VITE_BIBLE_PACK_BASE?: string;
  /** "1" only in local screenshot-fidelity builds (lib/screenCaptureProbe.ts). */
  readonly VITE_CAPTURE_PROBE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected at build time by vite-plugin-build-id.ts — a unique id for the currently
// loaded build, used to detect when a newer deployment is available.
declare const __BUILD_ID__: string;

// Injected at build time by vite-plugin-bible-packs.ts — the downloadable Bible texts in this build.
declare const __BIBLE_CATALOG__: { schema: 1; packs: import("./lib/offline/catalog").CatalogPack[] };
