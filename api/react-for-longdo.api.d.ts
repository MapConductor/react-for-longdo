import { MapConfig, GeoRectBounds, MarkerTilingOptions, MapProvider, MapViewControllerInterface, MapViewHolderBase, GeoPointInterface, Offset, GeoPoint, MarkerEntity, AbstractMarkerOverlayRenderer, MarkerManager, AddParams, ChangeParams, MarkerState, BitmapIcon, AbstractMarkerController, RasterLayerState, OnMarkerEventHandler, CircleEntity, AbstractCircleOverlayRenderer, CircleManagerInterface, CircleState, CircleController, PolylineEntity, AbstractPolylineOverlayRenderer, PolylineManagerInterface, PolylineState, PolylineController, MapCameraPosition, PolygonEntity, AbstractPolygonOverlayRenderer, PolygonManagerInterface, PolygonState, SlottedOverlayController, OnPolygonEventHandler, OverlayKind, AbstractGroundImageOverlayRenderer, GroundImageState, GroundImageEntity, RasterLayerOverlayRenderer, RasterLayerAddParams, RasterLayerChangeParams, RasterLayerEntity, RasterLayerController, RasterHeaderSupport, BaseMapViewController, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable, MapUISettings, OnMapInitializedHandler, MarkerAnimationOverlayHost, OnGroundImageEventHandler, MapDesignTypeInterface, AttributionRule, MapViewStateInterface, MapViewState, MapViewBaseProps, WebMercatorZoomAltitudeConverter } from '@mapconductor/js-sdk-core';
import * as maplibregl from 'maplibre-gl';
import React from 'react';

interface LongdoConfig extends MapConfig {
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
/**
 * Longdo provider implementation.
 *
 * Bootstraps the base map, camera and base-layer designs through the Longdo Map
 * API3 (`longdo.Map`), then drives camera / events / overlays through the
 * internal MapLibre GL JS map exposed as `map.Renderer` — the same renderer
 * architecture as the other MapLibre-family providers.
 */
declare class LongdoProvider extends MapProvider {
    private longdoMap;
    private container;
    private initToken;
    initialize(config: LongdoConfig): Promise<MapViewControllerInterface>;
    destroy(): void;
    /** Returns true if the rejection was caused by an intentional destroy() call. */
    static isDestroyedBeforeLoad(error: unknown): boolean;
}

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
interface LongdoLatLon {
    lon: number;
    lat: number;
}
interface LongdoMapOptions {
    placeholder: HTMLElement;
    zoom?: number;
    zoomRange?: {
        min: number;
        max: number;
    };
    location?: LongdoLatLon;
    lastView?: boolean;
    /** A base layer from `longdo.Layers` (e.g. `longdo.Layers.NORMAL`). */
    layer?: unknown;
    language?: string;
    ui?: unknown;
}
interface LongdoMapInstance {
    /** Internal MapLibre GL JS map instance. */
    readonly Renderer: maplibregl.Map;
    readonly Event: {
        bind(eventName: string, handler: (data?: unknown) => void): void;
    };
    readonly Layers: {
        setBase(layer: unknown): void;
    };
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
interface LongdoNamespace {
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
/**
 * Loads the Longdo Map API3 script (`https://api.longdo.com/map3/?key=<key>`)
 * once and resolves with the `window.longdo` namespace. Subsequent calls reuse
 * the same promise / already-loaded global.
 */
declare function loadLongdo(apiKey: string): Promise<LongdoNamespace>;

declare class LongdoMapViewHolder extends MapViewHolderBase<HTMLElement, maplibregl.Map> {
    readonly mapView: HTMLElement;
    readonly map: maplibregl.Map;
    /** The Longdo API3 map that owns `map` (its MapLibre renderer). */
    readonly longdoMap: LongdoMapInstance;
    private _controller;
    constructor(mapView: HTMLElement, map: maplibregl.Map, 
    /** The Longdo API3 map that owns `map` (its MapLibre renderer). */
    longdoMap: LongdoMapInstance);
    getController(): LongdoViewController | null;
    setController(controller: LongdoViewController): void;
    toScreenOffset(position: GeoPointInterface): Offset;
    fromScreenOffsetSync(offset: Offset): GeoPoint;
}

type Coordinate = [number, number];
type PointFeature = {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: 'Point';
        coordinates: Coordinate;
    };
    properties: Record<string, unknown>;
};
type LineFeature = {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: 'LineString';
        coordinates: Coordinate[];
    };
    properties: Record<string, unknown>;
};
type PolygonFeature = {
    type: 'Feature';
    geometry: {
        type: 'Polygon';
        coordinates: Coordinate[][];
    };
    properties: Record<string, unknown>;
};
type FeatureCollection = {
    type: 'FeatureCollection';
    features: Array<PointFeature | LineFeature | PolygonFeature>;
};

type LongdoActualMarker = PointFeature;
declare class MarkerLayer {
    protected readonly holder: LongdoMapViewHolder;
    protected readonly canEditStyle: () => boolean;
    readonly sourceId: string;
    readonly layerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
        sourceId: string;
        layerId: string;
    });
    draw(entities: MarkerEntity<LongdoActualMarker>[]): boolean;
    ensureStyleResources(): boolean;
    protected setData(data: FeatureCollection): boolean;
    setIconOffsets(offsets: ReadonlyMap<string, [number, number]>, fallback: [number, number]): void;
}

declare class MarkerDragLayer extends MarkerLayer {
    selected: MarkerEntity<LongdoActualMarker> | null;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
        sourceId: string;
        layerId: string;
    });
    updatePosition(position: GeoPoint): boolean;
    drawSelected(): boolean;
}

declare class LongdoMarkerOverlayRenderer extends AbstractMarkerOverlayRenderer<LongdoMapViewHolder, LongdoActualMarker> {
    private readonly defaultMarkerIcon;
    private readonly iconRefCounter;
    private readonly iconBitmaps;
    private readonly pendingImageRemovals;
    readonly markerManager: MarkerManager<LongdoActualMarker>;
    readonly markerLayer: MarkerLayer;
    readonly dragLayer: MarkerDragLayer;
    constructor({ holder, markerManager, markerLayer, dragLayer, }: {
        holder: LongdoMapViewHolder;
        markerManager: MarkerManager<LongdoActualMarker>;
        markerLayer: MarkerLayer;
        dragLayer: MarkerDragLayer;
    });
    onAdd(data: AddParams[]): Promise<(LongdoActualMarker | null)[]>;
    onChange(data: ChangeParams<LongdoActualMarker>[]): Promise<(LongdoActualMarker | null)[]>;
    onRemove(data: MarkerEntity<LongdoActualMarker>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    setMarkerVisible(entity: MarkerEntity<LongdoActualMarker>, visible: boolean): void;
    setMarkerPosition(entity: MarkerEntity<LongdoActualMarker>, position: GeoPoint): void;
    updateSelectedMarker({ entity, state, bitmapIcon, }: {
        entity: MarkerEntity<LongdoActualMarker>;
        state: MarkerState;
        bitmapIcon: BitmapIcon;
    }): Promise<void>;
    drawDragLayer(): void;
    redraw(): void;
    resync(): Promise<void>;
    private createMarkerFeature;
    private retainIcon;
    private releaseIcon;
    private customIconKey;
    private ensureImages;
    private ensureImage;
    private loadBitmapIcon;
    private ensureFallbackDefaultIcon;
    private removeUnusedImages;
    private syncIconOffsets;
    buildEntity(marker: LongdoActualMarker, state: MarkerState): MarkerEntity<LongdoActualMarker>;
}

declare class LongdoMarkerController extends AbstractMarkerController<LongdoActualMarker> {
    private readonly holder;
    readonly renderer: LongdoMarkerOverlayRenderer;
    private selected;
    private pendingSelectedPosition;
    private selectedPositionFrame;
    private readonly tilingOptions;
    private tileRenderer;
    private tileRouteId;
    private tileVersion;
    private tileGeneration;
    /** Called by LongdoViewController when RasterLayerState changes. */
    onRasterLayerUpdate: ((state: RasterLayerState | null) => Promise<void>) | null;
    constructor(holder: LongdoMapViewHolder, renderer: LongdoMarkerOverlayRenderer, tilingOptions?: MarkerTilingOptions);
    protected shouldTile(state: MarkerState, totalCount: number): boolean;
    protected onTiledMarkersChanged(): Promise<void>;
    private syncTiledOverlay;
    private serviceWorkerTileTemplate;
    private localTileTemplate;
    private removeTileOverlay;
    composition(data: MarkerState[]): Promise<void>;
    find(position: GeoPoint): MarkerEntity<LongdoActualMarker> | null;
    /**
     * Find the marker nearest to `position` at the given zoom level.
     * Handles both regular markers (icon-bounds check) and tiled markers (geographic radius).
     * Mirrors Android's `GoogleMapMarkerController.find(position, zoom)`.
     */
    findWithZoom(position: GeoPoint, zoom: number, pointerType: 'touch' | 'mouse'): MarkerEntity<LongdoActualMarker> | null;
    update(state: MarkerState): Promise<void>;
    has(state: MarkerState): boolean;
    getSelectedMarker(): MarkerEntity<LongdoActualMarker> | null;
    setSelectedMarker(entity: MarkerEntity<LongdoActualMarker> | null): Promise<void>;
    updateSelectedPosition(position: GeoPoint): void;
    resync(): Promise<void>;
    clear(): Promise<void>;
    destroy(): void;
    private flushSelectedPosition;
    private cancelSelectedPositionFrame;
    private hasCompositionChanges;
}

declare class LongdoMarkerEventController {
    private readonly controller;
    private activePointerId;
    private dragPanWasEnabled;
    private pointerDownOffset;
    private dragStarted;
    /** Last observed pointer input type — used by LongdoViewController for tile-marker hit radius. */
    lastPointerType: 'touch' | 'mouse';
    constructor(controller: LongdoMarkerController);
    resync(): void;
    setClickListener(listener: OnMarkerEventHandler | null): void;
    setDragStartListener(listener: OnMarkerEventHandler | null): void;
    setDragListener(listener: OnMarkerEventHandler | null): void;
    setDragEndListener(listener: OnMarkerEventHandler | null): void;
    setAnimateStartListener(listener: OnMarkerEventHandler | null): void;
    setAnimateEndListener(listener: OnMarkerEventHandler | null): void;
    destroy(): void;
    private readonly handlePointerDown;
    private readonly handlePointerMove;
    private readonly handlePointerUp;
    private readonly handlePointerCancel;
    private finishDrag;
    private restoreMapInteraction;
    private findMarkerAtPointer;
    private positionFromPointer;
    private localPoint;
}

type LongdoActualCircle = PolygonFeature & {
    id?: string | number;
};
declare class LongdoCircleLayer {
    static readonly Prop: {
        readonly FILL_COLOR: "fillColor";
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    readonly strokeLayerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
    });
    draw(entities: CircleEntity<LongdoActualCircle>[]): boolean;
    private ensureStyleResources;
}

declare class LongdoCircleOverlayRenderer extends AbstractCircleOverlayRenderer<LongdoMapViewHolder, LongdoActualCircle> {
    readonly layer: LongdoCircleLayer;
    readonly circleManager: CircleManagerInterface<LongdoActualCircle>;
    constructor({ layer, circleManager, holder, }: {
        layer: LongdoCircleLayer;
        circleManager: CircleManagerInterface<LongdoActualCircle>;
        holder: LongdoMapViewHolder;
    });
    createCircle(state: CircleState): Promise<LongdoActualCircle | null>;
    updateCircleProperties({ current, }: {
        circle: LongdoActualCircle;
        current: CircleEntity<LongdoActualCircle>;
        prev: CircleEntity<LongdoActualCircle>;
    }): Promise<LongdoActualCircle | null>;
    removeCircle(_entity: CircleEntity<LongdoActualCircle>): Promise<void>;
    onPostProcess(): Promise<void>;
    redraw(): Promise<void>;
}

declare class LongdoCircleController extends CircleController<LongdoActualCircle> {
    readonly renderer: LongdoCircleOverlayRenderer;
    constructor(renderer: LongdoCircleOverlayRenderer);
    update(state: CircleState): Promise<void>;
    resync(): Promise<void>;
    clear(): Promise<void>;
    /**
     * Hit-test a map click (its lat/lng) against the circles geometrically (inside
     * the fill radius) and dispatch the click on the matching circle. Does NOT use
     * a Longdo layer/overlay click event — detection is driven by the map click
     * position, matching the marker/polyline paths and android. Returns true if hit.
     */
    handleMapClick(clicked: GeoPoint): boolean;
}

type LongdoActualPolyline = LineFeature[];
declare class LongdoPolylineLayer {
    static readonly Prop: {
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
    });
    draw(entities: PolylineEntity<LongdoActualPolyline>[]): boolean;
    private ensureStyleResources;
}

declare class LongdoPolylineOverlayRenderer extends AbstractPolylineOverlayRenderer<LongdoMapViewHolder, LongdoActualPolyline> {
    readonly layer: LongdoPolylineLayer;
    readonly polylineManager: PolylineManagerInterface<LongdoActualPolyline>;
    constructor({ layer, polylineManager, holder, }: {
        layer: LongdoPolylineLayer;
        polylineManager: PolylineManagerInterface<LongdoActualPolyline>;
        holder: LongdoMapViewHolder;
    });
    createPolyline(state: PolylineState): Promise<LongdoActualPolyline | null>;
    updatePolylineProperties({ current, }: {
        polyline: LongdoActualPolyline;
        current: PolylineEntity<LongdoActualPolyline>;
        prev: PolylineEntity<LongdoActualPolyline>;
    }): Promise<LongdoActualPolyline | null>;
    removePolyline(_entity: PolylineEntity<LongdoActualPolyline>): Promise<void>;
    onPostProcess(): Promise<void>;
    redraw(): Promise<void>;
    private resolveZIndex;
}

declare class LongdoPolylineController extends PolylineController<LongdoActualPolyline> {
    readonly renderer: LongdoPolylineOverlayRenderer;
    constructor(renderer: LongdoPolylineOverlayRenderer);
    resync(): Promise<void>;
    clear(): Promise<void>;
    /**
     * Hit-test a map click (its lat/lng) against the polylines geometrically and,
     * if the click lands within the tap tolerance of a line, dispatch the click on
     * the nearest polyline (with the closest point on that line as `clicked`).
     *
     * This intentionally does NOT use a Longdo layer/overlay click event. Like
     * android (`TomTomMapViewController.onPolylineClickedInternal`) and the marker
     * path, the hit is derived from the map click position, so behaviour matches
     * across providers. Returns true if a polyline was hit (so the caller can
     * suppress the generic map click).
     */
    handleMapClick(clicked: GeoPoint, camera: MapCameraPosition | null): boolean;
}

interface LongdoActualPolygon {
    readonly fillFeatures: PolygonFeature[];
    readonly outlineFeatures: LineFeature[];
}
declare class LongdoPolygonLayer {
    static readonly Prop: {
        readonly FILL_COLOR: "fillColor";
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    readonly outlineSourceId: string;
    readonly outlineLayerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, outlineSourceId, outlineLayerId, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
        outlineSourceId?: string;
        outlineLayerId?: string;
    });
    draw(entities: PolygonEntity<LongdoActualPolygon>[]): boolean;
    private ensureStyleResources;
}

declare class LongdoPolygonOverlayRenderer extends AbstractPolygonOverlayRenderer<LongdoMapViewHolder, LongdoActualPolygon> {
    readonly layer: LongdoPolygonLayer;
    readonly polygonManager: PolygonManagerInterface<LongdoActualPolygon>;
    constructor({ layer, polygonManager, holder, }: {
        layer: LongdoPolygonLayer;
        polygonManager: PolygonManagerInterface<LongdoActualPolygon>;
        holder: LongdoMapViewHolder;
    });
    createPolygon(state: PolygonState): Promise<LongdoActualPolygon | null>;
    updatePolygonProperties({ current, }: {
        polygon: LongdoActualPolygon;
        current: PolygonEntity<LongdoActualPolygon>;
        prev: PolygonEntity<LongdoActualPolygon>;
    }): Promise<LongdoActualPolygon | null>;
    removePolygon(_entity: PolygonEntity<LongdoActualPolygon>): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class LongdoPolygonConductor implements SlottedOverlayController {
    readonly polygonOverlay: LongdoPolygonOverlayRenderer;
    clickListener: OnPolygonEventHandler | null;
    private operation;
    constructor(polygonOverlay: LongdoPolygonOverlayRenderer);
    composition(data: PolygonState[]): Promise<void>;
    update(state: PolygonState): Promise<void>;
    has(state: PolygonState): boolean;
    resync(): Promise<void>;
    clear(): Promise<void>;
    private redraw;
    /**
     * Hit-test a map click (its lat/lng) against the polygons geometrically
     * (point-in-polygon, honouring holes and zIndex) and dispatch the click on the
     * top-most polygon that contains the point. Does NOT use a Longdo
     * layer/overlay click event — detection is driven by the map click position,
     * matching the marker/polyline paths and android. Returns true if hit.
     */
    handleMapClick(clicked: GeoPoint): boolean;
    private enqueue;
    readonly kind: OverlayKind;
    hasId(id: string): boolean;
    compositionAny(data: unknown[]): Promise<void>;
    updateAny(state: unknown): Promise<void>;
    setClickListenerAny(listener: unknown): void;
}

declare class LongdoGroundImageOverlayRenderer extends AbstractGroundImageOverlayRenderer<LongdoMapViewHolder, string> {
    private readonly canEditStyle;
    /** Last values applied to the map style, keyed by state id. */
    private readonly applied;
    constructor({ holder, canEditStyle, }: {
        holder: LongdoMapViewHolder;
        canEditStyle: () => boolean;
    });
    sourceId(id: string): string;
    layerId(id: string): string;
    createGroundImage(state: GroundImageState): Promise<string | null>;
    updateGroundImageProperties({ current, }: {
        groundImage: string;
        current: GroundImageEntity<string>;
        prev: GroundImageEntity<string>;
    }): Promise<string | null>;
    /** Sync an already-created image source+layer to the current state (diffed). */
    private applyToExisting;
    removeGroundImage(entity: GroundImageEntity<string>): Promise<void>;
}

declare class LongdoGroundImageController implements SlottedOverlayController {
    private readonly groundImageStates;
    private readonly groundImageIds;
    private readonly pendingUpdates;
    private readonly renderer;
    private updateFrame;
    constructor(renderer: LongdoGroundImageOverlayRenderer);
    composition(data: GroundImageState[]): void;
    update(state: GroundImageState): void;
    has(state: GroundImageState): boolean;
    hasClickableAt(point: GeoPoint): boolean;
    dispatchClick(point: GeoPoint): boolean;
    resync(): void;
    clear(): void;
    private cancelPendingUpdates;
    private upsert;
    private removeById;
    readonly kind: OverlayKind;
    hasId(id: string): boolean;
    compositionAny(data: unknown[]): Promise<void>;
    updateAny(state: unknown): Promise<void>;
    setClickListenerAny(_listener: unknown): void;
}

/** GL のソース／レイヤー ID の対。android-sdk の LongdoRasterLayerHandle と同一。 */
interface LongdoRasterLayerHandle {
    readonly sourceId: string;
    readonly layerId: string;
}
/**
 * android-sdk と同じく汎用 RasterLayerController が駆動する OverlayRenderer 実装。
 * onAdd/onChange/onRemove でネイティブ GL のソース・レイヤーを操作する。スタイルが
 * まだ編集できない場合はハンドルだけ返し、スタイル (再)読み込み後に controller.resync()
 * で貼り直す。
 */
declare class LongdoRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<LongdoRasterLayerHandle> {
    readonly holder: LongdoMapViewHolder;
    private readonly canEditStyle;
    constructor(holder: LongdoMapViewHolder, canEditStyle: () => boolean);
    private sourceId;
    private layerId;
    onAdd(data: RasterLayerAddParams[]): Promise<(LongdoRasterLayerHandle | null)[]>;
    onChange(data: RasterLayerChangeParams<LongdoRasterLayerHandle>[]): Promise<(LongdoRasterLayerHandle | null)[]>;
    onRemove(data: RasterLayerEntity<LongdoRasterLayerHandle>[]): Promise<void>;
    onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void>;
    onPostProcess(): Promise<void>;
    private addLayer;
    private updateLayer;
    private removeLayer;
}

/**
 * android-sdk の LongdoRasterLayerController と同じく汎用 RasterLayerController の薄い
 * サブクラス。composition/update/has/clear は基底クラスが提供する。GL スタイルが
 * 再読み込みされると既存のソース・レイヤーは失われるため、resync() で登録済みの
 * ラスターレイヤーを貼り直す（android-sdk の reapplyStyle 相当）。
 */
declare class LongdoRasterLayerController extends RasterLayerController<LongdoRasterLayerHandle> {
    /**
     * Longdo Map JS のカスタムレイヤは URL しか受け取らない。
     *
     * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
     */
    protected get headerSupport(): RasterHeaderSupport;
    constructor(renderer: LongdoRasterLayerOverlayRenderer);
    resync(): Promise<void>;
}

declare class LongdoViewController extends BaseMapViewController implements MapViewControllerInterface, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable {
    private readonly mapInstance;
    private initialized;
    private logicalTiltHint;
    private readonly styleReadyRef;
    readonly holder: LongdoMapViewHolder;
    private readonly markerController;
    private readonly markerEventController;
    private groundImagePointerDown;
    private skipNextGroundImageClick;
    private readonly circleController;
    private readonly polylineController;
    private readonly polygonController;
    private readonly groundImageController;
    private readonly rasterLayerController;
    constructor(holder: LongdoMapViewHolder, markerController: LongdoMarkerController, markerEventController: LongdoMarkerEventController, circleController: LongdoCircleController, polylineController: LongdoPolylineController, polygonController: LongdoPolygonConductor, groundImageController: LongdoGroundImageController, rasterLayerController: LongdoRasterLayerController, styleReadyRef?: {
        current: boolean;
    }, logicalTiltHint?: number | null);
    getMap(): maplibregl.Map;
    /**
     * Longdo API3 handles panning and wheel zoom above its MapLibre renderer, so
     * those two have to go through `Ui.Mouse` — switching the renderer's own
     * handlers off is not enough. Rotation and tilt are pure renderer gestures.
     */
    applyUISettings(settings: MapUISettings): void;
    private setupEventListeners;
    setMapInitializedListener(listener: OnMapInitializedHandler | null): void;
    moveCamera(position: MapCameraPosition): Promise<boolean>;
    animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean>;
    fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean>;
    getCameraPosition(): MapCameraPosition | null;
    /**
     * Projects the four screen corners of the map viewport back to geo
     * coordinates via `fromScreenOffsetSync` and extends a bounds from them,
     * instead of using `map.getBounds()`'s axis-aligned box — this stays
     * correct when the map is rotated. Mirrors Android's
     * `LongdoViewControllerImpl.getMapCameraPosition()`.
     */
    private getVisibleRegion;
    compositionMarkers(data: MarkerState[]): Promise<void>;
    updateMarker(state: MarkerState): Promise<void>;
    setOnMarkerClickListener(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragStart(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDrag(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragEnd(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateStart(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateEnd(_listener: OnMarkerEventHandler | null): void;
    setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void;
    setOnGroundImageClickListener(_listener: OnGroundImageEventHandler | null): void;
    clearOverlays(): Promise<void>;
    destroy(): void;
}

interface LongdoMapDesignType extends MapDesignTypeInterface<string> {
    /** Base layer name under `longdo.Layers` (e.g. 'NORMAL', 'GRAY', 'DARK', 'SPHERE_IMAGES'). */
    readonly layerName: string;
}
/**
 * Longdo Map design (a base layer provided by the Longdo Map API3).
 *
 * `id` / `getValue()` is the stable key (used for save/restore and as the map
 * re-init trigger); the value actually loaded is the Longdo base layer
 * `longdo.Layers[layerName]`. Layer names are the standard base layers exposed
 * by `longdo.Layers` and mirror the Android `LongdoDesign` one-to-one.
 */
declare class LongdoDesign implements LongdoMapDesignType {
    readonly id: string;
    readonly layerName: string;
    readonly attributionRules: readonly AttributionRule[];
    constructor(id: string, layerName: string, attributionRules?: readonly AttributionRule[]);
    getValue(): string;
    /** Standard road map. */
    static readonly Normal: LongdoDesign;
    /** Simplified, easy-to-read map. */
    static readonly Easy: LongdoDesign;
    /** Pastel-toned map. */
    static readonly Pastel: LongdoDesign;
    /** Pastel grayscale map. */
    static readonly PastelGray: LongdoDesign;
    /** High-contrast map. */
    static readonly Hard: LongdoDesign;
    /** Grayscale map. */
    static readonly Gray: LongdoDesign;
    /** Light map. */
    static readonly Light: LongdoDesign;
    /** Night (dark) map. */
    static readonly Night: LongdoDesign;
    /** Dark-themed map. */
    static readonly Dark: LongdoDesign;
    /** Political / administrative map. */
    static readonly Political: LongdoDesign;
    /** OpenStreetMap base map. */
    static readonly Osm: LongdoDesign;
    /** Satellite imagery. */
    static readonly Satellite: LongdoDesign;
    /** Satellite imagery with labels (hybrid). */
    static readonly Hybrid: LongdoDesign;
}

interface LongdoViewStateInterface extends MapViewStateInterface<LongdoMapDesignType> {
    /** Longdo Cloud API key used to load the style/tiles. */
    readonly apiKey: string;
}
interface LongdoViewStateParams {
    id?: string;
    /** Longdo Cloud API key. Required for the map/tiles to load. */
    apiKey?: string;
    mapDesignType?: LongdoMapDesignType;
    cameraPosition?: MapCameraPosition;
}
declare class LongdoViewState extends MapViewState<LongdoMapDesignType> implements LongdoViewStateInterface {
    readonly apiKey: string;
    private _mapDesignType;
    constructor({ id, apiKey, mapDesignType, cameraPosition, }?: LongdoViewStateParams);
    get mapDesignType(): LongdoMapDesignType;
    set mapDesignType(value: LongdoMapDesignType);
}
declare function useLongdoViewState(params?: LongdoViewStateParams): LongdoViewStateInterface;

interface LongdoMapViewProps extends MapViewBaseProps<LongdoViewStateInterface> {
    maxZoom?: number;
    minZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
    containerStyle?: React.CSSProperties;
    onError?: (error: Error) => void;
    children?: React.ReactNode;
    markerTilingOptions?: MarkerTilingOptions;
}
declare function LongdoMapView(props: LongdoMapViewProps): React.JSX.Element;
declare function LongdoMapView2D(props: LongdoMapViewProps): React.JSX.Element;

/**
 * 統一ズーム（Google Maps 基準・256px タイル）⇄ 高度の変換。
 *
 * Longdo の web SDK は 512px タイル基準なので、統一ズームはネイティブズーム + 1。
 * ネイティブ（android-for-longdo / ios-for-longdo）はここが 0 で、**web だけ 1**。
 * 別のエンジンなので揃えないこと。
 * 換算式はコアの {@link WebMercatorZoomAltitudeConverter} にある。
 */
declare class ZoomAltitudeConverter extends WebMercatorZoomAltitudeConverter {
    /** Empirical offset: GoogleZoom ≈ LongdoSDK.zoom + 1.0 */
    static readonly MAPLIBRE_TO_GOOGLE_ZOOM_OFFSET = 1;
    constructor(zoom0Altitude?: number);
    static maplibreZoomToGoogleZoom(maplibreZoom: number): number;
    static googleZoomToMaplibreZoom(googleZoom: number): number;
}

export { type LongdoConfig, LongdoDesign, type LongdoMapDesignType, LongdoMapView, LongdoMapView2D, type LongdoMapViewProps, LongdoProvider, LongdoViewController, LongdoViewState, type LongdoViewStateInterface, ZoomAltitudeConverter, loadLongdo, useLongdoViewState };
