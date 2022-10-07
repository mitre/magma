<script setup>
import { useCoreDisplayStore } from "../../stores/coreDisplayStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { usePluginStore } from "../../stores/pluginStore.js";
import { inject } from "vue";
const authStore = useAuthStore();
const coreDisplayStore = useCoreDisplayStore();
const pluginStore = usePluginStore();
const $api = inject("$api");

try {
  await pluginStore.getAllPlugins($api);
} catch (error) {
  console.log(error);
}

function openCalderaHomepage() {
  window.open("https://caldera.mitre.org?ref=caldera", "_blank");
}

function handleLogout() {
  coreDisplayStore.removeAllTabs();
  authStore.logout($api);
}
</script>

<template lang="pug">
#navigation
  #logo
    img(src="/src/assets/img/caldera-logo.png" alt="Caldera Logo" @click="openCalderaHomepage()")
  aside.menu
    p.menu-label
      font-awesome-icon(icon="fas fa-flag").pr-2
      | Campaigns
    ul.menu-list
      li
        router-link.menu-item(to="/agents") agents
      li
        router-link.menu-item(to="/abilities") abilities
      li
        router-link.menu-item(to="/adversaries") adversaries
      li
        router-link.menu-item(to="/operations") operations
    p.menu-label
      font-awesome-icon(icon="fas fa-puzzle-piece").pr-2
      | Plugins
    ul.menu-list
      li(v-for="plugin in pluginStore.plugins")
        router-link.menu-item(:to="`/plugins/${plugin.name}`") {{plugin.name}}
    p.menu-label
      font-awesome-icon(icon="fas fa-cog").pr-2
      | Configuration
    ul.menu-list
      li
        router-link.menu-item(to="/fact sources") fact sources
      li
        router-link.menu-item(to="/objectives") objectives
      li
        router-link.menu-item(to="/planners") planners
      li
        router-link.menu-item(to="/contacts") contacts
      li
        router-link.menu-item(to="/obfuscators") obfuscators
      li
        router-link.menu-item(to="/configuration") configuration
      li
        router-link.menu-item(to="/exfilled files") exfilled files
      li
        router-link.menu-item(to="/bulmatest") bulma style testing
      li
        a.menu-item(href="/api/docs" target="_blank") 
          | api docs
          sup
            font-awesome-icon(icon="fas fa-external-link-alt").pl-1.is-size-7
    ul.menu-list.has-text-centered.mt-2
      li
        .menu-item.is-clickable(@click="handleLogout()")
          span.icon
            font-awesome-icon(icon="fas fa-sign-out-alt")
          span Log out
</template>

<style scoped>
#logo {
  width: 100%;
  text-align: center;
}

#navigation {
  background-color: #060606;
  width: 250px;
}

#navigation img {
  max-height: 150px;
  cursor: pointer;
  padding: 2em 3em;
}

.menu {
  background-color: #060606;
  padding-bottom: 20px;
  user-select: none;
}

.menu-label {
  cursor: default;
  background: none !important;
  letter-spacing: 0.1em;
  color: white !important;
  padding: 8px;
  border-radius: 4px;
  margin: 0 10px;
}

.menu-item {
  padding: 0.25em 1.5em !important;
}
.menu-item:hover {
  border-radius: 4px;
  margin: 0 10px;
}
</style>
