import { describe, expect, it } from 'vitest';
import type { LocationSample } from '@keep-walking/location';
import { sampleToSpikePosition } from './spike-hook';

describe('sampleToSpikePosition', () => {
  it('copies exactly the fields TC-MAP-02/03 read, dropping speed/heading', () => {
    const sample: LocationSample = {
      timestamp: 123,
      lat: 13.73,
      lng: 100.54,
      accuracy: 5,
      speed: 1.2,
      heading: 90,
    };
    expect(sampleToSpikePosition(sample)).toEqual({
      lat: 13.73,
      lng: 100.54,
      accuracy: 5,
      timestamp: 123,
    });
  });
});
