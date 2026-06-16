import { vHtElement, vHtIndeterminate } from "@headless-tree/vue";
import { createApp } from "vue";
import App from "./App.vue";
import "./gis.css";

createApp(App)
  .directive("ht-element", vHtElement)
  .directive("ht-indeterminate", vHtIndeterminate)
  .mount("#app");
