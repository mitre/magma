<script setup>
import { onMounted, watch, inject, ref, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useCoreStore } from "@/stores/coreStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useAuthStore } from "@/stores/authStore";

import Navigation from "@/components/core/Navigation.vue";
import PageTabs from "@/components/core/PageTabs.vue";

const route = useRoute();
const authStore = useAuthStore();
const coreStore = useCoreStore();
const coreDisplayStore = useCoreDisplayStore();

const { restarting } = storeToRefs(coreDisplayStore);

const $api = inject("$api");

const restartMessage = ref("Caldera is restarting…");
const showSpinner = ref(true);

let buildPollTimer = null;
let healthPollTimer = null;

function forceReconnect() {
  window.location.reload();
}

onMounted(() => {
  coreStore.getUserSettings();
});

watch(
  () => route.name,
  async (name) => {
    if (!$api) return;
    if (name === "login") return;
    if (!authStore.isUserAuthenticated) return;

    await coreStore.getAvailablePlugins($api);
    await coreStore.getMainConfig($api);
    await authStore.getGroup($api);
  },
  { immediate: true }
);

watch(restarting, (value) => {
  if (!value) {
    clearInterval(buildPollTimer);
    clearInterval(healthPollTimer);
    return;
  }

  startBuildPolling();
});

function startBuildPolling() {
  clearInterval(buildPollTimer);

  buildPollTimer = setInterval(async () => {
    try {
      const res = await $api.get("/api/v2/plugins/build-status");
      const state = res.data;

      switch (state.status) {
        case "installing":
          restartMessage.value =
            `Installing dependencies for ${state.plugin}…`;
          break;

        case "building":
          restartMessage.value =
            `Building plugin interface for ${state.plugin}…`;
          break;

        case "restarting":
          restartMessage.value = "Restarting Caldera…";
          clearInterval(buildPollTimer);
          startHealthPolling();
          break;

        default:
          restartMessage.value = "Preparing plugin…";
      }
    } catch {
      // backend may be restarting
    }
  }, 1000);
}

function startHealthPolling() {
  clearInterval(healthPollTimer);

  healthPollTimer = setInterval(async () => {
    try {
      await $api.get("/api/v2/health", {
        params: { t: Date.now() },
        validateStatus: () => true
      });

      clearInterval(healthPollTimer);
      window.location.reload();
    } catch {
      // still restarting
    }
  }, 2000);
}

onUnmounted(() => {
  clearInterval(buildPollTimer);
  clearInterval(healthPollTimer);
});
</script>
<template lang="pug">
//- GLOBAL restart overlay (ALWAYS FIRST)
.restart-overlay(v-if="restarting")
  .restart-box
    span.icon.is-large(v-if="showSpinner")
      font-awesome-icon(icon="spinner" spin)

    p.mt-3.mb-4.build-title Building Updated Plugin Interface…
    p(style="white-space: pre-line") {{ restartMessage }}

    button.button.is-primary.mt-4(
      v-if="showReconnect"
      @click="forceReconnect"
    ) Reconnect

//- Login page
.is-fullwidth(v-if="route.name === 'login'")
  router-view

//- All other pages
.is-flex.is-flex-direction-row(
  v-else
  style="min-height: 100vh;"
)
  Navigation

  main
    PageTabs

    .p-4#router
      router-view
</template>

<style scoped>
#router {
    height: calc(100% - 55px);
    margin-top: 55px;
}
</style>

<style>
/* GLOBAL STYLES */
@import "/src/assets/css/custom-bulma.css";

main {
    width: calc(100% - 220px);
}

*::-webkit-scrollbar {
  background-color: #0000;
  width: 8px;
  height: 8px;
}
*::-webkit-scrollbar-thumb {
  background: #3f3f3f;
  border-radius: 10px;
  height: 50px;
}
*::-webkit-scrollbar-corner {
  background-color: #0000;
  color: white;
}

.code {
    font-family: monospace;
}

.dropdown.searchable .dropdown-content {
    max-height: 300px;
    overflow-y: scroll;
}
.dropdown.searchable .dropdown-trigger {
    width: 100%;
}
.dropdown.searchable .dropdown-menu {
    width: 100%;
}

.is-fullwidth {
    width: 100%;
}

.pointer {
    cursor: pointer;
}

.vr {
    width: 1px;
    height: 30px;
    margin: 0 20px 0 10px;
    background-color: grey;
}
.restart-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10,10,10,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
}

.restart-box {
    text-align: center;
    font-size: 1.2rem;
}
.build-title {
  font-size: 1.6rem;
  font-weight: 600;
}

</style>
