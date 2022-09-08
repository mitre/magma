<script setup>
import { defineAsyncComponent, shallowRef, watch } from "vue";
import PluginErrorView from "./PluginErrorView.vue";
import PluginLoadingView from "./PluginLoadingView.vue";
const props = defineProps(["pluginName"]);
const pluginComponent = shallowRef();
const plugins = import.meta.glob("../../../plugins/**/views/*.vue");

function loadComp() {
  if (
    plugins[
      `../../../plugins/${props.pluginName}/views/${props.pluginName}.vue`
    ]
  ) {
    pluginComponent.value = defineAsyncComponent({
      //Source: https://vuejs.org/guide/components/async.html
      // the loader function
      loader:
        plugins[
          `../../../plugins/${props.pluginName}/views/${props.pluginName}.vue`
        ],

      // A component to use while the async component is loading
      loadingComponent: PluginLoadingView,
      // Delay before showing the loading component. Default: 200ms.
      delay: 200,
      // A component to use if the load fails
      errorComponent: PluginErrorView,
      // The error component will be displayed if a timeout is
      // provided and exceeded. Default: Infinity.
      timeout: 3000,
    });
  } else {
    pluginComponent.value = PluginErrorView;
  }
}
loadComp();
watch(() => props.pluginName, loadComp);
</script>

<template lang="pug">
component(:is="pluginComponent")
</template>

<style scoped></style>
