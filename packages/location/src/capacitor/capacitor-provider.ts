/**
 * Capacitor LocationProvider stub. The native wrapper (background location, native permission
 * flow) is Phase 8 work. Until then the stub implements the full interface so the client can
 * select `loc=capacitor` and exercise the error path (tech note section 3, TC-LOC-07).
 *
 * start() follows the contract (never rejects): it emits a fatal `not-implemented` error whose
 * message says "not implemented until Phase 8" and moves to `error`.
 */
import type { LocationSample } from '@keep-walking/shared';
import type {
  Clock,
  LocationError,
  LocationPermission,
  LocationProvider,
  LocationProviderDeps,
  LocationProviderState,
  Unsubscribe,
} from '../types';
import { ListenerSet } from '../web/listeners';
import { systemClock } from '../web/platform';

export const CAPACITOR_NOT_IMPLEMENTED_MESSAGE =
  'Capacitor LocationProvider is not implemented until Phase 8';

export class CapacitorLocationProvider implements LocationProvider {
  readonly kind = 'capacitor' as const;

  private currentState: LocationProviderState = 'idle';
  private readonly clock: Clock;
  private readonly samples = new ListenerSet<LocationSample>();
  private readonly errors = new ListenerSet<LocationError>();
  private readonly states = new ListenerSet<LocationProviderState>();

  constructor(deps: LocationProviderDeps = {}) {
    this.clock = deps.clock ?? systemClock;
  }

  get state(): LocationProviderState {
    return this.currentState;
  }

  getPermission(): Promise<LocationPermission> {
    return Promise.resolve('unsupported');
  }

  start(): Promise<void> {
    this.errors.emit({
      code: 'not-implemented',
      message: CAPACITOR_NOT_IMPLEMENTED_MESSAGE,
      at: this.clock.now(),
      fatal: true,
    });
    this.setState('error');
    return Promise.resolve();
  }

  stop(): void {
    this.setState('stopped');
  }

  onSample(listener: (sample: LocationSample) => void): Unsubscribe {
    // Never called: the stub delivers no samples.
    return this.samples.add(listener);
  }

  onError(listener: (error: LocationError) => void): Unsubscribe {
    return this.errors.add(listener);
  }

  onStateChange(listener: (state: LocationProviderState) => void): Unsubscribe {
    return this.states.add(listener);
  }

  private setState(next: LocationProviderState): void {
    if (next !== this.currentState) {
      this.currentState = next;
      this.states.emit(next);
    }
  }
}

export function createCapacitorLocationProvider(deps: LocationProviderDeps = {}): LocationProvider {
  return new CapacitorLocationProvider(deps);
}
