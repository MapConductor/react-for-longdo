import type * as maplibregl from 'maplibre-gl';

/**
 * Minimal typings for the parts of the Longdo Map JS API3 global (`window.longdo`)
 * that this provider uses.
 *
 * Longdo Map API3 renders through MapLibre GL JS internally and exposes that map
 * instance as `map.Renderer`. We drive the base map / camera bootstrap and the
 * standard base-layer designs through the Longdo wrapper, and everything else
 * (camera control, events, overlays) through `map.Renderer`, which is a normal
 * MapLibre GL JS map — mirroring the Android Longdo module and the other
 * MapLibre-family React providers.
 */
export interface LongdoLatLon {
  lon: number;
  lat: number;
}

export interface LongdoMapOptions {
  placeholder: HTMLElement;
  zoom?: number;
  zoomRange?: { min: number; max: number };
  location?: LongdoLatLon;
  lastView?: boolean;
  /** A base layer from `longdo.Layers` (e.g. `longdo.Layers.NORMAL`). */
  layer?: unknown;
  language?: string;
  ui?: unknown;
}

export interface LongdoMapInstance {
  /** Internal MapLibre GL JS map instance. */
  readonly Renderer: maplibregl.Map;
  readonly Event: { bind(eventName: string, handler: (data?: unknown) => void): void };
  readonly Layers: { setBase(layer: unknown): void };
  /**
   * Longdo drives pan and wheel zoom itself rather than leaving them to the
   * MapLibre renderer, so these are the switches that actually gate them.
   */
  readonly Ui?: {
    readonly Mouse?: {
      enable(enabled: boolean): void;
      enableClick(enabled: boolean): void;
      enableDrag(enabled: boolean): void;
      enableWheel(enabled: boolean): void;
    };
  };
  location(location?: LongdoLatLon, animate?: boolean): LongdoLatLon;
  zoom(zoom?: number, animate?: boolean): number;
  resize?(): void;
}

export interface LongdoNamespace {
  Map: new (options: LongdoMapOptions) => LongdoMapInstance;
  /** Base layers, keyed by name (NORMAL, GRAY, DARK, SPHERE_IMAGES, ...). */
  Layers: Record<string, unknown>;
  EventName: Record<string, string>;
  LocationMode?: Record<string, unknown>;
}

declare global {
  interface Window {
    longdo?: LongdoNamespace;
  }
}

const SCRIPT_MARKER = 'data-mapconductor-longdo';

let loadPromise: Promise<LongdoNamespace> | null = null;

/**
 * Loads the Longdo Map API3 script (`https://api.longdo.com/map3/?key=<key>`)
 * once and resolves with the `window.longdo` namespace. Subsequent calls reuse
 * the same promise / already-loaded global.
 */
export function loadLongdo(apiKey: string): Promise<LongdoNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Longdo Map can only be loaded in a browser environment'));
  }
  if (window.longdo) {
    return Promise.resolve(window.longdo);
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<LongdoNamespace>((resolve, reject) => {
    const onReady = () => {
      if (window.longdo) {
        resolve(window.longdo);
      } else {
        reject(new Error('Longdo Map API3 loaded but window.longdo is undefined (check the API key)'));
      }
    };
    const onError = () => {
      loadPromise = null;
      reject(new Error('Failed to load the Longdo Map API3 script'));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`);
    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api.longdo.com/map3/?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.setAttribute(SCRIPT_MARKER, 'true');
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Waits until a freshly-created Longdo map has produced its internal MapLibre GL
 * map (`map.Renderer`) and that map's style has finished loading, then returns
 * the MapLibre map. Uses the Longdo `Ready` event when available, with a polling
 * fallback so we never hang if the event does not fire.
 */
export function waitForRenderer(
  longdoMap: LongdoMapInstance,
  longdo: LongdoNamespace,
  timeoutMs = 15000,
): Promise<maplibregl.Map> {
  return new Promise<maplibregl.Map>((resolve, reject) => {
    const started = Date.now();
    let settled = false;

    const finish = () => {
      if (settled) return;
      const renderer = longdoMap.Renderer;
      if (!renderer) return; // keep polling until the renderer exists
      settled = true;
      if (typeof renderer.isStyleLoaded === 'function' && renderer.isStyleLoaded()) {
        resolve(renderer);
        return;
      }
      // Style not ready yet: resolve on the next idle, with a safety timeout.
      const done = () => {
        renderer.off?.('idle', done);
        resolve(renderer);
      };
      renderer.on?.('idle', done);
      setTimeout(() => {
        renderer.off?.('idle', done);
        resolve(renderer);
      }, 8000);
    };

    try {
      const readyName = longdo.EventName?.Ready ?? 'ready';
      longdoMap.Event.bind(readyName, finish);
    } catch {
      // ignore — the poll below covers it
    }

    const poll = () => {
      if (settled) return;
      if (longdoMap.Renderer) {
        finish();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Timed out waiting for the Longdo map to initialize'));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}
