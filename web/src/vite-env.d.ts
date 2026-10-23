/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SCHEDULER_MODE?: 'browser' | 'cloud';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
