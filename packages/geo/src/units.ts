// Physical constants and unit conversions: the only numbers allowed in geo code (ADR 0003 4.1).
// Every threshold (accuracy, speed, cadence, gaps, hysteresis, window length) is a parameter.

/** IUGG mean earth radius R1 in metres. The single copy for client, tools and server. */
export const EARTH_MEAN_RADIUS_M = 6_371_008.8;

export const MS_PER_S = 1000;

/** 1 m/s = 3.6 km/h. */
export const KMH_PER_MPS = 3.6;

const HALF_TURN_DEG = 180;

export const DEG_TO_RAD = Math.PI / HALF_TURN_DEG;
