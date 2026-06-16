import {
  type TreeConfig,
  type TreeInstance,
  type TreeState,
  createTree,
} from "@headless-tree/core";
import {
  type Ref,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  triggerRef,
  watchEffect,
} from "vue";
import { vuePropsFeature } from "./vue-props-feature";

/**
 * Either a static config object, or a getter that returns the config. Use the getter
 * form if the config depends on reactive state that should update the tree, e.g.
 * `useTree(() => ({ ...someReactiveConfig }))`.
 */
export type UseTreeInput<T> = TreeConfig<T> | (() => TreeConfig<T>);

/**
 * Vue 3 integration for headless-tree.
 *
 * Returns a `Ref<TreeInstance<T>>`. Read `tree.value` in your template (e.g.
 * `tree.value.getItems()`); accessing `.value` registers a reactive dependency so the
 * component re-renders whenever the tree state changes.
 *
 * The `vuePropsFeature` is added automatically so that the props returned by
 * `getProps()`, `getContainerProps()` etc. are compatible with Vue's `v-bind`.
 */
export const useTree = <T>(input: UseTreeInput<T>): Ref<TreeInstance<T>> => {
  const resolveConfig = (): TreeConfig<T> =>
    typeof input === "function" ? (input as () => TreeConfig<T>)() : input;

  const initialConfig = resolveConfig();
  const tree = createTree<T>({
    ...initialConfig,
    features: [...(initialConfig.features ?? []), vuePropsFeature],
  });

  // Mirrors the React adapter's `useState`: holds the part of the state that is not
  // managed externally by the user via `config.state`.
  let stateStore: Partial<TreeState<T>> = tree.getState();

  // Reactive handle. Reading `treeRef.value` in a render function registers a
  // dependency; `triggerRef` forces a re-render whenever the tree state changes.
  const treeRef = shallowRef(tree) as Ref<TreeInstance<T>>;

  onMounted(() => {
    (tree as any).setMounted(true);
    tree.rebuildTree();
    triggerRef(treeRef);
  });

  onBeforeUnmount(() => {
    (tree as any).setMounted(false);
  });

  // Re-apply the config whenever any reactive dependency read inside resolveConfig
  // changes. This is the Vue equivalent of React re-running `setConfig` on every render.
  watchEffect(() => {
    const config = resolveConfig();
    tree.setConfig((prev) => ({
      ...prev,
      ...config,
      state: {
        ...stateStore,
        ...config.state,
      },
      setState: (updaterOrValue) => {
        stateStore =
          typeof updaterOrValue === "function"
            ? updaterOrValue(stateStore)
            : updaterOrValue;
        config.setState?.(stateStore);
        triggerRef(treeRef);
      },
    }));
  });

  return treeRef;
};
