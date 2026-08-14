// React Native から安全に読める入口。地図の描画実装（`LongdoView.web`）を含まない。
//
// ルートの barrel は Longdo Map API3（内部で MapLibre GL JS を読み込む）を静的に
// 引き込む。ブラウザ向けバンドラなら問題ないが、Metro/Hermes はこれを即時評価するため、
// React Native に存在しないブラウザのグローバル（window / document）で落ちる。
// `@mapconductor/reactnative-for-longdo` はルートではなくここから import する。
// react-for-maplibre / react-for-arcgis の state.ts と同じ取り決め。
export { LongdoDesign, type LongdoMapDesignType } from './LongdoDesign';
export { LongdoViewState, useLongdoViewState, type LongdoViewStateInterface } from './LongdoViewState';
