// SVGO settings for every SVG in art/assets and art/direction/map-style/icons (asset-pipeline 4.1).
// SVGO is not a dependency yet (tools/art has no package.json, ADR 0003 8.1). Run it on demand:
//   pnpm dlx svgo@4 --config tools/art/svgo.config.mjs <file.svg>
// then re-run `pnpm exec tsx tools/art/src/cli.ts validate`. V7 fails if the rift art lost
// stroke-linejoin="miter" / stroke-miterlimit, or if a colour stopped being an uppercase token hex.
export default {
  multipass: true,
  floatPrecision: 2,
  js2svg: { pretty: false },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // viewBox must equal the manifest size (V7).
          removeViewBox: false,
          // Keep uppercase 6-digit token hex and currentColor: V7 matches colours literally.
          convertColors: false,
          // stroke-linejoin="miter" and stroke-miterlimit="4" are the rift exception (style guide 6.2,
          // F-AD-4). The default removes attributes equal to the SVG default (miter, 4): keep them.
          removeUnknownsAndDefaults: false,
          // Internal ids are prefixed with the file name (asset-pipeline 4.1); never rename them.
          cleanupIds: false,
          // Stroke attributes stay on each element so V7 can read them next to fill.
          moveElemsAttrsToGroup: false,
          moveGroupAttrsToElems: false,
          collapseGroups: false,
          // Round cap/join on UI glyphs and the ink.900 0.2 ground shadow must stay as written.
          convertStyleToAttrs: true,
          inlineStyles: false,
        },
      },
    },
  ],
};
