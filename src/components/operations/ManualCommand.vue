<script setup>
import { reactive, inject, ref } from "vue";
import { storeToRefs } from "pinia";
import { toast } from "bulma-toast";

import CodeEditor from "@/components/core/CodeEditor.vue";
import { useOperationStore } from "@/stores/operationStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";

const operationStore = useOperationStore();
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const $api = inject("$api");

const manualCommand = reactive({
  agent: operationStore.currentOperation.host_group[0],
  executor: {
    name: operationStore.currentOperation.host_group[0].executors[0],
    command: "",
    platform: "",
  },
  paw: "",
});
const selectedAgent = ref(operationStore.currentOperation.host_group[0].paw);

const handleAgentSelect = (agent) => {
  manualCommand.agent = agent;
};

function addManualCommand() {
  if (manualCommand.executor.command.length <= 0) {
    toast({
      message: "Please enter a command",
      type: "is-danger",
      dismissible: true,
      pauseOnHover: true,
      duration: 2000,
      position: "bottom-right",
    });
    return;
  }
  manualCommand.paw = manualCommand.agent.paw;
  manualCommand.executor.platform = manualCommand.agent.platform;
  if (operationStore.currentOperation.state === "paused") {
    toast({
      message: "Operation is paused",
      type: "is-danger",
      dismissible: true,
      pauseOnHover: true,
      duration: 2000,
      position: "bottom-right",
    });
    modals.value.operations.showAddManualCommand = false;
    return;
  }
  operationStore.addManualCommand($api, manualCommand);
  modals.value.operations.showAddManualCommand = false;
}
</script>

<template lang="pug">
tr(id="manual-input-command")
    td New Manual Command
    td(colspan="2")
        .control
            .select
                select(v-model="selectedAgent")
                    option(disabled default value="") Select an agent
                    option(v-for="(agent, idx) in operationStore.currentOperation.host_group" :key="agent.paw" :value="agent.paw" @change="handleAgentSelect(agent)") {{ `${agent.display_name} - ${agent.paw}` }}
    td
        .control
            .select 
                select(v-model="manualCommand.executor.name")
                    option(disabled default value="") Select an executor
                    option(v-for="(executor) in manualCommand.agent.executors" :key="executor" :value="executor") {{`${executor}`}}
    td(colspan="3")
        CodeEditor(v-model="manualCommand.executor.command" language="bash" line-numbers)
    td
        .is-flex.is-flex-direction-column.is-justify-content-center
            button.button.is-primary(@click="addManualCommand()" :disabled="!manualCommand.agent || !manualCommand.executor.command || !manualCommand.executor.name") Add Command 
            button.button.mt-2(@click="modals.operations.showAddManualCommand = false") Cancel 
</template>
