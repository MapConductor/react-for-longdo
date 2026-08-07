import {
  AbstractPolylineOverlayRenderer,
  buildUnwrappedPolylinePath,
  type PolylineEntity,
  type PolylineManagerInterface,
  type PolylineState,
} from '@mapconductor/js-sdk-core';
import type { LineFeature } from '../helpers';
import { LongdoMapViewHolder } from '../LongdoMapViewHolder';
import {
  LongdoPolylineLayer,
  type LongdoActualPolyline,
} from './LongdoPolylineLayer';

export class LongdoPolylineOverlayRenderer extends AbstractPolylineOverlayRenderer<
  LongdoMapViewHolder,
  LongdoActualPolyline
> {
  readonly layer: LongdoPolylineLayer;
  readonly polylineManager: PolylineManagerInterface<LongdoActualPolyline>;

  constructor({
    layer,
    polylineManager,
    holder,
  }: {
    layer: LongdoPolylineLayer;
    polylineManager: PolylineManagerInterface<LongdoActualPolyline>;
    holder: LongdoMapViewHolder;
  }) {
    super(holder);
    this.layer = layer;
    this.polylineManager = polylineManager;
  }

  async createPolyline(state: PolylineState): Promise<LongdoActualPolyline | null> {
    if (state.points.length < 2) return null;
    return createLongdoLines(state, this.resolveZIndex(state));
  }

  async updatePolylineProperties({
    current,
  }: {
    polyline: LongdoActualPolyline;
    current: PolylineEntity<LongdoActualPolyline>;
    prev: PolylineEntity<LongdoActualPolyline>;
  }): Promise<LongdoActualPolyline | null> {
    return this.createPolyline(current.state);
  }

  async removePolyline(_entity: PolylineEntity<LongdoActualPolyline>): Promise<void> {
    // The source is rewritten from the remaining manager entities in onPostProcess().
  }

  override async onPostProcess(): Promise<void> {
    this.layer.draw(this.polylineManager.allEntities());
  }

  async redraw(): Promise<void> {
    await this.onPostProcess();
  }

  private resolveZIndex(state: PolylineState): number {
    if (state.zIndex !== 0) return state.zIndex;
    return typeof state.extra === 'number' ? state.extra : 0;
  }
}

function createLongdoLines(
  state: PolylineState,
  zIndex: number,
): LongdoActualPolyline {
  // Unwrapped path (longitudes continuous, may exceed ±180): Longdo GL renders
  // it seamlessly across the antimeridian without splitting.
  const path = buildUnwrappedPolylinePath(state.points, state.geodesic);
  if (path.length < 2) return [];

  const feature: LineFeature = {
    type: 'Feature',
    id: `polyline-${state.id}-0`,
    geometry: {
      type: 'LineString',
      coordinates: path.map((point) => [point.longitude, point.latitude]),
    },
    properties: {
      id: `polyline-${state.id}-0`,
      [LongdoPolylineLayer.Prop.STROKE_COLOR]: state.strokeColor,
      [LongdoPolylineLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
      [LongdoPolylineLayer.Prop.Z_INDEX]: zIndex,
    },
  };
  return [feature];
}
