import { describe, expect, it } from 'vitest';
import { parseRoute, parseStorySlideNumber, resolveRoute, ROUTE_HASH } from './routes';
import type { Route } from './routes';
import type { OnboardingStep } from '../onboarding/onboarding-step';

describe('parseRoute', () => {
  it.each([
    ['', 'main'],
    ['#/', 'main'],
    ['#/login', 'login'],
    ['#/login/email', 'loginEmail'],
    ['#/register', 'register'],
    ['#/forgot', 'forgot'],
    ['#/create-character', 'createCharacter'],
    ['#/story/1', 'story'],
    ['#/story/9', 'story'],
    ['#/story/abc', 'story'],
    ['#/upgrade', 'upgrade'],
    ['#/shop', 'shop'],
    ['#/party', 'party'],
    ['#/inventory', 'inventory'],
    ['#/settings', 'settingsMenu'],
    ['#/settings/walking-safety', 'settingsWalkingSafety'],
    ['#/settings/privacy', 'settingsPrivacy'],
    ['#/settings/credits', 'settingsCredits'],
    ['#/shopx', 'main'],
    ['#/nonsense', 'main'],
  ] as const)('%s -> %s', (hash, route) => {
    expect(parseRoute(hash)).toBe(route);
  });

  it('every ROUTE_HASH value parses back to its own route (except main, which has none)', () => {
    for (const [route, hash] of Object.entries(ROUTE_HASH) as [Route, string][]) {
      if (route === 'main') continue;
      expect(parseRoute(hash)).toBe(route);
    }
  });
});

describe('parseStorySlideNumber', () => {
  it.each([
    ['#/story/1', 1],
    ['#/story/5', 5],
    ['#/story/9', 9],
    ['#/story/0', 0],
    ['#/story', undefined],
    ['#/story/abc', undefined],
    ['#/story/1/extra', undefined],
    ['', undefined],
    ['#/login', undefined],
  ] as const)('%s -> %s', (hash, slide) => {
    expect(parseStorySlideNumber(hash)).toBe(slide);
  });
});

describe('resolveRoute', () => {
  const DONE: OnboardingStep = 'done';
  const notReady = (step: OnboardingStep) => ({ step, shellReady: false, runActive: false });
  const ready = { step: DONE, shellReady: true, runActive: false };

  it('a run in progress wins over every route except settings*/inventory', () => {
    expect(resolveRoute('login', { step: DONE, shellReady: true, runActive: true })).toBe('main');
    expect(
      resolveRoute('createCharacter', { step: 'character', shellReady: false, runActive: true }),
    ).toBe('main');
    expect(resolveRoute('settingsMenu', { step: DONE, shellReady: true, runActive: true })).toBe(
      'settingsMenu',
    );
    expect(resolveRoute('inventory', { step: DONE, shellReady: true, runActive: true })).toBe(
      'inventory',
    );
  });

  it('steps with no route of their own always resolve to main', () => {
    for (const step of ['intro', 'age', 'underage', 'consent', 'permission'] as const) {
      expect(resolveRoute('login', notReady(step))).toBe('main');
      expect(resolveRoute('settingsMenu', notReady(step))).toBe('main');
    }
  });

  it('the login step allows every login-family sub-route, forces everything else to login', () => {
    for (const route of ['login', 'loginEmail', 'register', 'forgot'] as const) {
      expect(resolveRoute(route, notReady('login'))).toBe(route);
    }
    expect(resolveRoute('createCharacter', notReady('login'))).toBe('login');
    expect(resolveRoute('settingsMenu', notReady('login'))).toBe('login');
    expect(resolveRoute('main', notReady('login'))).toBe('login');
  });

  it('the character step forces createCharacter, the story step forces story', () => {
    expect(resolveRoute('main', notReady('character'))).toBe('createCharacter');
    expect(resolveRoute('login', notReady('character'))).toBe('createCharacter');
    expect(resolveRoute('main', notReady('story'))).toBe('story');
    expect(resolveRoute('createCharacter', notReady('story'))).toBe('story');
  });

  it('once shell is ready, every onboarding-only route bounces to main', () => {
    for (const route of ['login', 'loginEmail', 'register', 'forgot', 'createCharacter', 'story']) {
      expect(resolveRoute(route as Route, ready)).toBe('main');
    }
  });

  it('once shell is ready, every other route passes through unchanged', () => {
    for (const route of [
      'main',
      'upgrade',
      'shop',
      'party',
      'inventory',
      'settingsMenu',
      'settingsWalkingSafety',
      'settingsPrivacy',
      'settingsCredits',
    ] as const) {
      expect(resolveRoute(route, ready)).toBe(route);
    }
  });
});
