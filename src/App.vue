<script setup>
import { useRoute } from "vue-router";

import Navigation from "./components/core/Navigation.vue";
import PageTabs from "./components/core/PageTabs.vue";
const route = useRoute();
</script>

<template lang="pug">
//- Login page
.fullwh(v-if="route.name === 'login'")
    router-view

//- All other pages
.is-flex.is-flex-direction-row.fullwh(v-else)
    Suspense
        navigation

    main.fullwh
        page-tabs

        .p-4.fullwh
            router-view
</template>

<style>
/* GLOBAL STYLES */
@import "/src/assets/css/custom-bulma.css";

.auto-complete:active .search-results, .auto-complete:focus-within .search-results {
    border-top: 1px solid #363636 !important;
    border: 1px solid var(--primary-color);
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

.pointer {
    cursor: pointer;
}

.search-results {
    overflow-y: scroll;
    max-height: 400%;
    background-color: #262626;
    position: absolute;
    z-index: 5;
    width: 100%;
    border-top: none;
    margin-top: -2px;
    border-radius: 0;
}
.search-results p {
    margin-bottom: 0 !important;
    padding: 5px;
    cursor: pointer !important;
}
.search-results p:hover {
    background-color: #484848;
}

.vr {
    width: 1px;
    height: 30px;
    margin: 0 20px 0 10px;
    background-color: grey;
}
</style>
