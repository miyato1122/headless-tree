import { vHtElement, vHtIndeterminate } from "@headless-tree/vue";
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App)
  // register the helper directives used to bind element refs / indeterminate state
  .directive("ht-element", vHtElement)
  .directive("ht-indeterminate", vHtIndeterminate)
  .mount("#app");
