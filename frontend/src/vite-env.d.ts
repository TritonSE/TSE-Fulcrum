/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPLICATION_DEADLINE: string;
  // add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
