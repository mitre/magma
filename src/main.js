import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import VueScrollTo from "vue-scrollto";
import axios from "axios";
import FloatingVue from "floating-vue";

// Global styles
import 'floating-vue/dist/style.css';

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
app.use(FloatingVue)

app.mount("#app");
