<script setup>
import {
  inject,
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
  reactive,
} from "vue";
import { storeToRefs } from "pinia";

//Graph imports
import * as vNG from "v-network-graph";
import configData from "@/utils/graphConfig";
import { ForceLayout } from "v-network-graph/lib/force-layout";
import graphDataUrl from "@/public/operation_graph.json";

import CreateModal from "@/components/operations/CreateModal.vue";
import DeleteModal from "@/components/operations/DeleteModal.vue";
import DetailsModal from "@/components/operations/DetailsModal.vue";
import DownloadModal from "@/components/operations/DownloadModal.vue";
import AgentDetailsModal from "@/components/operations/AgentDetailsModal.vue";
import CommandPopup from "@/components/operations/CommandPopup.vue";
import OutputPopup from "@/components/operations/OutputPopup.vue";
import AddPotentialLinkModal from "@/components/operations/AddPotentialLinkModal.vue";
import ManualCommand from "@/components/operations/ManualCommand.vue";
import { useOperationStore } from "@/stores/operationStore";
import { useAgentStore } from "@/stores/agentStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useCoreStore } from "@/stores/coreStore";
import {
  getHumanFriendlyTimeISO8601,
  b64DecodeUnicode,
  getReadableTime,
} from "@/utils/utils";
import { getLinkStatus } from "@/utils/operationUtil.js";

const $api = inject("$api");

const coreDisplayStore = useCoreDisplayStore();
const operationStore = useOperationStore();
const agentStore = useAgentStore();
const coreStore = useCoreStore();
const { modals } = storeToRefs(coreDisplayStore);

const tableFilter = reactive({
  sortBy: "",
  sortOrder: "",
  filters: {
    decide: [],
    status: [],
    abilityName: [],
    pid: [],
    host: [],
  },
});
let updateInterval = ref();
let showPotentialLinkModal = ref(false);
let isSidebarOpen = ref(false);
let isGraphOpen = ref(true);

//Graph stuff
const graph = ref();
const tooltip = ref();
const selectedNodeId = ref();

const nodes = reactive({
  1: {
    name: "1",
    platform: "windows",
    username: "admin",
  },
  2: {
    name: "2",
    platform: "windows",
    username: "admin",
  },
});
const layouts = ref({
  nodes: {},
});

const edges = reactive({
  1: {
    source: "1",
    target: "2",
  },
});
const paths = reactive({
  path1: { edges: [] },
});

const targetNodeId = ref("");
const tooltipOpacity = ref(0); // 0 or 1
const tooltipPos = ref({ left: "0px", top: "0px" });

const targetNodePos = computed(() => {
  const nodePos = layouts.value.nodes[targetNodeId.value];
  return nodePos || { x: 0, y: 0 };
});

const filteredChain = computed(() => {
  let result = [...operationStore.currentOperation.chain];
  // Filter the data
  if (tableFilter.filters) {
    for (let property in tableFilter.filters) {
      if (tableFilter.filters[property].length === 0) {
        continue;
      }
      const filterValues = tableFilter.filters[property];
      if (filterValues && filterValues.length > 0) {
        result = result.filter((row) => filterValues.includes(row[property]));
      }
    }
    for (const node in nodes) {
      delete nodes[node];
    }
    console.log(newNodes);
    Object.assign(nodes, newNodes);
    for (const edge in edges) {
      delete edges[edge];
    }
    console.log(newEdges);
    Object.assign(edges, newEdges);
    Object.assign(paths, newPaths);
  }

  // Sort the data
  if (tableFilter.sortBy) {
    const sortOrder = tableFilter.sortOrder === "ASC" ? 1 : -1;
    if (tableFilter.sortBy == "abilityName") {
      result.sort((a, b) => {
        if (a.ability.name < b.ability.name) return -1 * sortOrder;
        if (a.ability.name > b.ability.name) return 1 * sortOrder;
        return 0;
      });
      return result;
    }
    result.sort((a, b) => {
      if (a[tableFilter.sortBy] < b[tableFilter.sortBy]) return -1 * sortOrder;
      if (a[tableFilter.sortBy] > b[tableFilter.sortBy]) return 1 * sortOrder;
      return 0;
    });
  }
  return result;
});

const handleTableSort = (property) => {
  if (tableFilter.sortBy === property) {
    if (tableFilter.sortOrder == "ASC") {
      tableFilter.sortOrder = "DESC";
    } else {
      tableFilter.sortOrder = "";
      tableFilter.sortBy = "";
    }
  } else {
    tableFilter.sortBy = property;
    tableFilter.sortOrder = "ASC";
  }
};

const getSortIconColor = (property, direction) => {
  if (tableFilter.sortBy === property) {
    if (tableFilter.sortOrder == "ASC" && direction === "up") {
      return "#fff";
    } else if (tableFilter.sortOrder == "DESC" && direction === "down") {
      return "#fff";
    }
  }
  return "grey";
};

const buildGraph = async () => {
  if (
    Object.keys(operationStore.operations).length > 0 &&
    operationStore.currentOperation
  ) {
    const newNodes = {};
    const newEdges = {};
    const newPaths = {};
    // Get graph data
    // TODO: Change to actual api endpoint
    try {
      const graphData = graphDataUrl;
      for (const hostKey in graphData.hosts) {
        const host = graphData.hosts[hostKey];
        newNodes[host.host] = {
          name: host.host,
          displayName: host.display_name,
          platform: host.platform,
          reachable: host.reachable_hosts,
          ips: host.host_ip_addrs,
          agents: [],
        };
        host.reachable_hosts.forEach((reachableHost) => {
          newEdges[`${host.host}-${reachableHost}`] = {
            source: host.host,
            target: reachableHost,
          };
          newPaths[`${host.host}-${reachableHost}`] = {
            edges: [`${host.host}-${reachableHost}`],
          };
        });
      }
      graphData.agents.forEach((agent) => {
        newNodes[agent.host].agents.push(agent);
      });
    } catch (error) {
      console.error(error);
      return;
    }
    for (const node in nodes) {
      delete nodes[node];
    }
    // console.log(newNodes);
    Object.assign(nodes, newNodes);
    for (const edge in edges) {
      delete edges[edge];
    }
    // console.log(newEdges);
    Object.assign(edges, newEdges);
    Object.assign(paths, newPaths);
  }
};

async function downloadGraphAsSvg() {
  if (!graph.value) return;
  const text = await graph.value.exportAsSvgText();
  const url = URL.createObjectURL(new Blob([text], { type: "octet/stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "network-graph.svg"; // filename to download
  a.click();
  window.URL.revokeObjectURL(url);
}

watch(
  () => operationStore.currentOperation,
  () => {
    buildGraph();
  }
);

// Update `tooltipPos`
watch(
  () => [targetNodePos.value, tooltipOpacity.value],
  () => {
    if (!graph.value || !tooltip.value) return;

    // translate coordinates: SVG -> DOM
    const domPoint = graph.value.translateFromSvgToDomCoordinates(
      targetNodePos.value
    );
    // calculates top-left position of the tooltip.
    tooltipPos.value = {
      left: domPoint.x - tooltip.value.offsetWidth / 2 + "px",
      top: domPoint.y - 16 - tooltip.value.offsetHeight - 10 + "px",
    };
  },
  { deep: true }
);

const eventHandlers = {
  "node:pointerover": ({ node }) => {
    targetNodeId.value = node;
    tooltipOpacity.value = 1; // show
  },
  "node:pointerout": (_) => {
    tooltipOpacity.value = 0; // hide
  },
  "node:click": ({ node }) => {
    selectedNodeId.value = node;
    isSidebarOpen.value = true;
  },
};

const graphConfig = reactive(vNG.defineConfigs(configData));

// End graph stuff


onMounted(async () => {
  await operationStore.getOperations($api);
  await coreStore.getObfuscators($api);
  await agentStore.getAgents($api);
  agentStore.updateAgentGroups();
  selectOperation();
});

onBeforeUnmount(() => {
  if (updateInterval) clearInterval(updateInterval);
});

function selectOperation() {
  //TODO: Stop updating if operation is finished
  if (updateInterval) clearInterval(updateInterval);
  if (operationStore.selectedOperationID === "") return;
  updateInterval = setInterval(async () => {
    if (operationStore.selectedOperationID !== "") {
      await operationStore.getOperations($api);
    } else {
      clearInterval(updateInterval);
    }
  }, "3000");
}

async function updateAuto(event) {
  // operationStore.operations[operationStore.selectedOperationID].autonomous = event.target.checked ? 1 : 0;
  await operationStore.updateOperation(
    $api,
    "autonomous",
    event.target.checked ? 1 : 0
  );
}

function isRerun() {
  return (
    operationStore.operations[operationStore.selectedOperationID].state ===
      "cleanup" ||
    operationStore.operations[operationStore.selectedOperationID].state ===
      "finished"
  );
}

function displayManualCommand() {
  modals.value.operations.showAddManualCommand = true;
  setTimeout(() => {
    document.getElementById("manual-input-command").scrollIntoView({
      behavior: "smooth",
    });
  }, 2);
}

async function addPotentialLinks(links) {
  try {
    await operationStore.addPotentialLinks($api, links);
    showPotentialLinkModal.value = false;
  } catch (error) {
    console.error("Error adding potential links", error);
  }
}
</script>

<template lang="pug">
.columns.mb-0
    .column.is-4.m-0.content
        h2.m-0 Operations
    .column.is-4.m-0
        .is-flex.is-justify-content-center
            .control.mr-2
                .select
                    select.has-text-centered(v-model="operationStore.selectedOperationID" @change="selectOperation()")
                        option(disabled selected value="") Select an operation 
                        option(v-for="operation in operationStore.operations" :key="operation.id" :value="operation.id") {{ `${operation.name} - ${operation.chain.length} decisions | ${getHumanFriendlyTimeISO8601(operation.start)}` }}
            button.button.is-primary.mr-2(@click="modals.operations.showCreate = true" type="button") 
                span.icon
                    font-awesome-icon(icon="fas fa-plus") 
                span New Operation
    .column.is-4.m-0
        .buttons.is-justify-content-right(v-if="operationStore.operations[operationStore.selectedOperationID]")
            button.button.mr-2(@click="modals.operations.showDownload = true" type="button")
                span.icon
                    font-awesome-icon(icon="fas fa-save")
                span Download Report
            button.button.is-danger.is-outlined(@click="modals.operations.showDelete = true" type="button")
                span.icon
                    font-awesome-icon(icon="fas fa-trash")
                span Delete Operation
hr.mt-2

.graph-wrapper(v-if="operationStore.selectedOperationID")
  .graph-header.is-fullwidth.is-flex.is-flex-direction-row.is-align-items-center.is-justify-content-space-between(@click="isGraphOpen = !isGraphOpen")
    .left-graph-header.is-flex.is-flex-direction-row.is-align-items-center.is-3
      h3 Graph (WORK IN PROGRESS)
      button.button.ml-4(type="button" @click="downloadGraphAsSvg")
        span Download Graph SVG
    span.icon(v-if="!isGraphOpen")
      font-awesome-icon(icon="fas fa-plus")
    span.icon(v-if="isGraphOpen")
      font-awesome-icon(icon="fas fa-minus")
  .graph-container(:style="{height: isGraphOpen ? '30rem' : '0px'}")
    .tooltip-wrapper()
      v-network-graph.graph(ref="graph" :nodes="nodes" :edges="edges" :paths="paths" :event-handlers="eventHandlers" :configs="graphConfig" :layouts="layouts")
      .tooltip(ref="tooltip" :style="{...tooltipPos, opacity: tooltipOpacity}")
        span(v-if="targetNodeId") {{ nodes[targetNodeId].displayName }}
        span(v-if="targetNodeId") Platform: {{ nodes[targetNodeId].platform }}
        div
          span(v-if="targetNodeId") {{nodes[targetNodeId].agents.length}} agent
          |
          span(v-if="targetNodeId && nodes[targetNodeId].agents.length != 1") s
    .sidebar(:style="{width: isSidebarOpen && isGraphOpen ? '500px' : '65px'}")
      button.button(v-if="!isSidebarOpen && isGraphOpen" type="button" @click="isSidebarOpen = true" :disabled="!selectedNodeId")
          span.icon
            font-awesome-icon(icon="fas fa-arrow-left") 
      .sidebar-header(v-if="isSidebarOpen && isGraphOpen")
        button.button(type="button" @click="isSidebarOpen = false") 
          span.icon
            font-awesome-icon(icon="fas fa-arrow-right") 
        h3.node-text {{nodes[selectedNodeId].name}}
      table.table.sidebar-table(v-if="isSidebarOpen && isGraphOpen" :style="{opacity: !isSidebarOpen ? 0 : 1}")
        tbody(v-if="selectedNodeId")
          tr
            th Host Name
            td {{nodes[selectedNodeId].displayName}}
          tr
            th Platform
            td {{ nodes[selectedNodeId].platform }}
          tr
            th IP Addresses
            td {{nodes[selectedNodeId].ips.join(", ")}}
          tr
            th Agents ({{nodes[selectedNodeId].agents.length}})
            td 
              ul
                li(v-for="agent in nodes[selectedNodeId].agents" :key="agent.id")
                  button.button.is-small(type="button" @click="modals.operations.showAgentDetails = true; agentStore.selectedAgent = agent") {{agent.paw}}
//- Control Panel
.control-panel.p-0.mb-4(v-if="operationStore.selectedOperationID")
    .columns.m-0.p-1
        .column.is-4.pt-0.pb-0.is-flex
            .buttons
                button.button(v-if="operationStore.isOperationRunning()" @click="displayManualCommand()")
                    span.icon
                        font-awesome-icon.fa(icon="fas fa-plus")
                    span Manual Command
                button.button(v-if="operationStore.isOperationRunning()" @click="showPotentialLinkModal = true")
                    span.icon
                        font-awesome-icon.fa(icon="fas fa-plus")
                    span Potential Link
                button.button(@click="modals.operations.showDetails = true" type="button") Operation Details
        .column.is-4.pt-0.pb-0
            span.has-text-success.is-flex.is-justify-content-center {{ operationStore.operations[operationStore.selectedOperationID].state }}
            .is-flex.is-justify-content-center.is-align-items-center.pb-2
                a.icon.is-medium.ml-3.mr-3(v-if="!isRerun()" @click="operationStore.updateOperation($api, 'state', 'cleanup')" v-tooltip="'Stop'")
                    font-awesome-icon.fa-2x(icon="fas fa-stop")
                a.icon.is-medium.ml-3.mr-3(v-if="!isRerun() && operationStore.operations[operationStore.selectedOperationID].state === 'paused' || operationStore.operations[operationStore.selectedOperationID].state === 'run_one_link'" @click="operationStore.updateOperation($api, 'state', 'running')" v-tooltip="'Play'")
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
            .control(v-if="operationStore.isOperationRunning()")
                .select.ml-1.mr-4
                    select(v-model="operationStore.operations[operationStore.selectedOperationID].obfuscator" @change="operationStore.updateOperation($api, 'obfuscator', operationStore.operations[operationStore.selectedOperationID].obfuscator)")
                        option(v-for="(obf, idx) in coreStore.obfuscators" :key="idx" :value="obf.name") {{ `${obf.name}` }}
            .control(v-else)
                .select.ml-1.mr-4
                    select(v-model="operationStore.operations[operationStore.selectedOperationID].obfuscator" :disabled="true")
                        option(v-for="(obf, idx) in coreStore.obfuscators" :key="idx" :value="obf.name") {{ `${obf.name}` }}
            .control(v-if="operationStore.isOperationRunning()")
                input.switch(
                    :checked="operationStore.operations[operationStore.selectedOperationID].autonomous === 1" 
                    id="switchManual" 
                    type="checkbox" 
                    @change="updateAuto($event)"
                )
                label.label(for="switchManual") {{ operationStore.operations[operationStore.selectedOperationID].autonomous ? 'Autonomous' : 'Manual' }} 
            .control(v-else)
                input.switch(
                    :checked="operationStore.operations[operationStore.selectedOperationID].autonomous === 1" 
                    :disabled="true"
                    id="switchManual" 
                    type="checkbox" 
                )
                label.label(for="switchManual") {{ operationStore.operations[operationStore.selectedOperationID].autonomous ? 'Autonomous' : 'Manual' }}
        
//- Table
table.table.is-fullwidth.is-narrow.is-striped.mb-8#link-table(v-if="operationStore.selectedOperationID")
    thead
        tr
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('decide')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span Time Ran 
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('decide', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('decide', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('status')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span Status
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('status', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('status', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('abilityName')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span Ability Name
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('abilityName', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('abilityName', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('agent')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span Agent
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('agent', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('agent', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('host')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span Host
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('host', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('host', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-row.is-align-items-center.gap-5(@click="handleTableSort('pid')" :style="{ cursor: 'pointer', width: 'fit-content' }")
              span pid
              div.is-flex.is-flex-direction-column.is-justify-content-center
                span.icon.m-n5(:style="{ color: getSortIconColor('pid', 'up') }")
                  font-awesome-icon(icon="fas fa-angle-up")
                span.icon(:style="{ color: getSortIconColor('pid', 'down') }")
                  font-awesome-icon(icon="fas fa-angle-down")
          th
            div.is-flex.is-flex-direction-column.is-justify-content-center
              span.mt-2 Link Command 
          th
            div.is-flex.is-flex-direction-column.is-justify-content-center
              span.mt-2 Link Output 
    tbody
        tr(v-for="(link, idx) in filteredChain" :key="link.id")
            td {{ getReadableTime(link.decide) }}
            td
                .is-flex.is-align-items-center(style="border-bottom-width: 0px !important")
                    .link-status.mr-2(:style="{ color: getLinkStatus(link).color}") 
                    span(:style="{ color: getLinkStatus(link).color}") {{ getLinkStatus(link).text }}
            td {{ link.ability.name }}
            td {{ link.paw }}
            td {{ link.host }}
            td {{ link.pid ? link.pid : "N/A" }}
            td
                //- button.button(v-tooltip="b64DecodeUnicode(link.command)" @click="handleViewCommand(link)") View Command
                .dropdown.is-hoverable
                    .dropdown-trigger
                        button.button(aria-haspopup="true" aria-controls="dropdown-menu") View Command
                    .dropdown-menu.command-popup(role="menu")
                        .dropdown-content
                            CommandPopup(:link="link")
            td
                //- button.button(v-if="link.output === 'True'" @click="handleViewOutput(link)") View Output
                .dropdown.is-hoverable(v-if="link.output === 'True'")
                    .dropdown-trigger
                        button.button(aria-haspopup="true" aria-controls="dropdown-menu") View Output
                    .dropdown-menu.command-popup(role="menu")
                        .dropdown-content
                            OutputPopup(:link="link")
                span(v-else) No output
        ManualCommand(v-if="modals.operations.showAddManualCommand")
                
//- Modals
CreateModal(:selectInterval="selectOperation")
DeleteModal
DetailsModal
DownloadModal
AgentDetailsModal
AddPotentialLinkModal(
    :active="showPotentialLinkModal" 
    :operation="operationStore.operations[operationStore.selectedOperationID]"
    @select="addPotentialLinks" 
    @close="showPotentialLinkModal = false")
</template>

<style>
.node-text {
  white-space: nowrap;
  overflow: hidden;
}

.graph-header {
  cursor: pointer;
  padding-right: 1rem;
  padding-left: 1rem;
  background-color: #383838;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  border: 1px solid #8b00ff;
  border-bottom: 0px;
}

.graph-header:hover {
  background-color: #4a4a4a;
}

.graph-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
}

.graph-container {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 1rem;
  border: 1px solid #8b00ff;
  border-top: 0px;
  /* min-height: 30rem; */
  transition: height 0.5s;
}

.graph {
  background-color: #000;
  border-right: 1px solid #8b00ff;
}

.tooltip-wrapper {
  width: 100%;
  position: relative;
}

.tooltip {
  top: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  min-width: 8rem;
  height: 4rem;
  font-size: 0.7rem;
  padding: 5px;
  background-color: #000;
  border: 1px solid #fff;
  box-shadow: 0 0 5px #0b0b0b;
  transition: opacity 0.2s linear;
  pointer-events: none;
  display: flex;
  flex-direction: column;
}

.sidebar {
  padding: 1rem;
  transition: width 0.5s;
}

.sidebar-table {
  margin-top: 0.5rem;
  font-size: 0.89rem;
  border-radius: 8px;
  box-shadow: 0 0 5px #121212;
  width: 350px;
}

.sidebar-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.graph-header {
  cursor: pointer;
  padding-right: 1rem;
  padding-left: 1rem;
  background-color: #383838;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  border: 1px solid #8b00ff;
  border-bottom: 0px;
}

.graph-header:hover {
  background-color: #4a4a4a;
}

.graph-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
}

.graph-container {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 1rem;
  border: 1px solid #8b00ff;
  border-top: 0px;
  /* min-height: 30rem; */
  transition: height 0.5s;
}

.graph {
  background-color: #000;
  border-right: 1px solid #8b00ff;
}

.tooltip-wrapper {
  width: 100%;
  position: relative;
}

.tooltip {
  top: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  min-width: 8rem;
  height: 4rem;
  font-size: 0.7rem;
  padding: 5px;
  background-color: #000;
  border: 1px solid #fff;
  box-shadow: 0 0 5px #0b0b0b;
  transition: opacity 0.2s linear;
  pointer-events: none;
  display: flex;
  flex-direction: column;
}

.sidebar {
  padding: 1rem;
  transition: width 0.5s;
}

.sidebar-table {
  margin-top: 0.5rem;
  font-size: 0.89rem;
  border-radius: 8px;
  box-shadow: 0 0 5px #121212;
  width: 350px;
}

.sidebar-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.control-panel {
  position: sticky;
  top: 70px;
  z-index: 10;
  border-radius: 8px;
  background-color: #383838;
  border: 1px solid #121212;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 1);
}

#link-table {
  border-radius: 10px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 1);
  padding: 5rem;
}

.gap-5 {
  gap: 0.4rem;
}

.m-n5 {
  margin-bottom: -0.5rem;
}

.link-status {
  background-color: #242424;
  border: 0.2em solid;
  border-radius: 50%;
  height: 1em;
  width: 1em;
  z-index: 1;
}

.dropdown-menu.command-popup {
  top: 0;
  left: initial;
  right: 90%;
  max-height: 300px;
  border-radius: 8px;
  padding: 0;
}
.dropdown-menu.command-popup > .dropdown-content {
  padding: 10px;
  margin-right: 10px;
  border: 1px solid hsl(0deg, 0%, 71%);
  overflow-y: auto;
  max-width: 85vw;
  max-height: 300px;
}

a.icon {
  text-decoration: none !important;
}

.table td {
  vertical-align: middle !important;
}
</style>
