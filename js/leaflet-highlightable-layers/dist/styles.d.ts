import { PathOptions, Renderer } from "leaflet";
import { HighlightableLayerOptions } from "./layers";
export declare function generatePolygonStyles(options: HighlightableLayerOptions<PathOptions>, renderer: Renderer): Record<string, PathOptions>;
export declare function generatePolylineStyles(options: HighlightableLayerOptions<PathOptions>, renderer: Renderer): Record<string, PathOptions>;
