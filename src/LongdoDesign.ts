import type { AttributionRule, MapDesignTypeInterface } from '@mapconductor/js-sdk-core';

export interface LongdoMapDesignType extends MapDesignTypeInterface<string> {
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
export class LongdoDesign implements LongdoMapDesignType {
  readonly id: string;
  readonly layerName: string;
  readonly attributionRules: readonly AttributionRule[];

  constructor(
    id: string,
    layerName: string,
    attributionRules: readonly AttributionRule[] = [],
  ) {
    this.id = id;
    this.layerName = layerName;
    this.attributionRules = attributionRules;
  }

  getValue(): string {
    return `mapDesign_id=${this.id},layer=${this.layerName}`;
  }

  /** Standard road map. */
  static readonly Normal = new LongdoDesign('Normal', 'NORMAL');
  /** Simplified, easy-to-read map. */
  static readonly Easy = new LongdoDesign('Easy', 'EASY');
  /** Pastel-toned map. */
  static readonly Pastel = new LongdoDesign('Pastel', 'PASTEL');
  /** Pastel grayscale map. */
  static readonly PastelGray = new LongdoDesign('PastelGray', 'PASTEL_GRAY');
  /** High-contrast map. */
  static readonly Hard = new LongdoDesign('Hard', 'HARD');
  /** Grayscale map. */
  static readonly Gray = new LongdoDesign('Gray', 'GRAY');
  /** Light map. */
  static readonly Light = new LongdoDesign('Light', 'LIGHT');
  /** Night (dark) map. */
  static readonly Night = new LongdoDesign('Night', 'NIGHT');
  /** Dark-themed map. */
  static readonly Dark = new LongdoDesign('Dark', 'DARK');
  /** Political / administrative map. */
  static readonly Political = new LongdoDesign('Political', 'POLITICAL');
  /** OpenStreetMap base map. */
  static readonly Osm = new LongdoDesign('Osm', 'OSM');
  /** Satellite imagery. */
  static readonly Satellite = new LongdoDesign('Satellite', 'SPHERE_IMAGES');
  /** Satellite imagery with labels (hybrid). */
  static readonly Hybrid = new LongdoDesign('Hybrid', 'SPHERE_HYBRID');
}
