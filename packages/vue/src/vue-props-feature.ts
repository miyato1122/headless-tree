import type { FeatureImplementation } from "@headless-tree/core";

/**
 * headless-tree generates React-compliant prop objects. This feature rewrites those
 * props so they can be spread onto Vue elements with `v-bind`:
 *
 * - Event handler keys are normalized from React's camelCase (`onDragStart`) to the form
 *   Vue maps to native DOM events (`onDragstart`). When a raw `v-bind` object is used,
 *   Vue only lowercases the first character after `on` to derive the event name, so
 *   `onDragStart` would listen for a non-existent `dragStart` event instead of
 *   `dragstart`. This silently breaks all multi-word events (dragstart, dragover,
 *   dragenter, dragleave, dragend). Single-word handlers like `onClick`/`onDrop` are
 *   unaffected but pass through the same normalization harmlessly.
 * - `onChange` on text inputs is remapped to `onInput`. React's `onChange` fires on every
 *   keystroke, whereas Vue's native `change` event only fires on blur/enter; `onInput`
 *   restores the expected per-keystroke behaviour.
 * - The `ref` callback is removed. Vue does not process `ref` inside a `v-bind` object
 *   (it is a compiler-reserved attribute), so it would be rendered as an invalid DOM
 *   attribute. Element registration is handled instead via the `vHtElement` directive.
 *
 * Attributes like `tabIndex` and all `aria-*` props are understood by Vue's `v-bind`
 * as-is and are left untouched.
 */

const isEventKey = (key: string) => /^on[A-Z]/.test(key);

/** `onDragStart` -> `onDragstart` so Vue binds it to the native `dragstart` event. */
const normalizeEventKey = (key: string) =>
  `on${key[2]}${key.slice(3).toLowerCase()}`;

const adaptProps = (
  props: Record<string, any>,
  { remapChangeToInput = false }: { remapChangeToInput?: boolean } = {},
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of Object.keys(props)) {
    if (key === "ref") {
      continue;
    }
    if (isEventKey(key)) {
      const normalized = normalizeEventKey(key);
      if (remapChangeToInput && normalized === "onChange") {
        result.onInput = props[key];
      } else {
        result[normalized] = props[key];
      }
    } else {
      result[key] = props[key];
    }
  }
  return result;
};

export const vuePropsFeature: FeatureImplementation = {
  key: "vue-props",

  treeInstance: {
    getContainerProps: ({ prev }, treeLabel?: string) =>
      adaptProps(prev?.(treeLabel) ?? {}),
    getSearchInputElementProps: ({ prev }) =>
      adaptProps(prev?.() ?? {}, { remapChangeToInput: true }),
  },

  itemInstance: {
    getProps: ({ prev }) => adaptProps(prev?.() ?? {}),
    getCheckboxProps: ({ prev }) => adaptProps(prev?.() ?? {}),
    getRenameInputProps: ({ prev }) =>
      adaptProps(prev?.() ?? {}, { remapChangeToInput: true }),
    // Needed when `seperateDragHandle` is enabled: the handle element carries the
    // drag-start handlers, which must be normalized just like getProps().
    getDragHandleProps: ({ prev }) => adaptProps(prev?.() ?? {}),
  },
};
