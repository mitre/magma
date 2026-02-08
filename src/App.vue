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
const showReconnect = ref(false);

const $api = inject("$api");

const restartMessage = ref("Caldera is restarting. You will be redirected shortly.");
const showSpinner = ref(true);

let restartTimer = null;
let pollTimer = null;
let pollDelayTimer = null;
let reconnectTimer = null;

const POLL_DELAY_MS = 25000;

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
        clearTimeout(restartTimer);
        clearTimeout(pollDelayTimer);
        clearInterval(pollTimer);
        clearTimeout(reconnectTimer);
        return;
    }

  // reset UI
restartMessage.value = "Caldera is Re-Building.";
showSpinner.value = true;
showReconnect.value = false;

// 1️⃣ message change at 10s
restartTimer = setTimeout(() => {
  restartMessage.value =
    "Still Re-Building this may take a little longer.\nYou will be redirected shortly.";
}, 10000);

// 2️⃣ reconnect button at 20s
reconnectTimer = setTimeout(() => {
  showReconnect.value = true;
}, 20000);

// 3️⃣ START POLLING AFTER UI HAS UPDATED
pollDelayTimer = setTimeout(() => {

  pollTimer = setInterval(async () => {
  try {
    await $api.get("/api/v2/health", {
      params: { t: Date.now() },
      validateStatus: () => true
    });

    clearInterval(pollTimer);
    window.location.reload();

  } catch {
    // backend still down
  }
}, 2000);

}, POLL_DELAY_MS); // polling starts AFTER message + button timing
});
onUnmounted(() => {
  clearTimeout(restartTimer);
  clearTimeout(pollDelayTimer);
  clearInterval(pollTimer);
  clearTimeout(reconnectTimer);
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
