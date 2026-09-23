import { describe, expect, it } from 'vitest';
import { getCopyEntry } from './load';
import {
  GPS_DISPLAY_COPY,
  GPS_DISPLAY_STATES,
  GPS_OFFLINE_COPY_KEY,
  GPS_TOAST_COPY,
} from './gps-state';

describe('GPS_DISPLAY_COPY', () => {
  it('covers every GpsDisplayState exactly once', () => {
    expect(Object.keys(GPS_DISPLAY_COPY).sort()).toEqual([...GPS_DISPLAY_STATES].sort());
  });

  it('every declared label/body key exists in the real copy.th.json (no drift)', () => {
    for (const entry of Object.values(GPS_DISPLAY_COPY)) {
      if (entry === null) {
        continue;
      }
      expect(getCopyEntry(entry.label), `missing key: ${entry.label}`).toBeDefined();
      if (entry.body !== undefined) {
        expect(getCopyEntry(entry.body), `missing key: ${entry.body}`).toBeDefined();
      }
    }
  });
});

describe('GPS_TOAST_COPY', () => {
  it('every toast key exists in the real copy.th.json', () => {
    for (const key of Object.values(GPS_TOAST_COPY)) {
      expect(getCopyEntry(key), `missing key: ${key}`).toBeDefined();
    }
  });
});

describe('GPS_OFFLINE_COPY_KEY', () => {
  it('exists in the real copy.th.json', () => {
    expect(getCopyEntry(GPS_OFFLINE_COPY_KEY)).toBeDefined();
  });
});
