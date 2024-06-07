<script setup>
import { inject, onMounted } from "vue";
import { storeToRefs } from "pinia";

import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import UploadModal from "@/components/payloads/UploadModal.vue";
import { useAbilityStore } from "@/stores/abilityStore";

const $api = inject("$api");

const abilityStore = useAbilityStore();
const coreDisplayStore = useCoreDisplayStore();
const { payloads } = storeToRefs(abilityStore);
const { modals } = storeToRefs(coreDisplayStore);

onMounted(async () => {
    await abilityStore.getPayloads($api, true, true, false);
});

</script>

<template lang="pug">
//- Header
.content
    h2 Payloads
    p Payloads are any files that you can reference in ability executors. They are transferred to an agent which can then use them.
hr

//- Button row
.columns.mb-4
    .column.is-one-quarter.is-flex.buttons.mb-0
        button.button.is-primary.level-item(@click="modals.payloads.showUpload = true")
            span.icon
                font-awesome-icon(icon="fas fa-plus")
            span Upload a payload
    .column.is-half.is-flex.is-justify-content-center
        span.tag.is-medium.m-0
            span.has-text-success
            strong {{ payloads.length }} payload{{ payloads.length === 0 || payloads.length > 1 ? 's' : '' }}
table.table.is-striped.is-fullwidth.is-narrow
    thead
        tr
            th name
            th
    tbody
        tr.pointer(v-for="(payload, index) in payloads")
            td.is-four-fifths {{ payload }}
            td.has-text-centered
                button.delete.is-white(@click.stop="abilityStore.deletePayload($api, payload, index)")

//- Modals
UploadModal
</template>

<style scoped>
tr {
    cursor: pointer;
}

td.has-text-centered {
    width: 40px;
}
</style>
