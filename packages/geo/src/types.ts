// Structural input types of @keep-walking/geo (ADR 0003 section 4.1). Callers (session engine,
// client HUD, tools/traces) convert their own LocationSample / TraceSample into these shapes.

/** A WGS84 position in degrees. */
export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** One position fix. `t_ms` is the fix time in milliseconds on any monotonic time base. */
export interface GeoSample extends LatLng {
  readonly t_ms: number;
  /** Accuracy radius reported by the platform, in metres. */
  readonly accuracy_m: number;
}

/** Comparison of an accumulated distance with a threshold (config `movementGate.comparison`). */
export type GateComparison = 'greaterThan' | 'greaterThanOrEqual';
