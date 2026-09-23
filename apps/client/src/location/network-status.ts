/**
 * `gps.offline` (design/ux/flows/F03-core-loop.md 9.5, design/ux/components.md 6 `.banner.info`)
 * is about the network, not the `LocationProvider`: "ไม่มีเน็ตขณะแอปยัง foreground". Kept separate
 * from `GpsStatusTracker` (src/location/gps-status.ts) on purpose so the two never get confused.
 */
export interface NetworkStatusSource {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

/** Wraps `navigator.onLine` and the `online`/`offline` window events. */
export function windowNetworkStatus(): NetworkStatusSource {
  return {
    isOnline: () => navigator.onLine,
    subscribe: (listener: (online: boolean) => void): (() => void) => {
      const onOnline = (): void => listener(true);
      const onOffline = (): void => listener(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    },
  };
}
