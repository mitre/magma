<script setup>
import { inject, ref, onMounted } from "vue";
import { useOperationStore } from '../stores/operationStore';
import { useCoreDisplayStore } from "../stores/coreDisplayStore";
import createModal from '../components/operations/createModal.vue';
import { storeToRefs } from "pinia";

const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();
let isCreateOperationActive = ref(false);
let adversaries = ref([{name: "Test", id: 0}]);
onMounted(async () => {
    await operationStore.getOperations($api);
    operationStore.operations.push({id: 0, name: "Test Operations"});
});

</script>

<template lang="pug">
.content
    h2 Operations
hr
form.has-text-centered
    .field 
        .control 
            .select 
                select(v-model="operationStore.selectedOperation.id" @change="selectOperation()")
                    option(disabled selected value="") Choose an operation 
                    option(v-for="operation in operationStore.operations" :key="operation.id" :value="operation.id") {{ `${operation.name}` }}
            .button.is-primary(@click="modals.operations.showCreate = true") Create an operation


.message.control-panel
    p.message-header Control Panel
    p.message-body Stop run run 1 link manual command potential link


//- Modals
createModal
</template>

<style>
    .control-panel{
        position: fixed;
        bottom: 10px;
        width: 81%;
    }
</style>