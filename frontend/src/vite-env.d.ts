/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Nome do município da rede — usado na identidade institucional do AppHeader. */
  readonly VITE_NETWORK_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
