# @mapconductor/react-for-longdo

Longdo Map provider for the MapConductor React SDK. Renders a
[Longdo Map](https://map.longdo.com/) (Longdo Map API3, which uses MapLibre GL JS
internally) through MapConductor's provider-independent camera, marker, and
overlay API, so the same application code can also run on Google Maps, MapLibre,
Mapbox, MapTiler, Leaflet, OpenLayers, ArcGIS, Cesium, HERE, or TomTom.

## Installation

```shell
npm install @mapconductor/react-for-longdo @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

The Longdo Map API3 script (which bundles MapLibre GL JS and its Web Worker) is
loaded from `api.longdo.com` on demand — you do **not** need to install or
configure `maplibre-gl` yourself, and there is no stylesheet to import.

## API key

Longdo Map requires a [Longdo Map API key](https://map.longdo.com/console/) that
is authorized for the **web origin** your app is served from (unlike the Android
key, which is restricted by package name). Pass it to the view state:

```tsx
const state = useLongdoViewState({
  apiKey: LONGDO,
  mapDesignType: LongdoDesign.Normal,
  cameraPosition,
});
```

## Usage

```tsx
import {
  LongdoDesign,
  LongdoMapView2D,
  useLongdoViewState,
} from '@mapconductor/react-for-longdo';
import { MapCameraPosition, createGeoPoint } from '@mapconductor/js-sdk-core';

// Your own key. Read it from your environment however your build tool does
// it, and keep it out of source control.
const LONGDO = '…';

function Map() {
  const state = useLongdoViewState({
    apiKey: LONGDO,
    mapDesignType: LongdoDesign.Normal,
    cameraPosition: MapCameraPosition.create({
      position: createGeoPoint({ latitude: 13.7563, longitude: 100.5018 }),
      zoom: 11,
    }),
  });

  return <LongdoMapView2D state={state} />;
}
```

## Map designs

`LongdoDesign` exposes the standard base layers provided by `longdo.Layers`:

`Normal`, `Easy`, `Pastel`, `PastelGray`, `Hard`, `Gray`, `Light`, `Night`,
`Dark`, `Political`, `Osm`, `Satellite` (`SPHERE_IMAGES`), `Hybrid`
(`SPHERE_HYBRID`).

Switch design by updating the view state's `mapDesignType`.

## How it works

Longdo Map API3 renders through an internal MapLibre GL JS map exposed as
`map.Renderer`. This provider bootstraps the base map, camera, and base-layer
designs through the Longdo wrapper (`longdo.Map`) and drives camera control,
map events, and all overlays (markers, polylines, polygons, circles, ground
images, raster layers) through `map.Renderer` — the same MapLibre-based renderer
architecture used by the other MapConductor MapLibre-family providers.

## License

Apache-2.0
