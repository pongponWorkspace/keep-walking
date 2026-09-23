/// <reference types="vite/client" />

// Env var names are locked by the tech note (P1-F02-T03). Typed as possibly
// undefined because Vite does not guarantee a build actually sets them
// (config, not a hardcoded literal in source).
interface ImportMetaEnv {
  readonly VITE_TILES_URL?: string;
  readonly VITE_GLYPHS_URL?: string;
  readonly VITE_SPRITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
