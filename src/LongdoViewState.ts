import { useState } from 'react';
import {
  MapViewState,
  type MapViewStateInterface,
  type GeoPoint,
  type MapCameraPosition,
  type MapViewControllerInterface,
  type GeoRectBounds,
  type MapViewHolder,
  MapCameraPosition as MapCameraPositionNS,
  createRandomId,
} from '@mapconductor/js-sdk-core';
import { LongdoDesign, type LongdoMapDesignType } from './LongdoDesign';

export interface LongdoViewStateInterface
  extends MapViewStateInterface<LongdoMapDesignType> {
  /** Longdo Cloud API key used to load the style/tiles. */
  readonly apiKey: string;
}

export interface LongdoViewStateParams {
  id?: string;
  /** Longdo Cloud API key. Required for the map/tiles to load. */
  apiKey?: string;
  mapDesignType?: LongdoMapDesignType;
  cameraPosition?: MapCameraPosition;
}

export class LongdoViewState
  extends MapViewState<LongdoMapDesignType>
  implements LongdoViewStateInterface {
  readonly id: string;
  readonly apiKey: string;
  private _cameraPosition: MapCameraPosition;
  private _mapDesignType: LongdoMapDesignType;
  private _controller: MapViewControllerInterface | null = null;
  private _cameraPositionChangeListener: ((camera: MapCameraPosition) => void) | null = null;

  constructor({
    id = createRandomId(),
    apiKey = '',
    mapDesignType = LongdoDesign.Normal,
    cameraPosition = MapCameraPositionNS.Default,
  }: LongdoViewStateParams = {}) {
    super();
    this.id = id;
    this.apiKey = apiKey;
    this._cameraPosition = cameraPosition;
    this._mapDesignType = mapDesignType;
  }

  override get cameraPosition(): MapCameraPosition {
    return this._cameraPosition;
  }

  override get mapDesignType(): LongdoMapDesignType {
    return this._mapDesignType;
  }

  override set mapDesignType(value: LongdoMapDesignType) {
    this._mapDesignType = value;
  }

  override moveCameraTo(position: GeoPoint, durationMillis?: number): void;
  override moveCameraTo(cameraPosition: MapCameraPosition, durationMillis?: number): void;
  override moveCameraTo(positionOrCamera: GeoPoint | MapCameraPosition, durationMillis?: number): void {
    const newPosition = 'zoom' in positionOrCamera
      ? this.resolveCameraPosition(positionOrCamera as MapCameraPosition)
      : this._cameraPosition.copy({ position: positionOrCamera as GeoPoint });

    const ctrl = this._controller;
    if (!ctrl) {
      this._cameraPosition = newPosition;
      return;
    }

    if (!durationMillis || durationMillis === 0) {
      ctrl.moveCamera(newPosition);
    } else {
      void ctrl.animateCamera(newPosition, durationMillis);
    }
    this._cameraPosition = newPosition;
    this._cameraPositionChangeListener?.(newPosition);
  }

  override getMapViewHolder(): MapViewHolder<unknown, unknown> | null {
    return this._controller?.holder ?? null;
  }

  override fitBounds(bounds: GeoRectBounds, padding: number = 0): void {
    void this._controller?.fitBounds(bounds, padding);
  }

  // Called by LongdoView when controller is initialized
  setController(ctrl: MapViewControllerInterface | null): void {
    this._controller = ctrl;
    if (ctrl) ctrl.moveCamera(this._cameraPosition);
  }

  // Called by LongdoView when camera position changes
  updateCameraPosition(camera: MapCameraPosition): void {
    this._cameraPosition = camera;
    this._cameraPositionChangeListener?.(camera);
  }

  setCameraPositionChangeListener(listener: ((camera: MapCameraPosition) => void) | null): void {
    this._cameraPositionChangeListener = listener;
  }

  // If zoom/bearing/tilt are all 0, treat as position-only update (matches Android/iOS behavior)
  private resolveCameraPosition(target: MapCameraPosition): MapCameraPosition {
    const isUnspecified = target.zoom === 0 && target.bearing === 0 && target.tilt === 0;
    if (isUnspecified) return this._cameraPosition.copy({ position: target.position });
    return target;
  }
}

export function useLongdoViewState(params: LongdoViewStateParams = {}): LongdoViewStateInterface {
  const [state] = useState(() => new LongdoViewState(params));
  return state;
}
