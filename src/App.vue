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
@import "/src/assets/css/custom-bulma.css";
</style>
