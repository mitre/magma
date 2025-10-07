<script setup>
import { inject, onMounted, onBeforeUnmount, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAgentStore } from "@/stores/agentStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import DeployModal from "@/components/agents/DeployModal.vue";
import ConfigModal from "@/components/agents/ConfigModal.vue";
import DetailsModal from "@/components/agents/DetailsModal.vue";
import { getAgentStatus } from "@/utils/agentUtil.js";

const $api = inject("$api");

const agentStore = useAgentStore();
const { agents, selectedAgent } = storeToRefs(agentStore);
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const agentRefreshInterval = ref(null);

onMounted(async () => {
  await Promise.all([agentStore.getAgents($api), agentStore.getAgentConfig($api)]);
  agentRefreshInterval.value = setInterval(() => {
    agentStore.getAgents($api).catch(() => {});
  }, 3000);
});
onBeforeUnmount(() => {
  if (agentRefreshInterval.value) clearInterval(agentRefreshInterval.value);
});

/** compute per-row status using server time + agentConfig */
const rows = computed(() => {
  const now = agentStore.serverNowMs ?? Date.now();
  const cfg = agentStore.agentConfig;
  return (agents.value || [])
    .filter(Boolean)
    .map(a => ({ ...a, _status: getAgentStatus(a, now, cfg) }));
});

const isAlive = r => r && (r._status === 'alive' || r._status === 'pending kill');
const isDeadLike = r => r && (r._status === 'dead' || r._status === 'killed');
const isCountableForTrust = r => r && r._status !== 'killed'; // exclude killed from trust buckets

const aliveCount     = computed(() => rows.value.filter(isAlive).length);
const deadCount      = computed(() => rows.value.filter(isDeadLike).length);
const trustedCount   = computed(() => rows.value.filter(r => isCountableForTrust(r) && r.trusted).length);
const untrustedCount = computed(() => rows.value.filter(r => isCountableForTrust(r) && !r.trusted).length);


// row handlers
function onRowClick(r) {
  selectedAgent.value = r;
  modals.value.agents.showDetails = true;
}
function onDeleteClick(r) {
  const idx = agentStore.agents.findIndex(a => a.paw === r.paw);
  if (idx !== -1) agentStore.deleteAgent($api, r.paw, idx).catch(console.error);
}

// bulk actions
function removeDeadAgents() {
  rows.value.filter(Boolean).filter(r => r._status === "dead").forEach(r => {
    const idx = agentStore.agents.findIndex(a => a.paw === r.paw);
    if (idx !== -1) agentStore.deleteAgent($api, r.paw, idx);
  });
}
function removeAllAgents() {
  [...agentStore.agents].forEach(a => {
    const idx = agentStore.agents.findIndex(x => x.paw === a.paw);
    if (idx !== -1) agentStore.deleteAgent($api, a.paw, idx);
  });
}
function killAllAgents() {
  rows.value.filter(Boolean).forEach(r => agentStore.killAgent($api, r.paw));
}
function statusClass(s) {
  return {
    'has-text-success': s === 'alive',
    'has-text-info':    s === 'pending kill',
    'has-text-warning': s === 'dead',
  };
}

</script>

<template lang="pug">
//- Header
.content
  h2 Agents
  p You must deploy at least 1 agent in order to run an operation. Groups are collections of agents so hosts can be compromised simultaneously.
hr

//- Button row
.columns.mb-4
  .column.is-4.is-flex.buttons.mb-0
    button.button.is-primary.level-item(@click="modals.agents.showDeploy = true")
      span.icon
        font-awesome-icon(icon="fas fa-plus")
      span Deploy an agent
    button.button.is-primary.level-item(@click="modals.agents.showConfig = true")
      span.icon
        font-awesome-icon(icon="fas fa-cog")
      span Configuration
  .column.is-4.is-flex.is-justify-content-center
    span.tag.is-medium.m-0
      span.mr-4.has-text-success
        span.has-text-weight-bold.mr-3 {{ aliveCount }} alive
        span.has-text-weight-bold {{ trustedCount }} trusted
      strong.mr-4 {{ rows.filter(r => r._status !== 'killed').length }} agent{{ rows.filter(r => r._status !== 'killed').length > 1 ? 's' : '' }}
      span.mr-4.has-text-warning
        span.has-text-weight-bold.mr-3 {{ deadCount }} dead
        span.has-text-weight-bold {{ untrustedCount }} untrusted
  .column.is-4.is-flex.is-justify-content-end
    .dropdown.is-right.is-hoverable
      .dropdown-trigger
        button.button.is-primary(aria-haspopup="true" aria-controls="bulk-actions")
          span Bulk Actions
          span.icon
            font-awesome-icon(icon="fas fa-angle-down" aria-hidden="true")
      .dropdown-menu(role="menu")
        .dropdown-content
          a.dropdown-item(@click="removeDeadAgents()") Remove dead agents
          a.dropdown-item(@click="removeAllAgents()") Remove all agents
          a.dropdown-item(@click="killAllAgents()") Kill all agents

//- Agents table
table.table.is-striped.is-hoverable.is-fullwidth(v-if="rows.length")
  thead
    tr
      th id (paw)
      th host
      th group
      th platform
      th contact
      th pid
      th privilege
      th status
      th last seen
      th
  tbody
    tr(v-for="r in rows" :key="r.paw" @click="onRowClick(r)")
      td {{ r.paw }}
      td {{ r.host }}
      td {{ r.group }}
      td {{ r.platform }}
      td {{ r.contact }}
      td {{ r.pid }}
      td {{ r.privilege }}
      td
        span(:class="statusClass(r && r._status)") {{ r && r._status }}
        span(v-if="r && r._status !== 'killed'") , 
        span(v-if="r && r._status !== 'killed'"
            :class="{ 'has-text-success': r && r.trusted, 'has-text-warning': !(r && r.trusted) }"
        ) {{ r && r.trusted ? 'trusted' : 'untrusted' }}
      td {{ new Date(r.last_seen).toLocaleString() }}
      td.has-text-centered
        button.delete.is-white(@click.stop="onDeleteClick(r)")

.has-text-centered.content(v-else)
  p No deployed agents

//- Modals
DeployModal
ConfigModal
DetailsModal
</template>

<style scoped>
tr { cursor: pointer; }
</style>
