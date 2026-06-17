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
import { type LayerNode, dataLoader, layers } from "./layers";

/**
 * In a real app the handlers below would call into MapLibre / Leaflet / OpenLayers
 * (e.g. `map.setLayoutProperty(id, "visibility", ...)`, `map.moveLayer(...)`). Here we
 * just derive a "pseudo map state" from the tree so the effects are observable.
 */
const tree = useTree<LayerNode>(() => ({
  rootItemId: "root",
  getItemName: (item) => item.getItemData()?.name,
  isItemFolder: (item) => !!item.getItemData()?.children,
  dataLoader,
  indent: 16,
  initialState: {
    expandedItems: ["basemaps", "overlays", "boundaries", "transport", "poi"],
    checkedItems: ["osm", "countries", "roads"],
  },
  // group visibility cascades to its layers
  propagateCheckedState: true,
  canCheckFolders: false,
  // ordered drag-and-drop = layer draw order; drag from the handle only
  canReorder: true,
  seperateDragHandle: true,
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

// Visible leaf layers in draw order (top-most first) for the pseudo map panel.
const visibleLayers = computed(() =>
  tree.value
    .getItems()
    .filter((item) => !item.isFolder() && item.getCheckedState() === "checked")
    .map((item) => {
      const d = item.getItemData();
      return {
        id: item.getId(),
        name: d.name,
        color: d.color ?? "#888",
        opacity: d.opacity ?? 100,
      };
    })
    .reverse(),
);

const setOpacity = (id: string, value: number) => {
  layers[id].opacity = value;
};
</script>

<template>
  <div class="app">
    <section class="panel">
      <h1>GIS Layer Tree</h1>
      <p class="hint">
        Group visibility cascades to layers (indeterminate when partial). Drag the handle
        to reorder draw order. Adjust per-layer opacity. Each layer shows a legend swatch
        that follows its opacity. Keyboard drag-and-drop is enabled and announced.
      </p>

      <div
        v-bind="tree.getContainerProps('GIS layers')"
        v-ht-element="tree"
        class="tree"
      >
        <AssistiveTreeDescription :tree="tree" />
        <div
          v-for="item in tree.getItems()"
          :key="item.getId()"
          v-bind="item.getProps()"
          v-ht-element="item"
          class="row"
          :class="{
            focused: item.isFocused(),
            selected: item.isSelected(),
            folder: item.isFolder(),
            drop: item.isDragTarget(),
          }"
          :style="{ paddingLeft: `${item.getItemMeta().level * 16 + 6}px` }"
        >
          <span
            class="handle"
            v-bind="item.getDragHandleProps()"
            title="Drag to reorder"
            @click.stop
            >⠿</span
          >

          <span v-if="item.isFolder()" class="twisty">{{
            item.isExpanded() ? "▼" : "▶"
          }}</span>
          <span v-else class="twisty spacer" />

          <input
            type="checkbox"
            class="visibility"
            v-bind="item.getCheckboxProps()"
            v-ht-indeterminate="item.getCheckedState() === 'indeterminate'"
            :aria-label="`Toggle visibility of ${item.getItemName()}`"
            @click.stop
          />

          <span
            v-if="!item.isFolder()"
            class="legend"
            :class="`legend--${item.getItemData().kind}`"
            :style="{
              '--swatch': item.getItemData().color ?? '#888',
              opacity: (item.getItemData().opacity ?? 100) / 100,
            }"
          />

          <span class="label">{{ item.getItemName() }}</span>

          <input
            v-if="!item.isFolder()"
            type="range"
            min="0"
            max="100"
            class="opacity"
            :value="item.getItemData().opacity ?? 100"
            :aria-label="`Opacity of ${item.getItemName()}`"
            @click.stop
            @input="
              setOpacity(
                item.getId(),
                Number(($event.target as HTMLInputElement).value),
              )
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
          <span
            class="legend-dot"
            :style="{ background: layer.color, opacity: layer.opacity / 100 }"
          />
          <span class="label">{{ layer.name }}</span>
          <span class="opacityval">{{ layer.opacity }}%</span>
        </li>
        <li v-if="visibleLayers.length === 0" class="empty">No visible layers</li>
      </ol>
    </section>
  </div>
</template>
