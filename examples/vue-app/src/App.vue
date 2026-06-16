<script setup lang="ts">
import {
  checkboxesFeature,
  createOnDropHandler,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { AssistiveTreeDescription, useTree } from "@headless-tree/vue";
import { computed } from "vue";
import { type LayerNode, dataLoader, layers } from "./data";

/**
 * "Pseudo map" state. In a real app these handlers would call into MapLibre / Leaflet /
 * OpenLayers (e.g. `map.setLayoutProperty(id, "visibility", ...)`, `map.moveLayer(...)`).
 * Here we just record the resulting visible draw order so the effect is observable.
 */
const tree = useTree<LayerNode>(() => ({
  rootItemId: "root",
  getItemName: (item) => item.getItemData().name,
  isItemFolder: (item) => !!item.getItemData().children,
  dataLoader,
  indent: 20,
  initialState: {
    expandedItems: ["basemaps", "overlays", "boundaries", "transport"],
    checkedItems: ["osm", "countries", "roads"],
  },
  // visibility cascades from groups to layers
  propagateCheckedState: true,
  canCheckFolders: false,
  // ordered drag-and-drop = layer draw order
  canReorder: true,
  // forbid moving a basemap out of the "Base maps" group
  canDrop: (items, target) => {
    const movingBasemap = items.some(
      (i) => i.getItemData().kind === "basemap",
    );
    if (!movingBasemap) return true;
    // basemaps may only be reordered within the "Base maps" group
    return (
      target.item.getId() === "basemaps" ||
      target.item.isDescendentOf("basemaps")
    );
  },
  onDrop: createOnDropHandler<LayerNode>((item, newChildren) => {
    layers[item.getId()].children = newChildren;
  }),
  features: [
    syncDataLoaderFeature,
    selectionFeature,
    checkboxesFeature,
    hotkeysCoreFeature,
    dragAndDropFeature,
    keyboardDragAndDropFeature,
  ],
}));

// Derived "map state": the visible leaf layers in draw order, top-most first.
const visibleLayers = computed(() => {
  // touch the reactive tree so this recomputes on every tree change
  const items = tree.value.getItems();
  return items
    .filter(
      (item) =>
        !item.isFolder() && item.getCheckedState() !== "unchecked",
    )
    .map((item) => ({
      id: item.getId(),
      name: item.getItemName(),
      opacity: item.getItemData().opacity ?? 100,
    }))
    .reverse();
});

const setOpacity = (id: string, value: number) => {
  layers[id].opacity = value;
};
</script>

<template>
  <div class="app">
    <section class="panel">
      <h1>GIS Layer Tree</h1>
      <p class="hint">
        Toggle visibility (with group cascade &amp; indeterminate state), drag to reorder
        draw order, expand/collapse groups, and adjust per-layer opacity. Keyboard
        drag-and-drop is enabled and announced for screen readers.
      </p>

      <div v-bind="tree.getContainerProps('GIS layers')" v-ht-element="tree" class="tree">
        <AssistiveTreeDescription :tree="tree" />
        <div
          v-for="item in tree.getItems()"
          :key="item.getId()"
          v-bind="item.getProps()"
          v-ht-element="item"
          class="treeitem"
          :class="{
            focused: item.isFocused(),
            selected: item.isSelected(),
            folder: item.isFolder(),
            drop: item.isDragTarget?.(),
          }"
          :style="{ paddingLeft: `${item.getItemMeta().level * 20 + 8}px` }"
        >
          <span v-if="item.isFolder()" class="twisty">
            {{ item.isExpanded() ? "▾" : "▸" }}
          </span>
          <span v-else class="twisty spacer" />

          <input
            type="checkbox"
            class="visibility"
            v-bind="item.getCheckboxProps()"
            v-ht-indeterminate="item.getCheckedState() === 'indeterminate'"
            :aria-label="`Toggle visibility of ${item.getItemName()}`"
            @click.stop
          />

          <span class="label">{{ item.getItemName() }}</span>

          <input
            v-if="!item.isFolder()"
            type="range"
            class="opacity"
            min="0"
            max="100"
            :value="item.getItemData().opacity ?? 100"
            :aria-label="`Opacity of ${item.getItemName()}`"
            @click.stop
            @input="
              setOpacity(item.getId(), Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>
        <div :style="tree.getDragLineStyle()" class="dragline" />
      </div>
    </section>

    <section class="panel mapstate">
      <h2>Pseudo map state</h2>
      <p class="hint">Visible layers, top-most draw order first:</p>
      <ol>
        <li v-for="layer in visibleLayers" :key="layer.id">
          <code>{{ layer.id }}</code>
          <span>{{ layer.name }}</span>
          <span class="opacityval">{{ layer.opacity }}%</span>
        </li>
        <li v-if="visibleLayers.length === 0" class="empty">No visible layers</li>
      </ol>
    </section>
  </div>
</template>
