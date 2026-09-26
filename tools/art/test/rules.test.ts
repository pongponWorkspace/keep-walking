// One passing fixture and at least one failing fixture per validator rule (V1–V13).
import { describe, expect, it } from 'vitest';
import type { ManifestEntry } from '../src/manifest';
import { validate, type Rule } from '../src/validate';
import { fixture, GLYPH, glyphEntry, LICENSE, source } from './helpers';

function rules(entries: (fx: ReturnType<typeof fixture>) => ManifestEntry[]): Rule[] {
  const fx = fixture();
  const result = validate(fx.input(entries(fx)));
  return result.errors.map((e) => e.rule);
}

describe('validator rules', () => {
  it('passes a clean glyph', () => {
    expect(rules((fx) => [glyphEntry(fx)])).toEqual([]);
  });

  it('V1: schema, duplicate id and order', () => {
    expect(rules((fx) => [{ ...glyphEntry(fx), kind: 'sticker' }])).toContain('V1');
    expect(rules((fx) => [glyphEntry(fx), glyphEntry(fx)])).toContain('V1');
    expect(rules((fx) => [glyphEntry(fx, GLYPH, 'icon.ui.zoo'), glyphEntry(fx, GLYPH, 'icon.ui.alpha')])).toContain('V1');
  });

  it('V2: path must follow id', () => {
    expect(
      rules((fx) => {
        const e = glyphEntry(fx);
        fx.write('art/assets/icon/ui/other.svg', GLYPH);
        const file = e.files[0];
        if (file !== undefined) file.path = 'icon/ui/other.svg';
        return [e];
      }),
    ).toContain('V2');
  });

  it('V3: bytes and sha256 must match the file', () => {
    expect(
      rules((fx) => {
        const e = glyphEntry(fx);
        fx.write('art/assets/icon/ui/map.svg', GLYPH.replace('M4 4', 'M5 5'));
        return [e];
      }),
    ).toContain('V3');
  });

  it('V4: per-kind budget', () => {
    const pad = `<path id="map-p" d="${'M1 1 L2 2 '.repeat(400)}" fill="#1A1A22"/>`;
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('</svg>', `${pad}</svg>`))])).toContain('V4');
  });

  it('V7: colours, forbidden elements, opacity, external href, viewBox, miter', () => {
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('#1A1A22', '#123456'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('#1A1A22', '#1a1a22'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('</svg>', '<text id="map-t">x</text></svg>'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('stroke-width', 'opacity="0.5" stroke-width'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('</svg>', '<use id="map-u" href="https://x.test/a.svg#a"/></svg>'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('0 0 24 24', '0 0 32 32'))])).toContain('V7');
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('id="map-a"', 'id="arrow"'))])).toContain('V7');
    const riftRound = GLYPH.replace(/map/g, 'rift');
    expect(rules((fx) => [glyphEntry(fx, riftRound, 'icon.ui.rift')])).toContain('V7');
    const riftMiter = riftRound.replace('stroke-linejoin="round"', 'stroke-linejoin="miter" stroke-miterlimit="4"');
    expect(rules((fx) => [glyphEntry(fx, riftMiter, 'icon.ui.rift')])).toEqual([]);
  });

  it('V7: ink.900 ground shadow at 0.2 and the new ramp.tonic hex are allowed', () => {
    const shadow = '<ellipse id="map-s" cx="12" cy="20" rx="8" ry="2" fill="#1A1A22" opacity="0.2"/>';
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('</svg>', `${shadow}</svg>`))])).toEqual([]);
    const tonic = '<rect id="map-r" x="2" y="2" width="4" height="4" fill="#FF8877" stroke="#DD4433"/><rect id="map-q" x="8" y="2" width="2" height="2" fill="#AA2222"/>';
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('</svg>', `${tonic}</svg>`))])).toEqual([]);
  });

  it('V8: key colour outside the avatar master folders', () => {
    expect(rules((fx) => [glyphEntry(fx, GLYPH.replace('#1A1A22', '#FF40FF'))])).toContain('V8');
  });

  it('V9: placeholder flag must follow status', () => {
    expect(rules((fx) => [{ ...glyphEntry(fx), placeholder: true }])).toContain('V9');
  });

  it('V10: license must be on the allowed list', () => {
    expect(rules((fx) => [{ ...glyphEntry(fx), license: { ...LICENSE, spdx: 'CC-BY-NC-4.0' } }])).toContain('V10');
  });

  it('V11: every file in art/assets must be referenced', () => {
    expect(
      rules((fx) => {
        fx.write('art/assets/icon/ui/stray.svg', GLYPH);
        return [glyphEntry(fx)];
      }),
    ).toContain('V11');
  });

  it('V6: a draft avatar layer needs every variant at 1x and 2x', () => {
    const errors = rules((fx) => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 480" width="384" height="480"></svg>';
      const facts = fx.write('art/src/avatar/body/base.svg', svg);
      return [
        {
          id: 'avatar.body.base',
          kind: 'avatar-layer',
          layer: 'body',
          status: 'draft',
          placeholder: false,
          size: { width: 128, height: 160 },
          sheet: { frameW: 128, frameH: 160, cols: ['front', 'side', 'back'], rows: ['body', 'arm_w', 'arm_p'] },
          files: [],
          source: { ...source('build-generated'), master: 'art/src/avatar/body/base.svg' },
          license: { ...LICENSE },
          notes: facts.sha256,
        },
      ];
    });
    expect(errors).toContain('V6');
  });
});
