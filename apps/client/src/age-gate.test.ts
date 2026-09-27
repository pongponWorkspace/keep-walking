import { describe, expect, it } from 'vitest';
import { ageGateBirthYearOptions, ageGatePassed } from './age-gate';

describe('ageGatePassed', () => {
  it('passes exactly at minAge_yr (greaterThanOrEqual, F06-R45)', () => {
    expect(ageGatePassed(2010, 2025, 15, 'greaterThanOrEqual')).toBe(true);
  });

  it('passes well above minAge_yr', () => {
    expect(ageGatePassed(1990, 2025, 15, 'greaterThanOrEqual')).toBe(true);
  });

  it('fails one year under minAge_yr', () => {
    expect(ageGatePassed(2011, 2025, 15, 'greaterThanOrEqual')).toBe(false);
  });

  it('fails far under minAge_yr (a child honestly picking their real birth year)', () => {
    expect(ageGatePassed(2020, 2025, 15, 'greaterThanOrEqual')).toBe(false);
  });
});

describe('ageGateBirthYearOptions', () => {
  it('starts at nowYear (newest first) and spans a fixed number of years back', () => {
    const years = ageGateBirthYearOptions(2025);
    expect(years[0]).toBe(2025);
    expect(years.length).toBe(100);
    expect(years[years.length - 1]).toBe(2025 - 99);
  });

  it('is strictly descending with no gaps', () => {
    const years = ageGateBirthYearOptions(2025);
    for (let i = 1; i < years.length; i += 1) {
      expect(years[i]).toBe((years[i - 1] as number) - 1);
    }
  });

  it('includes years that fail minAge_yr, not only years that pass it (F06-R46)', () => {
    const years = ageGateBirthYearOptions(2025);
    const underageYear = 2020; // age 5 at nowYear=2025
    expect(years).toContain(underageYear);
    expect(ageGatePassed(underageYear, 2025, 15, 'greaterThanOrEqual')).toBe(false);
  });
});
