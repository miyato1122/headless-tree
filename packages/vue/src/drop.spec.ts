import {
  createOnDropHandler,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTree } from "./use-tree";

type Item = { name: string; children?: string[] };

const makeData = (): Record<string, Item> => ({
  root: { name: "Root", children: ["a", "b"] },
  a: { name: "A", children: ["a1", "a2"] },
  a1: { name: "A1" },
  a2: { name: "A2" },
  b: { name: "B" },
});

const dataTransfer = () =>
  ({
    setData: () => {},
    getData: () => "",
    setDragImage: () => {},
    types: [] as string[],
    dropEffect: "",
    effectAllowed: "",
  }) as unknown as DataTransfer;

const makeComponent = (data: Record<string, Item>, onDrop: any) =>
  defineComponent({
    setup() {
      const tree = useTree<Item>(() => ({
        rootItemId: "root",
        getItemName: (item) => item.getItemData()?.name,
        isItemFolder: (item) => !!item.getItemData()?.children,
        dataLoader: {
          getItem: (id: string) => data[id],
          getChildren: (id: string) => data[id]?.children ?? [],
        },
        initialState: { expandedItems: ["a"] },
        canReorder: true,
        onDrop,
        features: [
          syncDataLoaderFeature,
          selectionFeature,
          hotkeysCoreFeature,
          dragAndDropFeature,
          keyboardDragAndDropFeature,
        ],
      }));
      return { tree };
    },
    render() {
      const tree = this.tree;
      return h(
        "div",
        { ...tree.getContainerProps() },
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

const findItem = (wrapper: any, id: string) =>
  wrapper.findAll("button").find((b: any) => b.attributes("data-id") === id);

describe("DOM drag event wiring (Vue v-bind)", () => {
  it("renders draggable=true on items", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data, () => {}));
    await nextTick();
    const a1 = findItem(wrapper, "a1");
    expect(a1?.attributes("draggable")).toBe("true");
  });

  it("invokes onDragStart (sets draggedItems) when a dragstart event fires", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data, () => {}));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    await findItem(wrapper, "a1")!.trigger("dragstart", {
      dataTransfer: dataTransfer(),
    });

    const dragged = tree
      .getState()
      .dnd?.draggedItems?.map((i: any) => i.getId());
    expect(dragged).toContain("a1");
  });

  it("calls the configured onDrop when a real drop event fires", async () => {
    const data = makeData();
    const onDrop = vi.fn(
      createOnDropHandler<Item>((item, newChildren) => {
        data[item.getId()].children = newChildren;
      }),
    );
    const wrapper = mount(makeComponent(data, onDrop));
    await nextTick();

    // start dragging a1
    await findItem(wrapper, "a1")!.trigger("dragstart", {
      dataTransfer: dataTransfer(),
    });
    // drag over + drop onto b
    await findItem(wrapper, "b")!.trigger("dragover", {
      dataTransfer: dataTransfer(),
    });
    await findItem(wrapper, "b")!.trigger("drop", {
      dataTransfer: dataTransfer(),
    });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));

    expect(onDrop).toHaveBeenCalled();
  });
});
