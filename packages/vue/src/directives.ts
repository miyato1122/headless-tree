import type { ItemInstance, TreeInstance } from "@headless-tree/core";
import type { Directive } from "vue";

type Registerable =
  | Pick<TreeInstance<any>, "registerElement">
  | Pick<ItemInstance<any>, "registerElement">;

/**
 * Registers the DOM element of a tree item or the tree container with headless-tree.
 * This replaces the React `ref` callback that `vuePropsFeature` strips out of the
 * generated props.
 *
 * Usage:
 * ```html
 * <div v-bind="tree.getContainerProps()" v-ht-element="tree"> ... </div>
 * <div v-bind="item.getProps()" v-ht-element="item"> ... </div>
 * ```
 */
export const vHtElement: Directive<HTMLElement, Registerable | undefined> = {
  mounted(el, binding) {
    binding.value?.registerElement(el);
  },
  beforeUnmount(el, binding) {
    binding.value?.registerElement(null);
  },
};

/**
 * Reflects the indeterminate (partially-checked) state onto a checkbox input. The native
 * `indeterminate` property cannot be set through an HTML attribute, so it needs to be
 * applied imperatively.
 *
 * Usage:
 * ```html
 * <input
 *   type="checkbox"
 *   v-bind="item.getCheckboxProps()"
 *   v-ht-indeterminate="item.getCheckedState() === 'indeterminate'"
 * />
 * ```
 */
export const vHtIndeterminate: Directive<HTMLInputElement, boolean> = {
  mounted(el, binding) {
    el.indeterminate = !!binding.value;
  },
  updated(el, binding) {
    el.indeterminate = !!binding.value;
  },
};
