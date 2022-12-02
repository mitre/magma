<script setup>
import { inject, ref, onMounted, onBeforeUnmount } from "vue";
import { useOperationStore } from '../stores/operationStore';
import { useAgentStore } from "../stores/agentStore";
import { useCoreDisplayStore } from "../stores/coreDisplayStore";
import { useCoreStore } from "../stores/coreStore";
import { getHumanFriendlyTimeISO8601, b64DecodeUnicode, getReadableTime } from "../utils/utils";
import { storeToRefs } from "pinia";
import CreateModal from '../components/operations/CreateModal.vue';
import DeleteModal from '../components/operations/DeleteModal.vue';
import DetailsModal from '../components/operations/DetailsModal.vue';
import DownloadModal from '../components/operations/DownloadModal.vue';
import CommandModal from '../components/operations/CommandModal.vue';
import OutputModal from '../components/operations/OutputModal.vue';
import AddPotentialLinkModal from "../components/operations/AddPotentialLinkModal.vue";
import ManualCommand from "../components/operations/ManualCommand.vue";
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const operationStore = useOperationStore();
const agentStore = useAgentStore();
const coreStore = useCoreStore();
const { modals } = storeToRefs(coreDisplayStore);
let updateInterval = ref();
let isControlPanelActive = ref(true);
const LINK_STATUSES = {
    0: "success",
    '-1': "paused",
    1: "failed",
    '-2': "discarded",
    '-3': "collect",
    '-4': "untrusted",
    '-5': "visible",
    124: "timeout",
};
const LINK_COLORS = {
    0: "#4a9",
    '-1': "#ffc500",
    1: "#c31",
    '-2': "#a05195",
    '-3': "#ffb000",
    '-4': "white",
    '-5': "#f012be",
    124: "cornflowerblue",
};

onMounted(async () => {
    await operationStore.getOperations($api);
    await coreStore.getObfuscators($api);
    await agentStore.getAgents($api);
    agentStore.updateAgentGroups();
});

onBeforeUnmount(() => {
    if(updateInterval) clearInterval(updateInterval);
});

function selectOperation() {
    if(updateInterval || !operationStore.selectedOperation) clearInterval(updateInterval);
    updateInterval = setInterval(async () => {
        if(operationStore.selectedOperation){
            await operationStore.updateOperationChain($api);
        } else {
            clearInterval(updateInterval);
        }
    }, "3000");
}

async function handleViewCommand(link) {
    await operationStore.setSelectedLinkByID($api, link.id, link.output);
    modals.value.operations.showCommand = true;
}

async function handleViewOutput(link) {
    await operationStore.setSelectedLinkByID($api, link.id, link.output);
    modals.value.operations.showOutput = true;
}

async function updateAuto(event) {
    operationStore.selectedOperation.autonomous = event.target.checked ? 1 : 0;
    await operationStore.updateOperation($api, 'autonomous', operationStore.selectedOperation.autonomous);
}

function isRerun() {
    return operationStore.selectedOperation.state === 'cleanup' || operationStore.selectedOperation.state === 'finished';
}

function displayManualCommand() {
    modals.value.operations.showAddManualCommand = true;
    setTimeout(() => {
        document.getElementById("input-command").scrollIntoView({
            behavior: "smooth"
        });
    }, 2);

}

</script>

<template lang="pug">
.columns.mb-0
    .column.is-4.m-0.content
        h2.m-0 Operations
    .column.is-4.m-0
        .is-flex.is-justify-content-center.is-flex-wrap-wrap
            .control.mr-2
                .select
                    select.has-text-centered(v-model="operationStore.selectedOperation" @change="selectOperation()")
                        option(disabled selected value="") Select an operation 
                        option(v-for="operation in operationStore.operations" :key="operation.id" :value="operation") {{ `${operation.name} - ${operation.chain.length} decisions | ${getHumanFriendlyTimeISO8601(operation.start)}` }}
            button.button.is-primary.mr-2(@click="modals.operations.showCreate = true" type="button") 
                span.icon
                    font-awesome-icon(icon="fas fa-plus") 
                span New Operation
    .column.is-4.m-0
        .buttons.is-justify-content-right
            button.button.mr-2(v-if="operationStore.selectedOperation" @click="modals.operations.showDownload = true" type="button")
                span.icon
                    font-awesome-icon(icon="fas fa-save")
                span Download Report
            button.button.is-danger.is-outlined(v-if="operationStore.selectedOperation" @click="modals.operations.showDelete = true" type="button")
                span.icon
                    font-awesome-icon(icon="fas fa-trash")
                span Delete Operation
hr.mt-2

//- Control Panel
.control-panel.p-0.mb-4(v-if="operationStore.selectedOperation")
    .columns.m-0.p-1
        .column.is-4.pt-0.pb-0.is-flex
            .buttons
                button.button(@click="displayManualCommand()")
                    span.icon
                        font-awesome-icon.fa(icon="fas fa-plus")
                    span Manual Command
                button.button(@click="modals.operations.showAddPotentialLink = true")
                    span.icon
                        font-awesome-icon.fa(icon="fas fa-plus")
                    span Potential Link
                button.button(@click="modals.operations.showDetails = true" type="button") Operation Details
        .column.is-4.pt-0.pb-0
            span.has-text-success.is-flex.is-justify-content-center {{ operationStore.selectedOperation.state }}
            .is-flex.is-justify-content-center.is-align-items-center.pb-2
                a.icon.is-medium.ml-3.mr-3(v-if="!isRerun()" @click="operationStore.updateOperation($api, 'state', 'cleanup')" v-tooltip="'Stop'")
                    font-awesome-icon.fa-2x(icon="fas fa-stop")
                a.icon.is-medium.ml-3.mr-3(v-if="!isRerun() && operationStore.selectedOperation.state === 'paused' || operationStore.selectedOperation.state === 'run_one_link'" @click="operationStore.updateOperation($api, 'state', 'running')" v-tooltip="'Play'")
                    font-awesome-icon.fa-2x(icon="fas fa-play")
                a.icon.is-medium.ml-3.mr-3(v-else v-if="!isRerun()" @click="operationStore.updateOperation($api, 'state', 'paused')" v-tooltip="'Pause'")
                    font-awesome-icon.fa-2x(icon="fas fa-pause")
                a.icon.is-medium.ml-3.mr-3(v-if ="!isRerun()" @click="operationStore.updateOperation($api, 'state', 'run_one_link')" v-tooltip="'Run one link'")
                    font-awesome-icon.fa-2x(icon="fas fa-play")
                    span.mt-5 1
                a.icon.is-medium.ml-3.mr-3(v-if ="isRerun()" @click="operationStore.rerunOperation($api)" v-tooltip="'Re-run Operation'")
                    font-awesome-icon.fa-2x(icon="fas fa-redo")
        .column.is-4.is-flex.is-justify-content-right.is-align-items-center.is-flex-wrap-wrap.pt-0.pb-0
            span.is-size-6 Obfuscator: 
            .control
                .select.ml-1.mr-4
                    select(v-model="operationStore.selectedOperation.obfuscator" @change="operationStore.updateOperation($api, 'obfuscator', operationStore.selectedOperation.obfuscator)")
                        option(v-for="(obf, idx) in coreStore.obfuscators" :key="idx" :value="obf.name") {{ `${obf.name}` }}
            .control
                input.switch(
                    :checked="operationStore.selectedOperation.autonomous === 1" 
                    id="switchManual" 
                    type="checkbox" 
                    @change="updateAuto($event)"
                )
                label.label(for="switchManual") {{ operationStore.selectedOperation.autonomous ? 'Autonomous' : 'Manual' }} 
        
//- Table
table.table.is-fullwidth.is-narrow.is-striped.mb-8(v-if="operationStore.selectedOperation" id="link-table")
    thead
        tr
            th Time Ran
            th Status
            th Ability Name 
            th Agent 
            th Host 
            th pid 
            th Link Command 
            th Link Output
    tbody
        tr(v-for="(link, idx) in operationStore.selectedOperation.chain" :key="link.id")
            td {{ getReadableTime(link.decide) }}
            td
                .is-flex.is-align-items-center(style="border-bottom-width: 0px !important")
                    .link-status.mr-2(:style="{ color: LINK_COLORS[link.status]}") 
                    span(:style="{ color: LINK_COLORS[link.status]}") {{ LINK_STATUSES[link.status] }}
            td {{ link.ability.name }}
            td {{ link.paw }}
            td {{ link.host }}
            td {{ link.pid ? link.pid : "N/A" }}
            td
                button.button(v-tooltip="b64DecodeUnicode(link.command)" @click="handleViewCommand(link)") View Command
            td
                button.button(v-if="link.output === 'True'" @click="handleViewOutput(link)") View Output
                span(v-else) No output
        ManualCommand(v-if="modals.operations.showAddManualCommand")
                
//- Modals
CreateModal
DeleteModal
DetailsModal
DownloadModal
CommandModal
OutputModal
AddPotentialLinkModal
</template>

<style>
.control-panel {
    position: sticky;
    top: 70px;
    z-index: 10;
    border-radius: 8px;
    background-color: #383838;
    border: 1px solid #121212;
}

.link-status {
    background-color: #242424;
    border: 0.2em solid;
    border-radius: 50%;
    height: 1em;
    width: 1em;
    z-index: 1;
}

a.icon{
    text-decoration: none !important;  
}

.table td {
    vertical-align: middle !important;
}
</style>