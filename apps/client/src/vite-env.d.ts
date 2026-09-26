/// <reference types="vite/client" />

// Env var names are locked by the tech note (P1-F02-T03). Typed as possibly
// undefined because Vite does not guarantee a build actually sets them
// (config, not a hardcoded literal in source).
interface ImportMetaEnv {
  readonly VITE_TILES_URL?: string;
  readonly VITE_GLYPHS_URL?: string;
  readonly VITE_SPRITE_URL?: string;
  // TL B-10 (P2-F04-T25, docs/tech/F04-dungeon-presence.md section 17): build profile ('dev' |
  // 'playtest') and short git SHA, set only by the deploy-preview workflow (P2-F05-T14).
  readonly VITE_KW_PROFILE?: string;
  readonly VITE_KW_COMMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
