import {
  useState } from 'react';
import {
  MapViewState,
  type MapViewStateInterface,
  type MapCameraPosition,
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
  readonly apiKey: string;
  private _mapDesignType: LongdoMapDesignType;

  constructor({
    id = createRandomId(),
    apiKey = '',
    mapDesignType = LongdoDesign.Normal,
    cameraPosition = MapCameraPositionNS.Default,
  }: LongdoViewStateParams = {}) {
    super({ id, cameraPosition });
    this.apiKey = apiKey;
    this._mapDesignType = mapDesignType;
  }

  override get mapDesignType(): LongdoMapDesignType {
    return this._mapDesignType;
  }

  override set mapDesignType(value: LongdoMapDesignType) {
    this._mapDesignType = value;
  }

  // Called by LongdoView when controller is initialized

  // Called by LongdoView when camera position changes

  // If zoom/bearing/tilt are all 0, treat as position-only update (matches Android/iOS behavior)
}

export function useLongdoViewState(params: LongdoViewStateParams = {}): LongdoViewStateInterface {
  const [state] = useState(() => new LongdoViewState(params));
  return state;
}
