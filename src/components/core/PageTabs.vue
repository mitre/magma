<script setup>
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore.js";

const coreDisplayStore = useCoreDisplayStore();

let { openTabs, activeTab } = storeToRefs(coreDisplayStore);

const route = useRoute();
const router = useRouter();

watch(route, (route, prevRoute) => {
  if (route.params.pluginName) {
    activeTab = route.params.pluginName;
    coreDisplayStore.addTab(
      route.params.pluginName,
      `/plugins/${route.params.pluginName}`
    );
  } else {
    activeTab = route.name;
    coreDisplayStore.addTab(route.name, `/${route.name}`);
  }
});
watch(activeTab, (tab, prevTab) => {
  if (!tab) router.push("/");
});
</script>

<template lang="pug">
#tabs.is-flex.is-flex-direction-row
  .tab.is-flex.is-align-items-center(v-for="(tab, index) in openTabs" :class="{ 'is-active': tab.name === activeTab }" @click.self="router.push(tab.path)")
    span.mr-2(:to="tab.path") {{ tab.name }}
    button.delete(@click="coreDisplayStore.removeTab(index)")
</template>

<style scoped>
#tabs {
  width: 100%;
  height: 50px;
  padding: 10px;
  background-color: #111;
}

.tab {
  background-color: #2c2c2c;
  border-radius: 4px;
  padding: 10px;
  margin-right: 10px;
  cursor: pointer;
  user-select: none;
}
</style>
