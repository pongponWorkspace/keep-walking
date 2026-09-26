import { describe, expect, it } from 'vitest';
import {
  appleMapsWalkingUrl,
  googleMapsWalkingUrl,
  isIosLike,
  isSafeNavUrl,
  navUrlFor,
  primaryNavTarget,
} from './links';

const LAT = 13.7627981;
const LNG = 100.4944865;

describe('googleMapsWalkingUrl / appleMapsWalkingUrl', () => {
  it('rounds to 5 decimals and never carries an API key', () => {
    const url = googleMapsWalkingUrl(LAT, LNG);
    expect(url).toContain('destination=13.7628%2C100.49449');
    expect(url).toContain('travelmode=walking');
    expect(url).not.toContain('key=');
    expect(url).not.toContain('origin=');
  });

  it('apple maps uses daddr + dirflg=w, no saddr', () => {
    const url = appleMapsWalkingUrl(LAT, LNG);
    expect(url).toContain('daddr=13.7628%2C100.49449');
    expect(url).toContain('dirflg=w');
    expect(url).not.toContain('saddr=');
  });
});

describe('isIosLike / primaryNavTarget', () => {
  it('detects iPhone UA', () => {
    expect(isIosLike('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 5)).toBe(true);
  });
  it('detects iPadOS reporting as Macintosh with touch points', () => {
    expect(isIosLike('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5)).toBe(true);
  });
  it('does not treat a real desktop Mac (no touch) as iOS', () => {
    expect(isIosLike('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0)).toBe(false);
  });
  it('does not treat Android as iOS', () => {
    expect(isIosLike('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
  it('primaryNavTarget picks apple_maps on iOS, google_maps otherwise', () => {
    expect(primaryNavTarget('Mozilla/5.0 (iPhone)', 5)).toBe('apple_maps');
    expect(primaryNavTarget('Mozilla/5.0 (Linux; Android 14)', 5)).toBe('google_maps');
  });
});

describe('isSafeNavUrl', () => {
  it('accepts a well-formed google_maps url', () => {
    expect(isSafeNavUrl(navUrlFor('google_maps', LAT, LNG), 'google_maps', LAT, LNG)).toBe(true);
  });
  it('accepts a well-formed apple_maps url', () => {
    expect(isSafeNavUrl(navUrlFor('apple_maps', LAT, LNG), 'apple_maps', LAT, LNG)).toBe(true);
  });
  it('rejects an extra query key (e.g. a leaked key= or origin=)', () => {
    const url = `${navUrlFor('google_maps', LAT, LNG)}&origin=13.7,100.4`;
    expect(isSafeNavUrl(url, 'google_maps', LAT, LNG)).toBe(false);
  });
  it('rejects a coordinate that does not match nav_destination', () => {
    expect(isSafeNavUrl(navUrlFor('google_maps', LAT, LNG), 'google_maps', 0, 0)).toBe(false);
  });
});
