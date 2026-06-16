import type { FeatureImplementation } from "@headless-tree/core";

/**
 * headless-tree generates React-compliant prop objects. This feature rewrites those
 * props so they can be spread onto Vue elements with `v-bind`:
 *
 * - The `ref` callback is removed. Vue does not process `ref` inside a `v-bind` object
 *   (it is a compiler-reserved attribute), so it would be rendered as an invalid DOM
 *   attribute. Element registration is handled instead via the `vHtElement` directive.
 * - `onChange` on text inputs is remapped to `onInput`. React's `onChange` fires on every
 *   keystroke, whereas Vue's native `change` event only fires on blur/enter; `onInput`
 *   restores the expected per-keystroke behaviour.
 *
 * Event handlers like `onClick`, attributes like `tabIndex` and all `aria-*` props are
 * understood by Vue's `v-bind` as-is and are left untouched.
 */

const stripRef = (props: Record<string, any>): Record<string, any> => {
  const { ref: _ref, ...rest } = props;
  return rest;
};

const remapOnChange = (props: Record<string, any>): Record<string, any> => {
  if (!("onChange" in props)) return props;
  const { onChange, ...rest } = props;
  return { ...rest, onInput: onChange };
};

export const vuePropsFeature: FeatureImplementation = {
  key: "vue-props",

  treeInstance: {
    getContainerProps: ({ prev }, treeLabel?: string) =>
      stripRef(prev?.(treeLabel) ?? {}),
    getSearchInputElementProps: ({ prev }) =>
      remapOnChange(stripRef(prev?.() ?? {})),
  },

  itemInstance: {
    getProps: ({ prev }) => stripRef(prev?.() ?? {}),
    getCheckboxProps: ({ prev }) => stripRef(prev?.() ?? {}),
    getRenameInputProps: ({ prev }) => remapOnChange(stripRef(prev?.() ?? {})),
  },
};
