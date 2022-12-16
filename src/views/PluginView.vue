<script setup>
import { defineAsyncComponent, shallowRef, watch } from "vue";
import PluginErrorView from "./PluginErrorView.vue";
import PluginLoadingView from "./PluginLoadingView.vue";

const isProduction = import.meta.env.PROD;

const props = defineProps(["pluginName"]);

const pluginComponent = shallowRef();
const plugins = isProduction ? 
  import.meta.glob("../plugins/**/views/*.vue") : 
  import.meta.glob("../../../**/gui/views/*.vue");

watch(() => props.pluginName, loadComp);

function loadComp() {
    const requestedPluginLoader = plugins[
        isProduction ? 
          `../plugins/${props.pluginName}/views/${props.pluginName}.vue` : 
          `../../../${props.pluginName}/gui/views/${props.pluginName}.vue`
      ];
    
    if (!requestedPluginLoader) {
      pluginComponent.value = PluginErrorView;
      return;
    }

    pluginComponent.value = defineAsyncComponent({
      // Source: https://vuejs.org/guide/components/async.html
      loader: requestedPluginLoader,
      loadingComponent: PluginLoadingView,
      errorComponent: PluginErrorView,
      // The error component will be displayed if a timeout is provided and exceeded. Default: Infinity.
      timeout: 10000,
    });
}

loadComp();
</script>

<template lang="pug">
component(:is="pluginComponent")
</template>
