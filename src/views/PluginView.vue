<script setup>
import { defineAsyncComponent, shallowRef, watch, ref, inject } from "vue";
import PluginErrorView from "./PluginErrorView.vue";
import PluginLoadingView from "./PluginLoadingView.vue";

const isProduction = import.meta.env.PROD;

const $api = inject("$api");

const props = defineProps(["pluginName"]);

const pluginComponent = shallowRef();

const legacyIframe = ref();
const isUsingLegacy = ref(false);
// const legacyScriptPaths = [
//   "/gui/js/shared.js",
//   "/gui/js/core.js",
//   "/gui/js/lib/bulma-toast.min.js",
//   "/gui/js/lib/confetti.browser.min.js",
// ];
// const legacyStylePaths = [
//   "/gui/css/shared.css",
//   "/gui/css/core.css",
//   "/gui/css/modal.css",
//   "/gui/css/basic.css",
//   "/gui/css/timeline.css",
//   "/gui/css/multi-select.css",
//   "/gui/css/lib/custom-bulma.css",
//   "/gui/css/lib/bulma-tooltip.min.css",
//   "/gui/css/lib/fa-all.min.css",
// ];

const plugins = isProduction
  ? import.meta.glob("../plugins/**/views/*.vue")
  : import.meta.glob("../../../**/gui/views/*.vue");

watch(() => props.pluginName, loadComp);

async function loadComp() {
  const requestedPluginLoader =
    plugins[
      isProduction
        ? `../plugins/${props.pluginName}/views/${props.pluginName}.vue`
        : `../../../${props.pluginName}/gui/views/${props.pluginName}.vue`
    ];

  if (!requestedPluginLoader) {
    try {
      await $api.get(`http://localhost:8888/plugin/${props.pluginName}/gui`);
      isUsingLegacy.value = true;
      // TODO: Decide whether or not to inject script tags from vue or have the plugin do it
      // legacyIframe.value.onload = () => {
      //   let iframeDocument =
      //     legacyIframe.value.contentDocument ||
      //     legacyIframe.value.contentWindow.document;
      //   legacyScriptPaths.forEach((path) => {
      //     // Inject a <script> tag
      //     let script = iframeDocument.createElement("script");
      //     script.src = path;
      //     iframeDocument.head.appendChild(script);
      //   });
      //   legacyStylePaths.forEach((path) => {
      //     let link = iframeDocument.createElement("link");
      //     link.href = path;
      //     link.rel = "stylesheet";
      //     iframeDocument.head.appendChild(link);
      //   });
      //   let alpineScript = iframeDocument.createElement("script");
      //   alpineScript.src = "/gui/js/lib/alpine.min.js";
      //   alpineScript.defer = true;
      //   iframeDocument.head.appendChild(alpineScript);
      // };
      return;
    } catch (error) {
      pluginComponent.value = PluginErrorView;
      console.error(error);
      return;
    }
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
component(v-if="pluginComponent" :is="pluginComponent")
.warning(v-if="isUsingLegacy")
  h2 Warning: You're currently using the legacy plugin interface for {{props.pluginName}}. While it might function, we cannot guarantee its full compatibility or stability. For the best experience, we recommend updating to the latest UI version.
iframe(v-if="isUsingLegacy" ref="legacyIframe" :src="'http://localhost:8888/plugin/' + props.pluginName + '/gui'" )
</template>

<style>
iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.warning {
  background-color: rgb(251, 162, 169);
  border: 1px solid red;
  padding: 10px;
  color: black;
  margin-bottom: 30px;
  border-radius: 5px;
}
</style>
