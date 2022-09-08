import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import VueScrollTo from "vue-scrollto";
import axios from "axios";

const app = createApp(App);
// Set default API url
const $api = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_CALDERA_URL || "http://localhost:8888/",
});
app.provide("$api", $api);

app.use(createPinia());
app.use(router);
app.use(VueScrollTo);

app.mount("#app");
