<script setup>
import {reactive, inject } from "vue";
import { useOperationStore } from "../../stores/operationStore";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { storeToRefs } from "pinia";
const operationStore = useOperationStore();
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const $api = inject("$api");
const manualCommand = reactive({
    agent: operationStore.selectedOperation.host_group[0],
    executor: {
        name: operationStore.selectedOperation.host_group[0].executors[0],
        command: "",
        platform: ""    
    },
    paw: "",
});

function addManualCommand(){
    if(manualCommand.executor.command.length <= 0) {
        //TODO tell user to enter manual command
        return;
    }
    manualCommand.paw = manualCommand.agent.paw;
    manualCommand.executor.platform = manualCommand.agent.platform;
    if (operationStore.selectedOperation.state === "paused") {
        // TODO tell user operation is paused
        modals.value.operations.showAddManualCommand = false;
    }
    operationStore.addManualCommand($api, manualCommand);
    modals.value.operations.showAddManualCommand = false;
}
</script>

<template lang="pug">
tr(id="input-command")
    td
    td
    td New Manual Command
    td
        .select
            select(v-model="manualCommand.agent")
                option(v-for="(agent, idx) in operationStore.selectedOperation.host_group" :key="agent.paw" :value="agent") {{ `${agent.display_name} - ${agent.paw}` }}
    td
        .select 
            select(v-model="manualCommand.executor.name")
                option(v-for="(executor) in manualCommand.agent.executors" :key="executor" :value="executor") {{`${executor}`}}
    td(colspan="2")
        textarea.textarea(v-model="manualCommand.executor.command")
    td.is-flex.is-flex-direction-column
        button.button.is-primary(@click="addManualCommand()") Add Command 
        button.button.mt-2(@click="modals.operations.showAddManualCommand = false") Cancel
        
</template>

<style scoped>
</style>
