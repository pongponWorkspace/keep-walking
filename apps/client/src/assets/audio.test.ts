import { describe, expect, it } from 'vitest';
import { EMPTY_QUEUE_STATE, advanceQueue, submitCue } from './audio';
import type { CueRequest } from './audio';

function req(cueId: string, priority: number, eventAt_ms: number, durationMs = 100): CueRequest {
  return { cueId, priority, eventAt_ms, durationMs };
}

describe('submitCue', () => {
  it('plays immediately when nothing is playing', () => {
    const result = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0), 0);
    expect(result.action).toBe('play_now');
    expect(result.state.playing?.cueId).toBe('run.tickGranted');
  });

  it('hard-cuts a lower-urgency cue that is currently playing (lower priority number wins)', () => {
    const afterFirst = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0), 0).state;
    const result = submitCue(afterFirst, req('run.death', 0, 10), 10);
    expect(result.action).toBe('play_now');
    expect(result.state.playing?.cueId).toBe('run.death');
  });

  it('enqueues an equal-priority cue FIFO rather than interrupting', () => {
    const afterFirst = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0), 0).state;
    const result = submitCue(afterFirst, req('dungeon.confirmEnter', 6, 10), 10);
    expect(result.action).toBe('enqueued');
    expect(result.state.playing?.cueId).toBe('run.tickGranted');
    expect(result.state.pending[0]?.cueId).toBe('dungeon.confirmEnter');
  });

  it('enqueues a less-urgent cue behind what is playing (does not interrupt)', () => {
    const afterFirst = submitCue(EMPTY_QUEUE_STATE, req('anticheat.speedLock', 3, 0), 0).state;
    const result = submitCue(afterFirst, req('run.tickDenied', 7, 10), 10);
    expect(result.action).toBe('enqueued');
    expect(result.state.playing?.cueId).toBe('anticheat.speedLock');
  });

  it('drops a stale non-safety cue (event more than 2000ms in the past) rather than playing it late', () => {
    const result = submitCue(EMPTY_QUEUE_STATE, req('run.tickDenied', 7, 0), 2500);
    expect(result.action).toBe('dropped_stale');
  });

  it('never drops a safety cue as stale (run.death, run.autoRetreat, run.hpLow, anticheat.speedLock)', () => {
    for (const cueId of ['run.death', 'run.autoRetreat', 'run.hpLow', 'anticheat.speedLock']) {
      const result = submitCue(EMPTY_QUEUE_STATE, req(cueId, 1, 0), 10_000);
      expect(result.action).toBe('play_now');
    }
  });
});

describe('advanceQueue', () => {
  it('does nothing while the current item is still playing', () => {
    const playing = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0, 250), 0).state;
    const result = advanceQueue(playing, 100);
    expect(result.toPlay).toBeUndefined();
  });

  it('promotes the next pending item once the current one ends', () => {
    let state = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0, 100), 0).state;
    state = submitCue(state, req('dungeon.confirmEnter', 6, 10, 100), 10).state;
    const result = advanceQueue(state, 150);
    expect(result.toPlay?.cueId).toBe('dungeon.confirmEnter');
  });

  it('drops a stale pending item while promoting, rather than playing it late', () => {
    let state = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0, 100), 0).state;
    state = submitCue(state, req('run.tickDenied', 7, 10, 100), 10).state;
    const result = advanceQueue(state, 3000);
    expect(result.toPlay).toBeUndefined();
    expect(result.state.pending).toEqual([]);
  });

  it('leaves the queue idle when there is nothing left to play', () => {
    const state = submitCue(EMPTY_QUEUE_STATE, req('run.tickGranted', 6, 0, 100), 0).state;
    const result = advanceQueue(state, 200);
    expect(result.toPlay).toBeUndefined();
    expect(result.state.playing).toBeUndefined();
  });
});
