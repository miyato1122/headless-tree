import { reactive } from "vue";

/**
 * A GIS-style layer. Groups have `children`; leaf entries are concrete map layers
 * with a `kind` and an `opacity` (0-100).
 */
export interface LayerNode {
  name: string;
  /** present on group nodes */
  children?: string[];
  /** layer kind, only meaningful for leaf layers */
  kind?: "raster" | "vector" | "basemap";
  /** layer opacity in percent, only meaningful for leaf layers */
  opacity?: number;
}

/**
 * Reactive layer catalog. The tree's data loader reads from this object, so mutating it
 * (e.g. on drag-and-drop reorder) and rebuilding the tree reflects changes immediately.
 */
export const layers: Record<string, LayerNode> = reactive({
  root: { name: "Map", children: ["basemaps", "overlays"] },

  basemaps: { name: "Base maps", children: ["osm", "satellite", "terrain"] },
  osm: { name: "OpenStreetMap", kind: "basemap", opacity: 100 },
  satellite: { name: "Satellite", kind: "basemap", opacity: 100 },
  terrain: { name: "Terrain", kind: "basemap", opacity: 100 },

  overlays: { name: "Overlays", children: ["boundaries", "transport", "poi"] },

  boundaries: { name: "Boundaries", children: ["countries", "regions"] },
  countries: { name: "Countries", kind: "vector", opacity: 80 },
  regions: { name: "Regions", kind: "vector", opacity: 60 },

  transport: { name: "Transport", children: ["roads", "railways"] },
  roads: { name: "Roads", kind: "vector", opacity: 90 },
  railways: { name: "Railways", kind: "vector", opacity: 90 },

  poi: { name: "Points of interest", children: ["restaurants", "hotels"] },
  restaurants: { name: "Restaurants", kind: "vector", opacity: 100 },
  hotels: { name: "Hotels", kind: "vector", opacity: 100 },
});

export const dataLoader = {
  getItem: (id: string) => layers[id],
  getChildren: (id: string) => layers[id]?.children ?? [],
};
