/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_PROJECT_URL?: string;
  readonly VITE_STATIC_STORY?: string;
  readonly VITE_STORY_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
