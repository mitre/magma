import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "./stores/authStore.js";
import axios from "axios";

import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import AgentsView from "./views/AgentsView.vue";
import AbilitiesView from "./views/AbilitiesView.vue";
import AdversariesView from "./views/AdversariesView.vue";
import OperationsView from "./views/OperationsView.vue";
import FactSourcesView from "./views/FactSourcesView.vue";
import ObjectivesView from "./views/ObjectivesView.vue";
import PlannersView from "./views/PlannersView.vue";
import ContactsView from "./views/ContactsView.vue";
import ObfuscatorsView from "./views/ObfuscatorsView.vue";
import SettingsView from "./views/SettingsView.vue";
import ExfilledFilesView from "./views/ExfilledFilesView.vue";
import PluginView from "./views/PluginView.vue";
import NotFoundView from "./views/NotFoundView.vue";

// Cant use global API variable because we aren't in a component
const $api = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_CALDERA_URL || "http://localhost:8888",
});

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/agents",
      name: "agents",
      component: AgentsView,
    },
    {
      path: "/abilities",
      name: "abilities",
      component: AbilitiesView,
    },
    {
      path: "/adversaries",
      name: "adversaries",
      component: AdversariesView,
    },
    {
      path: "/operations",
      name: "operations",
      component: OperationsView,
    },
    {
      path: "/factsources",
      name: "factsources",
      component: FactSourcesView,
    },
    {
      path: "/objectives",
      name: "objectives",
      component: ObjectivesView,
    },
    {
      path: "/planners",
      name: "planners",
      component: PlannersView,
    },
    {
      path: "/contacts",
      name: "contacts",
      component: ContactsView,
    },
    {
      path: "/obfuscators",
      name: "obfuscators",
      component: ObfuscatorsView,
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
    },
    {
      path: "/exfilledfiles",
      name: "exfilledfiles",
      component: ExfilledFilesView,
    },
    {
      path: "/plugins/:pluginName",
      name: "Plugin",
      component: PluginView,
      props: true,
    },
    {
      path: '/docs/index.html',
      beforeEnter: () => {
        // Redirect to the external docs page
        if (!import.meta.env.PROD) {
          window.location.href = (import.meta.env.VITE_CALDERA_URL || 'http://localhost:8888') + '/docs/index.html';
          return;
        }
        window.location.href = '/docs/index.html';
      }
    },
    { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFoundView },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

router.beforeEach(async (to) => {
  const publicPages = ["/login"];
  const authRequiredPages = !publicPages.includes(to.path);
  const auth = useAuthStore();
  // Check that the user is authenticated before each page in case something changes in server
  auth.isUserAuthenticated = await auth.getAuthStatus($api);
  if (to.path == "/login" && auth.isUserAuthenticated) {
    return "/";
  }
  if (authRequiredPages && !auth.isUserAuthenticated) {
    auth.returnUrl = to.name;
    return "/login";
  }
});

export default router;
