import {
  AbstractCircleOverlayRenderer,
  circleToRing,
  closeRing,
  type CircleEntity,
  type CircleManagerInterface,
  type CircleState,
} from '@mapconductor/js-sdk-core';
import { LongdoMapViewHolder } from '../LongdoMapViewHolder';
import {
  LongdoCircleLayer,
  type LongdoActualCircle,
} from './LongdoCircleLayer';

export class LongdoCircleOverlayRenderer extends AbstractCircleOverlayRenderer<
  LongdoMapViewHolder,
  LongdoActualCircle
> {
  readonly layer: LongdoCircleLayer;
  readonly circleManager: CircleManagerInterface<LongdoActualCircle>;

  constructor({
    layer,
    circleManager,
    holder,
  }: {
    layer: LongdoCircleLayer;
    circleManager: CircleManagerInterface<LongdoActualCircle>;
    holder: LongdoMapViewHolder;
  }) {
    super(holder);
    this.layer = layer;
    this.circleManager = circleManager;
  }

  async createCircle(state: CircleState): Promise<LongdoActualCircle | null> {
    return createLongdoCircle(state);
  }

  async updateCircleProperties({
    current,
  }: {
    circle: LongdoActualCircle;
    current: CircleEntity<LongdoActualCircle>;
    prev: CircleEntity<LongdoActualCircle>;
  }): Promise<LongdoActualCircle | null> {
    return this.createCircle(current.state);
  }

  async removeCircle(_entity: CircleEntity<LongdoActualCircle>): Promise<void> {
    // The source is rewritten from the remaining manager entities in onPostProcess().
  }

  override async onPostProcess(): Promise<void> {
    this.layer.draw(this.circleManager.allEntities());
  }

  async redraw(): Promise<void> {
    await this.onPostProcess();
  }
}

function createLongdoCircle(state: CircleState): LongdoActualCircle | null {
  // Ground-anchored circle polygon from the shared core geometry. The ring is
  // unwrapped (longitudes may exceed ±180), which Longdo GL renders seamlessly
  // across the antimeridian without splitting.
  const ring = closeRing(circleToRing(state.center, state.radiusMeters, state.geodesic));
  if (ring.length < 4) return null;
  const zIndex = state.zIndex ?? calculateZIndex(state.center.latitude, state.center.longitude);

  return {
    type: 'Feature',
    id: `circle-${state.id}`,
    geometry: {
      type: 'Polygon',
      coordinates: [ring.map((point) => [point.longitude, point.latitude])],
    },
    properties: {
      id: `circle-${state.id}`,
      [LongdoCircleLayer.Prop.FILL_COLOR]: state.fillColor,
      [LongdoCircleLayer.Prop.STROKE_COLOR]: state.strokeColor,
      [LongdoCircleLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
      [LongdoCircleLayer.Prop.Z_INDEX]: zIndex,
    },
  };
}

function calculateZIndex(latitude: number, longitude: number): number {
  return Math.round(-latitude * 1_000_000 - longitude);
}
