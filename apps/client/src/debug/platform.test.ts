import { describe, expect, it } from 'vitest';
import { detectPlatform } from './platform';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

describe('detectPlatform', () => {
  it('recognizes Android Chrome', () => {
    expect(detectPlatform(ANDROID_CHROME)).toBe('android-chrome');
  });

  it('recognizes iOS Safari', () => {
    expect(detectPlatform(IOS_SAFARI)).toBe('ios-safari');
  });

  it('does not mistake iOS Chrome (a Safari-engine wrapper) for iOS Safari', () => {
    expect(detectPlatform(IOS_CHROME)).toBe('other');
  });

  it('falls back to "other" for desktop', () => {
    expect(detectPlatform(DESKTOP_CHROME)).toBe('other');
  });
});
