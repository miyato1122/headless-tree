import { reactive } from "vue";

/** Symbology kind, used to draw the legend swatch for a layer. */
export type LayerKind =
  | "basemap"
  | "raster"
  | "vector-fill"
  | "vector-line"
  | "vector-point";

/**
 * A GIS-style layer. Group nodes have `children`; leaf nodes are concrete map layers
 * with a `kind` + `color` (drives the legend swatch) and an `opacity` (0-100).
 */
export interface LayerNode {
  name: string;
  /** present on group nodes */
  children?: string[];
  /** symbology kind, only meaningful for leaf layers */
  kind?: LayerKind;
  /** legend colour, only meaningful for leaf layers */
  color?: string;
  /** layer opacity in percent, only meaningful for leaf layers */
  opacity?: number;
}

/**
 * Reactive layer catalog. The tree's data loader reads from this object, so mutating it
 * (e.g. on drag-and-drop reorder, or an opacity change) and rebuilding the tree reflects
 * the change immediately.
 */
export const layers: Record<string, LayerNode> = reactive({
  root: { name: "Map", children: ["basemaps", "overlays"] },

  basemaps: { name: "Base maps", children: ["osm", "satellite", "terrain"] },
  osm: { name: "OpenStreetMap", kind: "basemap", color: "#a3b18a", opacity: 100 },
  satellite: { name: "Satellite", kind: "raster", color: "#4a5d23", opacity: 100 },
  terrain: { name: "Terrain", kind: "raster", color: "#c2a878", opacity: 100 },

  overlays: { name: "Overlays", children: ["boundaries", "transport", "poi"] },

  boundaries: { name: "Boundaries", children: ["countries", "regions"] },
  countries: { name: "Countries", kind: "vector-line", color: "#6d6875", opacity: 80 },
  regions: { name: "Regions", kind: "vector-fill", color: "#e5989b", opacity: 55 },

  transport: { name: "Transport", children: ["roads", "railways"] },
  roads: { name: "Roads", kind: "vector-line", color: "#e07a5f", opacity: 90 },
  railways: { name: "Railways", kind: "vector-line", color: "#3d405b", opacity: 90 },

  poi: { name: "Points of interest", children: ["restaurants", "hotels"] },
  restaurants: { name: "Restaurants", kind: "vector-point", color: "#f2542d", opacity: 100 },
  hotels: { name: "Hotels", kind: "vector-point", color: "#0e9594", opacity: 100 },
});

export const dataLoader = {
  getItem: (id: string) => layers[id],
  getChildren: (id: string) => layers[id]?.children ?? [],
};
