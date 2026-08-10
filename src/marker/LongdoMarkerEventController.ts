import { DefaultMarkerEventController, type MarkerEventHost } from '@mapconductor/js-sdk-core';
import { LongdoMarkerController } from './LongdoMarkerController';
import { type LongdoActualMarker } from './MarkerLayer';

/**
 * Longdo のマーカーイベント。
 *
 * ドラッグの状態遷移・パン抑止・リスナー転送はすべてコアの
 * {@link DefaultMarkerEventController} が持つ。ここに残るのは
 * **Longdo 固有のもの**だけ——いまは何も無い。
 *
 * 移行前はこのファイルが 165 行あり、maplibre / mapbox / maptiler / tomtom / longdo の
 * 5 本が**型名以外 1 文字も違わなかった**。
 */
export class LongdoMarkerEventController extends DefaultMarkerEventController<LongdoActualMarker> {
    constructor(controller: LongdoMarkerController) {
        super(controller as unknown as MarkerEventHost<LongdoActualMarker>);
    }
}
