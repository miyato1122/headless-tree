import {
  AssistiveDndState,
  type DndState,
  type HotkeysConfig,
  type TreeInstance,
} from "@headless-tree/core";
import { type PropType, defineComponent, h } from "vue";

// https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09

const styles = {
  position: "absolute",
  margin: "-1px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
} as const;

export const getDefaultLabel = <T,>(
  dnd: DndState<T> | null | undefined,
  assistiveState: AssistiveDndState,
  hotkeys: HotkeysConfig<T>,
) => {
  if (!hotkeys.startDrag) return ""; // No hotkey feature configured
  const itemNames =
    dnd?.draggedItems?.map((item) => item.getItemName()).join(", ") ?? "";
  const position = !dnd?.dragTarget
    ? "None"
    : "childIndex" in dnd.dragTarget
      ? `${dnd.dragTarget.childIndex} of ${dnd.dragTarget.item.getChildren().length} in ${dnd.dragTarget.item.getItemName()}`
      : `in ${dnd.dragTarget.item.getItemName()}`;
  const navGuide =
    `Press ${hotkeys.dragUp?.hotkey} and ${hotkeys.dragDown?.hotkey} to move up or down, ` +
    `${hotkeys.completeDrag?.hotkey} to drop, ${hotkeys.cancelDrag?.hotkey} to abort.`;
  switch (assistiveState) {
    case AssistiveDndState.Started:
      return itemNames
        ? `Dragging ${itemNames}. Current position: ${position}. ${navGuide}`
        : `Current position: ${position}. ${navGuide}`;
    case AssistiveDndState.Dragging:
      return itemNames ? `${itemNames}, ${position}` : position;
    case AssistiveDndState.Completed:
      return `Drag completed. Press ${hotkeys.startDrag?.hotkey} to move selected items`;
    case AssistiveDndState.Aborted:
      return `Drag cancelled. Press ${hotkeys.startDrag?.hotkey} to move selected items`;
    case AssistiveDndState.None:
    default:
      return `Press ${hotkeys.startDrag?.hotkey} to move selected items`;
  }
};

/**
 * Accessible live-region describing the current drag-and-drop state, ported from the
 * React adapter. Pass the tree instance via the `tree` prop. The description reflects the
 * tree state at the time the component renders, so place it inside a component that
 * re-renders on tree state changes (i.e. one that reads the `useTree` ref).
 */
export const AssistiveTreeDescription = defineComponent({
  name: "AssistiveTreeDescription",
  props: {
    tree: {
      type: Object as PropType<TreeInstance<any>>,
      required: true,
    },
    getLabel: {
      type: Function as PropType<typeof getDefaultLabel>,
      default: getDefaultLabel,
    },
  },
  setup(props) {
    return () => {
      const state = props.tree.getState();
      return h(
        "span",
        {
          "aria-live": "assertive",
          style: styles,
        },
        props.getLabel(
          state.dnd,
          state.assistiveDndState ?? AssistiveDndState.None,
          props.tree.getHotkeyPresets(),
        ),
      );
    };
  },
});
