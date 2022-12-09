<script setup>
import { inject } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { useCoreStore } from "@/stores/coreStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore.js";
import { useAuthStore } from "@/stores/authStore.js";

const authStore = useAuthStore();
const coreDisplayStore = useCoreDisplayStore();
const coreStore = useCoreStore();
const { enabledPlugins, availablePlugins, userSettings } = storeToRefs(coreStore);

const router = useRouter();

const $api = inject("$api");

try {
    await coreStore.getAvailablePlugins($api);
    await coreStore.getMainConfig($api);
} catch (error) {
    console.log(error);
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
#navigation(:class="{ 'collapsed': userSettings.collapseNavigation }")
    #expandCollapse
        a.icon(@click="coreStore.modifyUserSettings('collapseNavigation', !userSettings.collapseNavigation)")
            font-awesome-icon(:icon="userSettings.collapseNavigation ? 'fas fa-angles-right' : 'fas fa-angles-left'")
    #logo(v-if="!userSettings.collapseNavigation")
        img(src="/src/assets/img/caldera-logo.png" alt="Caldera Logo" @click="router.push('/')")
    #logo-collapsed(v-if="userSettings.collapseNavigation")
        img(src="/src/assets/img/caldera-logo-mtn.png" alt="Caldera Logo" @click="router.push('/')")
    aside.menu(v-if="!userSettings.collapseNavigation")
        
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
                router-link.menu-item(to="/factsources") fact sources
            li
                router-link.menu-item(to="/objectives") objectives
            li
                router-link.menu-item(to="/contacts") contacts
            li
                router-link.menu-item(to="/exfilledfiles") exfilled files
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

    .is-flex.is-flex-direction-column.is-align-items-center(v-else)
        .dropdown.is-hoverable.mb-2
            .dropdown-trigger
                button.button(aria-haspopup="true" aria-controls="dropdown-menu")
                    span.icon.is-small
                        font-awesome-icon(icon="fas fa-flag")
            .dropdown-menu(role="menu")
                .dropdown-content.ml-2
                    router-link.dropdown-item(to="/agents") agents
                    router-link.dropdown-item(to="/abilities") abilities
                    router-link.dropdown-item(to="/adversaries") adversaries
                    router-link.dropdown-item(to="/operations") operations
        .dropdown.is-hoverable.mb-2
            .dropdown-trigger
                button.button(aria-haspopup="true" aria-controls="dropdown-menu")
                    span.icon.is-small
                        font-awesome-icon(icon="fas fa-puzzle-piece")
            .dropdown-menu(role="menu")
                .dropdown-content.ml-2
                    div(v-for="plugin in availablePlugins")
                        router-link.menu-item(v-if="enabledPlugins.includes(plugin.name)" :to="`/plugins/${plugin.name}`") {{ plugin.name }}
                        p.menu-item(v-else @click="promptToEnablePlugin(plugin.name)") {{ plugin.name }}
        .dropdown.is-hoverable.mb-2
            .dropdown-trigger
                button.button(aria-haspopup="true" aria-controls="dropdown-menu")
                    span.icon.is-small
                        font-awesome-icon(icon="fas fa-cog")
            .dropdown-menu(role="menu")
                .dropdown-content.ml-2
                    router-link.dropdown-item(to="/settings") settings
                    router-link.dropdown-item(to="/factsources") fact sources
                    router-link.dropdown-item(to="/objectives") objectives
                    router-link.dropdown-item(to="/contacts") contacts
                    router-link.dropdown-item(to="/exfilledfiles") exfilled files
        .dropdown.is-hoverable.mb-2
            .dropdown-trigger
                button.button(aria-haspopup="true" aria-controls="dropdown-menu")
                    span.icon.is-small
                        font-awesome-icon(icon="fas fa-book")
            .dropdown-menu(role="menu")
                .dropdown-content.ml-2
                    router-link.dropdown-item(to="/planners") planners
                    router-link.dropdown-item(to="/obfuscators") obfuscators
                    a.dropdown-item(href="/api/docs" target="_blank") 
                        | api docs
                        font-awesome-icon(icon="fas fa-external-link-alt").pl-1.is-size-7
</template>

<style scoped>
#logo {
    width: 100%;
    text-align: center;
}
#logo > img {
    max-height: 150px;
    cursor: pointer;
    padding: 2em 3em;
}
#logo-collapsed > img {
    width: auto;
    height : auto;
    max-height: 100%;
    max-width: 100%;
    padding: 50px 10px 0 10px;
    margin-bottom: 15px;
}

#navigation {
    position: relative;
    background-color: #060606;
    width: 220px;
    min-width: 220px;
}
#navigation.collapsed {
    width: 50px;
}

#expandCollapse {
    position: absolute;
    top: 10px;
    right: 12px;
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

.dropdown-menu {
    top: 0;
    left: 100%;
    padding-top: 0;
}
</style>
