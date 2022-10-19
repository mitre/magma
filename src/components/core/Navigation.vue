<script setup>
import { useCoreDisplayStore } from "../../stores/coreDisplayStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { inject } from "vue";
import { useCoreStore } from "../../stores/coreStore";
import { storeToRefs } from "pinia";

const authStore = useAuthStore();
const coreDisplayStore = useCoreDisplayStore();
const coreStore = useCoreStore();
const { enabledPlugins, availablePlugins } = storeToRefs(coreStore);

const $api = inject("$api");

try {
    await coreStore.getAvailablePlugins($api);
    await coreStore.getMainConfig($api);
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

function promptToEnablePlugin(pluginName) {
    if (confirm(`The "${pluginName}" plugin is currently disabled. Would you like to enable it?\n\nNote: Enabling the plugin will require you to restart CALDERA.`)) {
        enablePlugin(pluginName);
    }
}

async function enablePlugin(pluginName) {
    try {
        await $api.patch('/api/v2/config/main', {
            value: pluginName,
            prop: 'plugin'
        });
    } catch(error) {
        console.error(`Error enabling ${pluginName}`);
    }
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
            li(v-for="plugin in availablePlugins")
                router-link.menu-item(v-if="enabledPlugins.includes(plugin.name)" :to="`/plugins/${plugin.name}`") {{ plugin.name }}
                p.menu-item(v-else @click="promptToEnablePlugin(plugin.name)") {{ plugin.name }}
        p.menu-label
            font-awesome-icon(icon="fas fa-cog").pr-2
            | Configuration
        ul.menu-list
            li
                router-link.menu-item(to="/settings") settings
            li
                router-link.menu-item(to="/fact sources") fact sources
            li
                router-link.menu-item(to="/objectives") objectives
            li
                router-link.menu-item(to="/contacts") contacts
            li
                router-link.menu-item(to="/exfilled files") exfilled files
        p.menu-label
            font-awesome-icon(icon="fas fa-book").pr-2
            | Resources
        ul.menu-list
            li
                router-link.menu-item(to="/planners") planners
            li
                router-link.menu-item(to="/obfuscators") obfuscators
            li
                a.menu-item(href="/api/docs" target="_blank") 
                    | api docs
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
    border: 1px solid transparent;
    border-radius: 8px;
}

p.menu-item {
    color: grey;
}
p.menu-item:hover {
    cursor: pointer;
    border: 1px solid grey;
}
</style>
