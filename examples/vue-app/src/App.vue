<script setup lang="ts">
import {
  asyncDataLoaderFeature,
  createOnDropHandler,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
} from "@headless-tree/core";
import { AssistiveTreeDescription, useTree } from "@headless-tree/vue";
import { type DemoItem, asyncDataLoader, data } from "./data";

const tree = useTree<DemoItem>(() => ({
  initialState: {
    expandedItems: ["fruit"],
    selectedItems: ["banana", "orange"],
  },
  rootItemId: "root",
  getItemName: (item) => item.getItemData()?.name,
  isItemFolder: (item) => !!item.getItemData()?.children,
  canReorder: true,
  onDrop: createOnDropHandler<DemoItem>((item, newChildren) => {
    data[item.getId()].children = newChildren;
  }),
  indent: 20,
  dataLoader: asyncDataLoader,
  features: [
    asyncDataLoaderFeature,
    selectionFeature,
    hotkeysCoreFeature,
    dragAndDropFeature,
    keyboardDragAndDropFeature,
  ],
}));
</script>

<template>
  <div :style="{ maxWidth: '300px' }">
    <div v-bind="tree.getContainerProps()" v-ht-element="tree" class="tree">
      <AssistiveTreeDescription :tree="tree" />
      <button
        v-for="item in tree.getItems()"
        :key="item.getId()"
        v-bind="item.getProps()"
        v-ht-element="item"
        :style="{ paddingLeft: `${item.getItemMeta().level * 20}px` }"
      >
        <div
          class="treeitem"
          :class="{
            focused: item.isFocused(),
            expanded: item.isExpanded(),
            selected: item.isSelected(),
            folder: item.isFolder(),
            drop: item.isDragTarget(),
          }"
        >
          {{ item.getItemName() }}
        </div>
      </button>
      <div :style="tree.getDragLineStyle()" class="dragline" />
    </div>
  </div>
</template>
