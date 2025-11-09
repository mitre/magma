<script setup>
/**
 * Start Operation Modal
 * ---------------------
 * Modal for creating a new operation. Handles loading of backing data (agents, adversaries,
 * sources, planners, obfuscators), form state, validation, submission, and success/error toasts.
 */

import { ref, inject, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { toast } from "bulma-toast";

import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useOperationStore } from "@/stores/operationStore";
import { useAdversaryStore } from "@/stores/adversaryStore";
import { useCoreStore } from "@/stores/coreStore";
import { useAgentStore } from "@/stores/agentStore";
import { useSourceStore } from "@/stores/sourceStore";

const $api = inject("$api");

// ──────────────────────────────────────────────────────────────────────────────
// Stores
// ──────────────────────────────────────────────────────────────────────────────
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const operationStore = useOperationStore();
const adversaryStore = useAdversaryStore();
const coreStore = useCoreStore();
const agentStore = useAgentStore();

const sourceStore = useSourceStore();
const { sources } = storeToRefs(sourceStore);

// ──────────────────────────────────────────────────────────────────────────────
/** Parent-provided callback to refresh intervals on success (optional). */
const props = defineProps({
  selectInterval: {
    type: Function,
    required: false
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Local Form State
// ──────────────────────────────────────────────────────────────────────────────
const operationName = ref("");
const selectedAdversary = ref(""); // holds entire adversary object or empty string
const selectedSource = ref("");     // holds entire source object or empty string
const selectedGroup = ref("");

const selectedObfuscator = ref({ name: "plain-text" });
const selectedPlanner = ref(undefined);

const isAuto = ref(true);
const isDefParser = ref(true);
const isAutoClose = ref(false);
const isPause = ref(false);

const minJitter = ref(2);
const maxJitter = ref(8);

const visibility = ref(51);

const validation = ref({ name: "" });

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Load initial data required by the form.
 * - Agents (and groups)
 * - Adversaries
 * - Sources
 * - Obfuscators
 * - Planners
 */
onMounted(async () => {
  await agentStore.getAgents($api);
  agentStore.updateAgentGroups();

  await adversaryStore.getAdversaries($api);
  await getSources();
  await coreStore.getObfuscators($api);
  await getPlanners();
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers & Actions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch sources and set default selection.
 * Prefers "basic" if present; otherwise leaves unselected.
 */
async function getSources() {
  try {
    await sourceStore.getSources($api);
    const basic = sources.value?.find((s) => s?.name === "basic");
    if (basic) selectedSource.value = basic;
  } catch (error) {
    console.error("Error getting sources", error);
  }
}

/**
 * Fetch planners and set default planner to the first one, if any.
 */
async function getPlanners() {
  try {
    await coreStore.getPlanners($api);
    selectedPlanner.value = coreStore.planners?.[0];
  } catch (error) {
    console.error("Error getting planners", error);
  }
}

/**
 * Validate jitter inputs and return normalized "min/max" pair (numbers).
 * Ensures numbers, swaps if out-of-order, clamps to sensible bounds (>=0).
 */
function normalizeJitter() {
  let min = Number(minJitter.value);
  let max = Number(maxJitter.value);

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;
  if (min < 0) min = 0;
  if (max < 0) max = 0;
  if (min > max) [min, max] = [max, min];

  return { min, max };
}

/**
 * Build the payload for operation creation from current form state.
 */
function buildOperationPayload() {
  const { min, max } = normalizeJitter();

  // If no adversary selected, default to 'ad-hoc' (manual)
  const adversaryId =
    selectedAdversary.value && selectedAdversary.value.adversary_id
      ? selectedAdversary.value.adversary_id
      : "ad-hoc";

  return {
    name: operationName.value,
    autonomous: Number(isAuto.value),
    use_learning_parsers: isDefParser.value,
    auto_close: isAutoClose.value,
    jitter: `${min}/${max}`,
    // pause flag should produce 'paused'
    state: isPause.value ? "paused" : "running",
    visibility: visibility.value,
    obfuscator: selectedObfuscator.value?.name,
    source: selectedSource.value?.id ? { id: selectedSource.value.id } : undefined,
    planner: selectedPlanner.value?.id ? { id: selectedPlanner.value.id } : undefined,
    adversary: { adversary_id: adversaryId },
    group: selectedGroup.value,
  };
}

/**
 * Validate minimal required fields; sets inline messages.
 * @returns true if valid, false otherwise
 */
function validateForm() {
  if (!operationName.value || !operationName.value.trim()) {
    validation.value.name = "Name cannot be empty";
    return false;
  }
  validation.value.name = "";
  return true;
}

/**
 * Create an operation from the current form state, show toast on success/failure,
 * optionally call parent refresh, and close the modal.
 */
async function createOperation() {
  if (!validateForm()) return;

  const payload = buildOperationPayload();

  try {
    await operationStore.createOperation($api, payload);
    if (typeof props.selectInterval === "function") props.selectInterval();
    toast({
      message: `Operation "${operationName.value}" created`,
      type: "is-success",
      dismissible: true,
      pauseOnHover: true,
      duration: 2000,
      position: "bottom-right",
    });
  } catch (error) {
    console.error("Error creating operation", error);
    toast({
      message: "Error creating operation",
      type: "is-danger",
      dismissible: true,
      pauseOnHover: true,
      duration: 2000,
      position: "bottom-right",
    });
  }

  modals.value.operations.showCreate = false;
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showCreate }")
  .modal-background(@click="modals.operations.showCreate = false")
  .modal-card
    header.modal-card-head 
      p.modal-card-title Start New Operation
    .modal-card-body
      .field.is-horizontal
        .field-label.is-normal 
          label.label Operation Name
        .field-body 
          input.input(placeholder="Operation Name" v-model="operationName")
          label.label.ml-3.mt-1.has-text-danger {{ `${validation.name}` }}

      .field.is-horizontal
        .field-label.is-normal 
          label.label Adversary
        .field-body
          .control
            .select
              select(v-model="selectedAdversary")
                option(selected value="") No Adversary (manual)
                option(v-for="adversary in adversaryStore.adversaries" :key="adversary.id" :value="adversary") {{ `${adversary.name}` }}

      .field.is-horizontal
        .field-label.is-normal 
          label.label Fact Source
        .field-body
          .control
            .select
              select(v-model="selectedSource")
                option(disabled selected value="") Choose a Fact Source 
                option(v-for="source in sources" :key="source.id" :value="source") {{ `${source.name}` }}

      .field.is-horizontal 
        .field-label.is-normal 
          label.label Group
        .field-body
          button.button(:class="{ 'is-primary': selectedGroup === '' }" @click="selectedGroup = ''") All groups
          button.button.mx-2(v-for="group in agentStore.agentGroups" :key="group" :class="{ 'is-primary': selectedGroup === group }", @click="selectedGroup = group") {{`${group}`}}

      .field.is-horizontal
        .field-label.is-normal 
          label.label Planner 
        .field-body
          .control
            .select 
              select(v-model="selectedPlanner")
                option(v-for="planner in coreStore.planners" :key="planner.id" :value="planner") {{ `${planner.name}` }}

      .field.is-horizontal
        .field-label
          label.label Obfuscators 
        .field-body
          .field.is-grouped-multiline
            button.button.my-1.mr-2(v-for="obf in coreStore.obfuscators" :key="obf.id" :value="obf" :class="{ 'is-primary': selectedObfuscator.name === obf.name }" @click="selectedObfuscator = obf") {{ `${obf.name}` }}

      .field.is-horizontal
        .field-label
          label.label Autonomous
        .field-body
          .field.is-grouped
            input.is-checkradio(type="radio" id="auto" :checked="isAuto" @click="isAuto = true")
            label.label.ml-3.mt-1(for="auto") Run autonomously
            input.is-checkradio.ml-3(type="radio" id="manual" :checked="!isAuto" @click="isAuto = false")
            label.label.ml-3.mt-1(for="manual") Require manual approval

      .field.is-horizontal
        .field-label
          label.label Parser
        .field-body
          .field.is-grouped 
            input.is-checkradio(type="radio" id="defaultparser" :checked="isDefParser" @click="isDefParser = true")
            label.label.ml-3.mt-1(for="defaultparser") Use Default Parser
            input.is-checkradio.ml-3(type="radio" id="nondefaultparser" :checked="!isDefParser" @click="isDefParser = false")
            label.label.ml-3.mt-1(for="nondefaultparser") Don't use default learning parsers

      .field.is-horizontal
        .field-label 
          label.label Auto Close
        .field-body.is-grouped
          input.is-checkradio(type="radio" id="keepopen" :checked="!isAutoClose" @click="isAutoClose = false")
          label.label.ml-3.mt-1(for="keepopen") Keep open forever
          input.is-checkradio.ml-3(type="radio" id="autoclose" :checked="isAutoClose" @click="isAutoClose = true")
          label.label.ml-3.mt-1(for="autoclose") Auto close operation

      .field.is-horizontal 
        .field-label 
          label.label Run State 
        .field-body.is-grouped
          input.is-checkradio(type="radio" id="runimmediately" :checked="!isPause" @click="isPause = false")
          label.label.ml-3.mt-1(for="runimmediately") Run immediately
          input.is-checkradio.ml-3(type="radio" id="pausestart" :checked="isPause" @click="isPause = true")
          label.label.ml-3.mt-1(for="pausestart") Pause on start

      .field.is-horizontal
        .field-label 
          label.label Jitter (sec/sec)
        .field-body
          input.input.is-small(v-model="minJitter")
          span /
          input.input.is-small(v-model="maxJitter")

    footer.modal-card-foot.is-justify-content-right
      button.button(@click="modals.operations.showCreate = false") Cancel
      button.button.is-primary(@click="createOperation()") Start 
</template>

<style scoped>
.modal-card { width: 800px; }

.field-label label { font-size: 0.9rem; }
</style>
