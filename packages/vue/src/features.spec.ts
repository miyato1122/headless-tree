import {
  checkboxesFeature,
  hotkeysCoreFeature,
  renamingFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, withDirectives } from "vue";
import { describe, expect, it, vi } from "vitest";
import { vHtIndeterminate, vHtRef } from "./directives";
import { useTree } from "./use-tree";

type Item = { name: string; children?: string[] };

const makeData = (): Record<string, Item> => ({
  root: { name: "Root", children: ["fruits", "veggies"] },
  fruits: { name: "Fruits", children: ["apple", "banana"] },
  apple: { name: "Apple" },
  banana: { name: "Banana" },
  veggies: { name: "Vegetables", children: ["carrot"] },
  carrot: { name: "Carrot" },
});

const dataLoaderFor = (data: Record<string, Item>) => ({
  getItem: (id: string) => data[id],
  getChildren: (id: string) => data[id]?.children ?? [],
});

const find = (wrapper: any, selector: string) => wrapper.find(selector);

// ---------------------------------------------------------------------------
// Checkboxes: toggle, parent->child propagation, indeterminate state
// ---------------------------------------------------------------------------
describe("checkboxes (Vue)", () => {
  const makeComponent = (
    data: Record<string, Item>,
    initialChecked: string[] = [],
  ) =>
    defineComponent({
      setup() {
        const tree = useTree<Item>(() => ({
          rootItemId: "root",
          getItemName: (item) => item.getItemData()?.name,
          isItemFolder: (item) => !!item.getItemData()?.children,
          dataLoader: dataLoaderFor(data),
          initialState: {
            expandedItems: ["fruits", "veggies"],
            checkedItems: initialChecked,
          },
          propagateCheckedState: true,
          features: [
            syncDataLoaderFeature,
            selectionFeature,
            checkboxesFeature,
            hotkeysCoreFeature,
          ],
        }));
        return { tree };
      },
      render() {
        const tree = this.tree;
        return h(
          "div",
          { ...tree.getContainerProps() },
          tree.getItems().map((item) =>
            h("div", { key: item.getId(), "data-row": item.getId() }, [
              withDirectives(
                h("input", {
                  type: "checkbox",
                  ...item.getCheckboxProps(),
                  "data-cb": item.getId(),
                }),
                [[vHtIndeterminate, item.getCheckedState() === "indeterminate"]],
              ),
              h(
                "button",
                { ...item.getProps(), "data-id": item.getId() },
                item.getItemName(),
              ),
            ]),
          ),
        );
      },
    });

  it("toggles a leaf checkbox via a real change event", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    expect(tree.getItemInstance("apple").getCheckedState()).toBe("unchecked");
    await find(wrapper, '[data-cb="apple"]').trigger("change");
    await flushPromises();
    expect(tree.getItemInstance("apple").getCheckedState()).toBe("checked");
  });

  it("propagates a folder check down to its descendants", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    await find(wrapper, '[data-cb="fruits"]').trigger("change");
    await flushPromises();

    expect(tree.getItemInstance("apple").getCheckedState()).toBe("checked");
    expect(tree.getItemInstance("banana").getCheckedState()).toBe("checked");
    expect(tree.getItemInstance("fruits").getCheckedState()).toBe("checked");
  });

  it("shows an indeterminate folder when only some children are checked", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data, ["apple"]));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    expect(tree.getItemInstance("fruits").getCheckedState()).toBe(
      "indeterminate",
    );
    // the vHtIndeterminate directive reflects it onto the DOM property
    const folderCb = find(wrapper, '[data-cb="fruits"]')
      .element as HTMLInputElement;
    expect(folderCb.indeterminate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Renaming: start, edit via input, complete (onRename) / abort, autofocus
// ---------------------------------------------------------------------------
describe("renaming (Vue)", () => {
  const makeComponent = (data: Record<string, Item>, onRename: any) =>
    defineComponent({
      setup() {
        const tree = useTree<Item>(() => ({
          rootItemId: "root",
          getItemName: (item) => item.getItemData()?.name,
          isItemFolder: (item) => !!item.getItemData()?.children,
          dataLoader: dataLoaderFor(data),
          initialState: { expandedItems: ["fruits"] },
          onRename,
          features: [
            syncDataLoaderFeature,
            selectionFeature,
            renamingFeature,
            hotkeysCoreFeature,
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
              item.isRenaming()
                ? withDirectives(
                    h("input", {
                      ...item.getRenameInputProps(),
                      "data-rename": item.getId(),
                    }),
                    [[vHtRef, (el: HTMLElement | null) => el?.focus()]],
                  )
                : h(
                    "button",
                    { ...item.getProps(), "data-id": item.getId() },
                    item.getItemName(),
                  ),
            ),
        );
      },
    });

  it("renders + autofocuses the rename input and completes via onRename", async () => {
    const data = makeData();
    const onRename = vi.fn();
    const wrapper = mount(makeComponent(data, onRename), {
      attachTo: document.body,
    });
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    tree.getItemInstance("apple").startRenaming();
    await nextTick();

    const input = find(wrapper, '[data-rename="apple"]');
    expect(input.exists()).toBe(true);
    // vHtRef autofocus
    expect(document.activeElement).toBe(input.element);

    // edit via a real input event (onChange remapped to onInput)
    (input.element as HTMLInputElement).value = "Apricot";
    await input.trigger("input");
    expect(tree.getRenamingValue()).toBe("Apricot");

    tree.completeRenaming();
    await flushPromises();
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename.mock.calls[0][1]).toBe("Apricot");

    wrapper.unmount();
  });

  it("aborts renaming without calling onRename", async () => {
    const data = makeData();
    const onRename = vi.fn();
    const wrapper = mount(makeComponent(data, onRename));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    tree.getItemInstance("apple").startRenaming();
    await nextTick();
    expect(tree.isRenamingItem()).toBe(true);

    tree.abortRenaming();
    await nextTick();
    expect(tree.isRenamingItem()).toBe(false);
    expect(onRename).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Search: open, input registration (vHtRef), typeahead matching
// ---------------------------------------------------------------------------
describe("search (Vue)", () => {
  const makeComponent = (data: Record<string, Item>) =>
    defineComponent({
      setup() {
        const tree = useTree<Item>(() => ({
          rootItemId: "root",
          getItemName: (item) => item.getItemData()?.name,
          isItemFolder: (item) => !!item.getItemData()?.children,
          dataLoader: dataLoaderFor(data),
          initialState: { expandedItems: ["fruits", "veggies"] },
          features: [
            syncDataLoaderFeature,
            selectionFeature,
            searchFeature,
            hotkeysCoreFeature,
          ],
        }));
        return { tree };
      },
      render() {
        const tree = this.tree;
        const children: any[] = [];
        if (tree.isSearchOpen()) {
          children.push(
            withDirectives(
              h("input", {
                ...tree.getSearchInputElementProps(),
                "data-search": "1",
              }),
              [[vHtRef, tree.registerSearchInputElement]],
            ),
          );
        }
        children.push(
          ...tree
            .getItems()
            .map((item) =>
              h(
                "button",
                { ...item.getProps(), "data-id": item.getId() },
                item.getItemName(),
              ),
            ),
        );
        return h("div", { ...tree.getContainerProps() }, children);
      },
    });

  it("registers the search input (vHtRef) and filters via a real input event", async () => {
    const data = makeData();
    const wrapper = mount(makeComponent(data));
    await nextTick();
    const tree = (wrapper.vm as any).tree;

    tree.openSearch();
    await nextTick();

    const input = find(wrapper, '[data-search="1"]');
    expect(input.exists()).toBe(true);
    // vHtRef -> registerSearchInputElement wired the element back to the tree
    expect(tree.getSearchInputElement()).toBe(input.element);

    (input.element as HTMLInputElement).value = "carrot";
    await input.trigger("input");
    await nextTick();

    expect(tree.getSearchValue()).toBe("carrot");
    const matches = tree.getSearchMatchingItems().map((i: any) => i.getId());
    expect(matches).toContain("carrot");
    expect(matches).not.toContain("apple");
  });
});
