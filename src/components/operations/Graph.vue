<script setup>
import { ref, reactive, watch, computed } from "vue";
import { storeToRefs } from "pinia";

import * as vNG from "v-network-graph";
import configData from "@/utils/graphConfig";
import { ForceLayout } from "v-network-graph/lib/force-layout";
import graphDataUrl from "@/public/operation_graph.json";

import { useOperationStore } from "@/stores/operationStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useAgentStore } from "@/stores/agentStore";

const operationStore = useOperationStore();
const coreDisplayStore = useCoreDisplayStore();
const agentStore = useAgentStore();
const { modals } = storeToRefs(coreDisplayStore);

//Graph stuff
const graph = ref();
const tooltip = ref();
const selectedNodeId = ref();
const graphConfig = reactive(vNG.defineConfigs(configData));
let isSidebarOpen = ref(false);
let isGraphOpen = ref(true);

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
          icon: `${host.platform}-icon.svg`,
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
</script>

<template lang="pug">
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
        defs
          clipPath(id="faceCircle" clipPathUnits="objectBoundingBox")
            circle(cx="0.5" cy="0.5" r="0.5")
        template(v-slot:override-node="{ nodeId, scale, config, ...slotProps }")
          circle.face-circle(:r="config.radius * scale" fill="#ffffff" v-bind="slotProps")
          image.face-picture(:x="-config.radius * scale" :y="-config.radius * scale" :width="config.radius * scale * 2" :height="config.radius * scale * 2" :xlink:href="`/src/assets/img/graph/${nodes[nodeId].icon}`" clip-path="url(#faceCircle)")
          <!-- circle.face-circle(:r="config.radius * scale" fill="none" stroke="#808080" :stroke-width="1 * scale" v-bind="slotProps") -->
          circle.face-circle(v-for="(agt, idx) in nodes[nodeId].agents" :r="config.radius + (8 + (idx * 9))" fill="none" stroke="#c85450" :stroke-width="3 * scale" v-bind="slotProps")
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
</template>

<style scoped>
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
</style>
