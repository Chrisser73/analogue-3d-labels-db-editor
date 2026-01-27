import { createApp } from "vue";
import App from "./App.vue";
import "./styles/style.scss";

const seoShell = document.getElementById("seo-shell");
if (seoShell) {
  seoShell.remove();
}

createApp(App).mount("#app");
