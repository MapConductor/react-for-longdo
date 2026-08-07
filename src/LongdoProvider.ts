import {
  CircleManager,
  MapProvider,
  MarkerManager,
  MarkerTilingOptions,
  PolygonManager,
  PolylineManager,
  type GeoRectBounds,
  type MapConfig,
  type MapViewControllerInterface,
} from '@mapconductor/js-sdk-core';
import { LongdoViewController } from './LongdoViewController';
import { loadLongdo, waitForRenderer, type LongdoMapInstance } from './longdoApi';
import { toCameraPosition } from './MapCameraPosition';
import { LongdoMapViewHolder } from './LongdoMapViewHolder';
import { LongdoMarkerController } from './marker/LongdoMarkerController';
import { LongdoMarkerEventController } from './marker/LongdoMarkerEventController';
import { LongdoMarkerOverlayRenderer } from './marker/LongdoMarkerOverlayRenderer';
import { MarkerLayer, type LongdoActualMarker } from './marker/MarkerLayer';
import { MarkerDragLayer } from './marker/MarkerDragLayer';
import { LongdoCircleController } from './circle/LongdoCircleController';
import { LongdoCircleLayer, type LongdoActualCircle } from './circle/LongdoCircleLayer';
import { LongdoCircleOverlayRenderer } from './circle/LongdoCircleOverlayRenderer';
import { LongdoPolylineController } from './polyline/LongdoPolylineController';
import { LongdoPolylineLayer, type LongdoActualPolyline } from './polyline/LongdoPolylineLayer';
import { LongdoPolylineOverlayRenderer } from './polyline/LongdoPolylineOverlayRenderer';
import { LongdoPolygonConductor } from './polygon/LongdoPolygonConductor';
import { LongdoPolygonLayer, type LongdoActualPolygon } from './polygon/LongdoPolygonLayer';
import { LongdoPolygonOverlayRenderer } from './polygon/LongdoPolygonOverlayRenderer';
import { LongdoGroundImageController } from './groundimage/LongdoGroundImageController';
import { LongdoGroundImageOverlayRenderer } from './groundimage/LongdoGroundImageOverlayRenderer';
import { LongdoRasterLayerController } from './raster/LongdoRasterLayerController';
import { LongdoRasterLayerOverlayRenderer } from './raster/LongdoRasterLayerOverlayRenderer';

export interface LongdoConfig extends MapConfig {
  /** Longdo Map API3 web API key (works on the page's origin). Required for the map to load. */
  apiKey?: string;
  /** Base layer name under `longdo.Layers` (e.g. 'NORMAL', 'DARK'). Defaults to 'NORMAL'. */
  layerName?: string;
  maxZoom?: number;
  minZoom?: number;
  /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
  restrictBounds?: GeoRectBounds;
  /** Longdo map language (e.g. 'en', 'th'). */
  language?: string;
  markerTilingOptions?: MarkerTilingOptions;
}

// Sentinel used to silently cancel initialization when destroy() is called before load.
// Distinct from real errors so callers can ignore it without swallowing actual failures.
const DESTROYED_BEFORE_LOAD = Symbol('DESTROYED_BEFORE_LOAD');

/**
 * Longdo provider implementation.
 *
 * Bootstraps the base map, camera and base-layer designs through the Longdo Map
 * API3 (`longdo.Map`), then drives camera / events / overlays through the
 * internal MapLibre GL JS map exposed as `map.Renderer` — the same renderer
 * architecture as the other MapLibre-family providers.
 */
export class LongdoProvider extends MapProvider {
  // Track the Longdo map + container separately from the controller so destroy()
  // works even while async initialization (script load + map ready) is in flight.
  private longdoMap: LongdoMapInstance | null = null;
  private container: HTMLElement | null = null;
  // Bumped by destroy() and by every initialize() call. An in-flight init whose
  // captured token no longer matches has been superseded (e.g. React StrictMode's
  // mount → unmount → remount, or a design re-init) and must abort. A sticky
  // boolean flag would wrongly abort the *next* real init after the first destroy.
  private initToken = 0;

  async initialize(config: LongdoConfig): Promise<MapViewControllerInterface> {
    if (this.controller) {
      return this.controller;
    }
    const token = ++this.initToken;

    const container =
      typeof config.container === 'string'
        ? document.getElementById(config.container)
        : config.container;

    if (!container) {
      throw new Error('Container element not found');
    }
    this.container = container;
    // Defensive: wipe any leftover Longdo DOM (e.g. after a design re-init) so a
    // new map is not created on top of a previous map's controls/canvas.
    container.replaceChildren();

    const longdo = await loadLongdo(config.apiKey ?? '');
    if (token !== this.initToken) throw DESTROYED_BEFORE_LOAD;

    const initialCamera = config.initCameraPosition ? toCameraPosition(config.initCameraPosition) : null;
    const layerName = config.layerName ?? 'NORMAL';
    const baseLayer = longdo.Layers[layerName] ?? longdo.Layers['NORMAL'];

    const longdoMap = new longdo.Map({
      placeholder: container,
      // Longdo's native zoom matches the internal MapLibre zoom; the camera
      // conversion already produced a MapLibre-space zoom.
      zoom: initialCamera ? Math.round(initialCamera.zoom) : 9,
      location: initialCamera
        ? { lon: initialCamera.center[0], lat: initialCamera.center[1] }
        : { lon: 0, lat: 0 },
      zoomRange:
        config.minZoom !== undefined || config.maxZoom !== undefined
          ? { min: config.minZoom ?? 1, max: config.maxZoom ?? 20 }
          : undefined,
      lastView: false,
      layer: baseLayer,
      language: config.language,
    });
    this.longdoMap = longdoMap;

    const map = await waitForRenderer(longdoMap, longdo);
    if (token !== this.initToken) {
      try {
        map.remove();
      } catch {
        // ignore
      }
      throw DESTROYED_BEFORE_LOAD;
    }

    // Use the internal MapLibre map's container (a properly-sized element) as the
    // holder's mapView, mirroring the other MapLibre-family providers — the outer
    // Longdo placeholder can report a 0×0 rect once Longdo takes it over.
    const mapView = (map.getContainer?.() as HTMLElement | undefined) ?? container;
    const holder = new LongdoMapViewHolder(mapView, map, longdoMap);
    // Rely solely on styleReady rather than also calling isStyleLoaded() here.
    // isStyleLoaded() can return false transiently while Longdo processes an
    // addLayer/addSource call, which would incorrectly block overlay resync.
    const styleReadyRef = { current: true };
    const canEditStyle = () => styleReadyRef.current;
    const markerController = getMarkerController(holder, canEditStyle, config);
    const markerEventController = new LongdoMarkerEventController(markerController);
    const circleController = getCircleController(holder, canEditStyle);
    const polylineController = getPolylineController(holder, canEditStyle);
    const polygonController = getPolygonController(holder, canEditStyle);
    const groundImageController = getGroundImageController(holder, canEditStyle);
    const rasterLayerController = getRasterLayerController(holder, canEditStyle);

    this.controller = new LongdoViewController(
      holder,
      markerController,
      markerEventController,
      circleController,
      polylineController,
      polygonController,
      groundImageController,
      rasterLayerController,
      styleReadyRef,
      config.initCameraPosition?.tilt ?? null,
    );
    return this.controller;
  }

  destroy(): void {
    this.initToken++;
    if (this.controller) {
      // Controller.destroy() removes the internal MapLibre map (map.Renderer).
      this.controller.destroy();
      this.controller = null;
    } else if (this.longdoMap) {
      // Map was created but the controller hasn't been set yet (not ready).
      try {
        this.longdoMap.Renderer?.remove();
      } catch {
        // ignore
      }
    }
    // Remove any Longdo-injected DOM (controls/attribution) left in the container.
    this.container?.replaceChildren();
    this.longdoMap = null;
    this.container = null;
  }

  /** Returns true if the rejection was caused by an intentional destroy() call. */
  static isDestroyedBeforeLoad(error: unknown): boolean {
    return error === DESTROYED_BEFORE_LOAD;
  }
}

function getMarkerController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
  config: LongdoConfig,
): LongdoMarkerController {
  const markerManager = MarkerManager.defaultManager<LongdoActualMarker>();
  const markerLayer = new MarkerLayer({
    holder,
    canEditStyle,
    sourceId: 'mc-markers',
    layerId: 'mc-marker-layer',
  });
  const dragLayer = new MarkerDragLayer({
    holder,
    canEditStyle,
    sourceId: 'mc-marker-drag',
    layerId: 'mc-marker-drag-layer',
  });
  const renderer = new LongdoMarkerOverlayRenderer({
    holder,
    markerManager,
    markerLayer,
    dragLayer,
  });
  return new LongdoMarkerController(holder, renderer, config.markerTilingOptions);
}

function getCircleController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
): LongdoCircleController {
  const circleManager = new CircleManager<LongdoActualCircle>();
  const layer = new LongdoCircleLayer({ holder, canEditStyle });
  const renderer = new LongdoCircleOverlayRenderer({ layer, circleManager, holder });
  return new LongdoCircleController(renderer);
}

function getPolylineController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
): LongdoPolylineController {
  const polylineManager = new PolylineManager<LongdoActualPolyline>();
  const layer = new LongdoPolylineLayer({ holder, canEditStyle });
  const renderer = new LongdoPolylineOverlayRenderer({ layer, polylineManager, holder });
  return new LongdoPolylineController(renderer);
}

function getPolygonController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
): LongdoPolygonConductor {
  const polygonManager = new PolygonManager<LongdoActualPolygon>();
  const layer = new LongdoPolygonLayer({ holder, canEditStyle });
  const renderer = new LongdoPolygonOverlayRenderer({ layer, polygonManager, holder });
  return new LongdoPolygonConductor(renderer);
}

function getGroundImageController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
): LongdoGroundImageController {
  const renderer = new LongdoGroundImageOverlayRenderer({ holder, canEditStyle });
  return new LongdoGroundImageController(renderer);
}

function getRasterLayerController(
  holder: LongdoMapViewHolder,
  canEditStyle: () => boolean,
): LongdoRasterLayerController {
  const renderer = new LongdoRasterLayerOverlayRenderer(holder, canEditStyle);
  return new LongdoRasterLayerController(renderer);
}
