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

// Font awesome icons, add more icons here as needed
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { 
  faAngleDown, faBan, faBook, faCheck, faCog, faExclamationTriangle, faExternalLinkAlt, faFileExport, faFileImport, faFlag, 
  faKey, faLock, faMinus, faPlus, faPuzzlePiece, faSave, faSearch, faSkullCrossbones, faSignOutAlt, faTimes, faTrash, 
  faUndo, faUnlockAlt, faUser, faWeightHanging 
} from '@fortawesome/free-solid-svg-icons';
library.add(
  faAngleDown, faBan, faBook, faCheck, faCog, faExclamationTriangle, faExternalLinkAlt, faFileExport, faFileImport, faFlag, 
  faKey, faLock, faMinus, faPlus, faPuzzlePiece, faSave, faSearch, faSkullCrossbones, faSignOutAlt, faTimes, faTrash, 
  faUndo, faUnlockAlt, faUser, faWeightHanging 
);
import { 
  faCircle, faCircleQuestion, faCopy 
} from '@fortawesome/free-regular-svg-icons';
library.add(
  faCircle, faCircleQuestion, faCopy
);
import { 
  faApple, faLinux, faWindows 
} from '@fortawesome/free-brands-svg-icons';
library.add(
  faApple, faLinux, faWindows
);

app.component('font-awesome-icon', FontAwesomeIcon);

app.mount("#app");
