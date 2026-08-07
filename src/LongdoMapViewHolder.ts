import type * as maplibregl from 'maplibre-gl';
import {
  createGeoPoint,
  MapViewHolderBase,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import type { LongdoViewController } from './LongdoViewController';
import type { LongdoMapInstance } from './longdoApi';

export class LongdoMapViewHolder extends MapViewHolderBase<HTMLElement, maplibregl.Map> {
  private _controller: LongdoViewController | null = null;

  constructor(
    readonly mapView: HTMLElement,
    readonly map: maplibregl.Map,
    /** The Longdo API3 map that owns `map` (its MapLibre renderer). */
    readonly longdoMap: LongdoMapInstance,
  ) {
    super();
  }

  getController(): LongdoViewController | null {
    return this._controller;
  }

  setController(controller: LongdoViewController): void {
    this._controller = controller;
  }

  toScreenOffset(position: GeoPointInterface): Offset {
    // MapLibre's project() maps longitude literally and does NOT pick the world
    // copy nearest the viewport. When the map is panned across the antimeridian
    // (e.g. viewing the US west coast east of the dateline, center lng ~237),
    // projecting a wrapped position (e.g. -122) lands ~360° off-screen, so
    // screen-space overlays (marker drop/bounce animations, info bubbles) render
    // off-view even though the map-layer feature itself is drawn on the copy in
    // view. Shift the longitude into the same world copy as the current center
    // before projecting.
    const centerLng = this.map.getCenter().lng;
    const lng = position.longitude + 360 * Math.round((centerLng - position.longitude) / 360);
    const point = this.map.project([lng, position.latitude]);
    return { x: point.x, y: point.y };
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint {
    const lngLat = this.map.unproject([offset.x, offset.y]);
    return createGeoPoint({ latitude: lngLat.lat, longitude: lngLat.lng });
  }
}
