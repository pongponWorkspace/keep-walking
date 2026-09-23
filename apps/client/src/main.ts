import 'maplibre-gl/dist/maplibre-gl.css';
import './app.css';
import { readMapEnv, withTestEnvOverrides } from './env';
import { createMap } from './map';

const container = document.getElementById('map');
if (container === null) {
  throw new Error('client shell: #map element missing from index.html');
}

const env = withTestEnvOverrides(readMapEnv(import.meta.env), window.location.search);
const result = createMap(container, env);

if (result === undefined) {
  // No copy.th.json key exists yet for this dev-only configuration state, so
  // fall back to the key-shaped placeholder text itself (TL-N06), same
  // convention P1-F02-T10 will use for real gps.* status copy. This only
  // shows up when VITE_TILES_URL is unset, never in a real deployed build
  // (Cloudflare Pages always sets it, D-008).
  container.classList.add('map-shell--empty');
  container.textContent = 'client.mapSpike.tilesUrlMissing';
}
