import {
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { describe, expect, it } from "vitest";
import { useTree } from "./use-tree";

type Item = { name: string; children?: string[] };

const items: Record<string, Item> = {
  root: { name: "Root", children: ["a", "b"] },
  a: { name: "A", children: ["a1", "a2"] },
  a1: { name: "A1" },
  a2: { name: "A2" },
  b: { name: "B" },
};

const dataLoader = {
  getItem: (id: string) => items[id],
  getChildren: (id: string) => items[id]?.children ?? [],
};

const makeComponent = () =>
  defineComponent({
    setup() {
      const tree = useTree<Item>({
        rootItemId: "root",
        getItemName: (item) => item.getItemData().name,
        isItemFolder: (item) => !!item.getItemData().children,
        dataLoader,
        initialState: { expandedItems: ["a"] },
        features: [
          syncDataLoaderFeature,
          selectionFeature,
          hotkeysCoreFeature,
        ],
      });
      return { tree };
    },
    render() {
      const tree = this.tree;
      return h(
        "div",
        { ...tree.getContainerProps(), class: "tree" },
        tree
          .getItems()
          .map((item) =>
            h(
              "button",
              { ...item.getProps(), key: item.getId(), "data-id": item.getId() },
              item.getItemName(),
            ),
          ),
      );
    },
  });

describe("useTree (Vue adapter)", () => {
  it("renders the visible items after mount, respecting expanded state", async () => {
    const wrapper = mount(makeComponent());
    await nextTick();

    const ids = wrapper.findAll("button").map((b) => b.attributes("data-id"));
    // "a" is expanded initially, so its children are visible; "b" has no children
    expect(ids).toEqual(["a", "a1", "a2", "b"]);
  });

  it("reactively re-renders when an item is expanded/collapsed", async () => {
    const wrapper = mount(makeComponent());
    await nextTick();

    // collapse "a"
    const treeInstance = (wrapper.vm as any).tree;
    treeInstance.getItemInstance("a").collapse();
    await nextTick();

    const ids = wrapper.findAll("button").map((b) => b.attributes("data-id"));
    expect(ids).toEqual(["a", "b"]);
  });

  it("strips the React `ref` prop so v-bind stays clean", () => {
    const wrapper = mount(makeComponent());
    const treeInstance = (wrapper.vm as any).tree;

    const containerProps = treeInstance.getContainerProps();
    expect("ref" in containerProps).toBe(false);
    expect(containerProps.role).toBe("tree");

    const itemProps = treeInstance.getItems()[0].getProps();
    expect("ref" in itemProps).toBe(false);
    expect(itemProps.role).toBe("treeitem");
    // event handlers remain as onXxx props, which Vue's v-bind understands
    expect(typeof itemProps.onClick).toBe("function");
  });
});
