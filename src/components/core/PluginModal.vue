<script setup>
import { inject, nextTick, watch } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useCoreStore } from "../../stores/coreStore";

const $api = inject("$api");
const coreStore = useCoreStore();

const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

async function enablePlugin() {
  if (!modals.value?.core) return;

  const pluginName = modals.value.core.selectedPlugin;
  if (!pluginName) return;

  // 1️⃣ show overlay FIRST
  coreDisplayStore.$patch({ restarting: true });

  // 2️⃣ close modal immediately
  modals.value.core.showPluginPopup = false;

  // 3️⃣ allow Vue to render overlay
  await nextTick();
  await new Promise(requestAnimationFrame);
  // 4️⃣ now trigger backend restart

  $api.post(
    `/api/v2/plugins/${pluginName}/enable`,
    { build_gui: true }
  ).catch(() => {
  });
}
async function disablePlugins() {
  if (!modals.value?.core) return;

  const plugins = (modals.value.core.selectedPlugins || []);


  if (!plugins.length) return;

  coreDisplayStore.$patch({ restarting: true });

  modals.value.core.showPluginPopup = false;

  await nextTick();
  await new Promise(requestAnimationFrame);

  $api.post(`/api/v2/plugins/disable`, {
    plugins
  }).catch(() => {});
}
watch(
  () => modals.value?.core?.availableToDisable,
  (val) => {
    console.log("availableToDisable:", val);
  },
  { immediate: true }
);
</script>
<template lang="pug">
.modal(
  v-if="modals && modals.core"
  :class="{ 'is-active': modals.core.showPluginPopup }"
)
  .modal-background(@click="modals.core.showPluginPopup = false")

  .modal-card

    header.modal-card-head
      p.modal-card-title(
        v-if="modals.core.mode === 'enable'"
      )
        | Enable {{ modals.core.selectedPlugin }} Plugin

      p.modal-card-title(
        v-else
      )
        | Disable Plugins

    .modal-card-body

      // ---------- ENABLE VIEW ----------
      template(v-if="modals.core.mode === 'enable'")
        p.has-text-centered.has-text-weight-semibold.mb-4
            | Enable {{ modals.core.selectedPlugin }} plugin?

        hr.modal-divider

        .plugin-enable-info
            p.has-text-centered
            | Enabling this plugin will rebuild the plugin interface and restart Caldera.

        hr.modal-divider

        p.has-text-centered.has-text-warning
            span.icon.mr-1
            font-awesome-icon(icon="fas fa-triangle-exclamation")
            | Caldera will restart during this process.


      // ---------- DISABLE VIEW ----------
      template(v-else)
        p.has-text-centered.has-text-weight-semibold.mb-4
            | Select plugins to disable

        hr.modal-divider

        .plugin-disable-list
            .plugin-disable-item(
                v-for="plugin in (modals.core.availableToDisable || [])"
                :key="plugin"
            )
                label.checkbox.is-flex.is-align-items-center
                    input(
                    type="checkbox"
                    v-model="modals.core.selectedPlugins"
                    :value="plugin"
                    )
                    span.ml-2.has-text-weight-medium {{ plugin }}

                p.plugin-disable-desc
                    | Removes plugin UI components and rebuilds Caldera.

        hr.modal-divider

        p.has-text-centered.has-text-warning
            span.icon.mr-1
            font-awesome-icon(icon="fas fa-triangle-exclamation")
            | Disabling plugins will restart Caldera.


    footer.modal-card-foot.is-flex.is-justify-content-flex-end
      button.button(
        @click="modals.core.showPluginPopup = false"
      )
        | Cancel

      button.button.is-primary(
        v-if="modals.core.mode === 'enable'"
        @click="enablePlugin"
      )
        | Confirm

      button.button.is-danger(
        v-else
        @click="disablePlugins"
      )
        | Disable Selected

</template>
<style scoped>
.modal-divider {
  background: rgba(255,255,255,0.08);
  border: none;
  height: 1px;
  margin: 1.25rem 0;
}

.plugin-disable-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plugin-disable-item {
  padding: 0.5rem 0.25rem;
  border-radius: 6px;
}

.plugin-disable-item:hover {
  background: rgba(255,255,255,0.04);
}

.plugin-disable-desc {
  font-size: 0.85rem;
  color: #aaa;
  margin-left: 1.9rem; /* aligns under text, not checkbox */
  margin-top: 0.2rem;
}

</style>