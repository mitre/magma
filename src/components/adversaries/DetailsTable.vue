<script setup>
/**
 * DetailsTable.vue
 * Renders and edits an adversary's abilities list with dependency visualization,
 * drag-and-drop reordering, fact-source filtering (dropdown is in the button row),
 * and export/save utilities.
 */

import { storeToRefs } from "pinia";
import { ref, reactive, watch, inject, onMounted } from "vue";
import cloneDeep from "lodash/cloneDeep";
import { v4 as uuidv4 } from "uuid";

import { useObjectiveStore } from "@/stores/objectiveStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useAdversaryStore } from "@/stores/adversaryStore";
import { useSourceStore } from "@/stores/sourceStore";
import FactBreakdownModal from "@/components/adversaries/FactBreakdownModal.vue";
import AddAbilitiesFromAdversaryModal from "@/components/adversaries/AddAbilitiesFromAdversaryModal.vue";
import AbilitySelection from "@/components/abilities/AbilitySelection.vue";
import DeleteAdversaryConfirmationModal from "./DeleteAdversaryConfirmationModal.vue";
import { buildExecutorsFromFacts } from "@/utils/executorUtils";

const $api = inject("$api");
const emit = defineEmits(["ability-click", "update:abilities"]);

const adversaryStore = useAdversaryStore();
const { selectedAdversary } = storeToRefs(adversaryStore);

const objectiveStore = useObjectiveStore();
const { objectives } = storeToRefs(objectiveStore);

const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

// Fact sources
const sourceStore = useSourceStore();
const { sources } = storeToRefs(sourceStore);
const selectedSource = ref("");

// Local view state
const abilitiesReady = ref(false);
const isEditingName = ref(false);
const validation = reactive({ name: "" });

// Ability dependency state
const undefinedAbilities = ref([]);
const abilityDependencies = ref({});
const factBreakdown = ref([]);
const needsParser = ref([]);
const isTacticBreakdownActive = ref(false);
const onHoverLocks = ref([]);
const onHoverUnlocks = ref([]);

// DnD state
const tableDragTarget = ref(null);
const tableDragEndIndex = ref(null);
const tableDragTargetIndex = ref(null);
const tableDragHoverId = ref(null);

// Modals
const showAbilitySelection = ref(false);
const showAddFromAdversary = ref(false);

// Template references this flag; define it locally
const isCreatingNewAdversary = ref(false);

// Props
const props = defineProps({
  abilities: {
    type: Array,
    required: true,
  },
});
const localAbilities = ref([]);

/**
 * Decide whether to show a warning icon on an executor because required #{trait}
 * placeholders in the command are not satisfied by provided facts.
 */
// /mnt/data/DetailsTable.vue (around L81)
const shouldShowWarningIcon = (ability, executor) => {
  if (!selectedSource.value || !selectedSource.value.facts) return null;
  const cmd = String(executor?.command || "");
  const requiredTraits = [...cmd.matchAll(/#\{([^}]+)\}/g)].map(m => m[1]);
  if (!requiredTraits.length) return null;

  // executor-provided facts
  const executorFacts = ability?.metadata?.executor_facts?.[executor.platform] || [];
  const providedTraits = new Set(
    executorFacts.filter(f => f.value?.trim()).map(f => f.trait)
  );

  // fact source traits
  const source = selectedSource.value;
  const sourceTraits = new Set(
    (source?.facts || []).map(f => f.trait)
  );

  // ❌ missing entirely → warning
  if (requiredTraits.some(
    trait => !providedTraits.has(trait) && !sourceTraits.has(trait)
  )) {
    return "warning";
  }

  // 🧩 source-backed but not yet satisfied
  if (requiredTraits.some(
    trait => !providedTraits.has(trait) && sourceTraits.has(trait)
  )) {
    return "source";
  }

  // ✅ fully satisfied
  return null;
};


/**
 * Compute ability dependencies and fact coverage across the list.
 * Populates:
 *  - abilityDependencies (per-step enable/require types and links)
 *  - factBreakdown (met/unmet/extra)
 *  - needsParser (abilities with unmet requirements)
 *  - undefinedAbilities (abilities missing definitions)
 */
function findAbilityDependencies() {
  const types = {};
  let factsCollected = [];
  let factsRequired = [];
  undefinedAbilities.value = [];

  // Collect enable/require types per ability
  localAbilities.value.forEach((ability) => {
    let requireTypes = [];
    let enableTypes = [];

    if (ability.ability_id !== undefined) {
      if (Array.isArray(ability.executors)) {
        ability.executors.forEach((executor) => {
          if (Array.isArray(executor.parsers)) {
            executor.parsers.forEach((parser) => {
              if (Array.isArray(parser.parserconfigs)) {
                enableTypes = enableTypes.concat(
                  parser.parserconfigs.map((rel) => rel.source)
                );
              }
            });
          }
        });
      }
      if (Array.isArray(ability.requirements)) {
        ability.requirements.forEach((requirement) => {
          if (Array.isArray(requirement.relationship_match)) {
            requireTypes = requireTypes.concat(
              requirement.relationship_match.map((match) => match.source)
            );
          }
        });
      }
    } else {
      undefinedAbilities.value.push(ability.ability_id);
    }

    types[ability.step_uuid] = {
      enableTypes: [...new Set(enableTypes)],
      requireTypes: [...new Set(requireTypes)],
    };
  });

  // Resolve cross-ability relationships (what enables/what requires)
  localAbilities.value.forEach((ability, index) => {
    const enablesAbilityIds = [];
    const requiresAbilityIds = [];
    const requireTypesMet = [];

    // Forward search: which later abilities require facts we enable?
    types[ability.step_uuid].enableTypes.forEach((key) => {
      for (let i = index; i < localAbilities.value.length; i++) {
        if (types[localAbilities.value[i].step_uuid].requireTypes.indexOf(key) > -1) {
          enablesAbilityIds.push(localAbilities.value[i].step_uuid);
        }
      }
    });

    // Backward search: do earlier abilities provide the facts we need?
    types[ability.step_uuid].requireTypes.forEach((requirement) => {
      let requirementMet = false;
      for (let i = index; i >= 0; i--) {
        if (types[localAbilities.value[i].step_uuid].enableTypes.indexOf(requirement) > -1) {
          requiresAbilityIds.push(localAbilities.value[i].step_uuid);
          requirementMet = true;
        }
      }
      requireTypesMet.push(requirementMet);
    });

    abilityDependencies.value[ability.step_uuid] = {
      enablesAbilityIds: [...new Set(enablesAbilityIds)],
      requiresAbilityIds: [...new Set(requiresAbilityIds)],
      enableTypes: types[ability.step_uuid].enableTypes,
      requireTypes: types[ability.step_uuid].requireTypes,
      requireTypesMet,
    };

    factsCollected = factsCollected.concat(types[ability.step_uuid].enableTypes);
    factsRequired = factsRequired.concat(types[ability.step_uuid].requireTypes);
  });

  // Build fact breakdown
  factBreakdown.value = [];
  factsCollected = [...new Set(factsCollected)];
  factsRequired = [...new Set(factsRequired)];
  factsRequired.forEach((fact) => {
    factBreakdown.value.push({
      fact,
      type: factsCollected.includes(fact) ? "met" : "unmet",
    });
  });
  factsCollected
    .filter((x) => !factsRequired.includes(x))
    .forEach((fact) => factBreakdown.value.push({ fact, type: "extra" }));

  hasMetAbilityDependencies();
}

/**
 * Check if all ability dependencies are satisfied.
 * Updates `needsParser` with names of abilities missing required facts.
 * @returns {boolean} true if all dependencies are met, false otherwise
 */
function hasMetAbilityDependencies() {
  let isMet = true;
  needsParser.value = [];

  Object.keys(abilityDependencies.value).forEach((step_uuid) => {
    if (!abilityDependencies.value[step_uuid].requireTypesMet.every((requirement) => requirement)) {
      isMet = false;
      try {
        const name = localAbilities.value.find((a) => a.step_uuid === step_uuid)?.name ?? "";
        if (name) needsParser.value.push(name);
      } catch {
        /* no-op */
      }
    }
  });

  return isMet;
}

/**
 * Return a detail about an ability’s executors: cleanup/parser/payload flags,
 * requirements presence, or a processed platforms list with warning flags.
 */
function getExecutorDetail(detail, ability) {
  const executorNameMap = new Map([
    ["psh", "powershell"],
    ["pwsh", "powershell core"],
    ["sh", "shell"],
    ["cmd", "commandline"],
  ]);

  let hasCleanup = false;
  let hasPayload = false;
  let hasParser = false;

  if (ability.executors) {
    ability.executors.forEach((executor) => {
      if ((executor.cleanup || []).length > 0) hasCleanup = true;
      if ((executor.parsers || []).length > 0) hasParser = true;
      if ((executor.payloads || []).length > 0) hasPayload = true;
      const _ = `${executor.platform} (${executorNameMap.get(executor.name) || executor.name})`;
    });
  }

  switch (detail) {
    case "cleanup":
      return hasCleanup;
    case "parser":
      return hasParser;
    case "payload":
      return hasPayload;
    case "requirements":
      return Array.isArray(ability.requirements) && ability.requirements.length > 0;

    // /mnt/data/DetailsTable.vue (replace case "platforms")
    case "platforms": {
      const executors = ability.executors || [];
      return executors
        .map((executor) => ({
          platform: executor.platform,
          name: executor.name,
          key: executor.key, // already step_uuid-scoped by the store
          hasWarning: shouldShowWarningIcon(ability, executor),
        }))
        .filter((e) => e.platform && e.name);
    }

    default:
      return false;
  }
}

/**
 * Build a tactic distribution array: [tactic, percent].
 */
function getTacticBreakdown() {
  if (!localAbilities.value) return;
  const counts = {};
  localAbilities.value.forEach((ability) => {
    counts[ability.tactic] ? (counts[ability.tactic] += 1) : (counts[ability.tactic] = 1);
  });

  const total = Array.isArray(localAbilities.value) ? localAbilities.value.length : 0;
  return Object.keys(counts)
    .sort()
    .map((tactic) => {
      const percent = total ? Math.ceil((counts[tactic] / total) * 10000) / 100 : 0;
      return [tactic, percent];
    });
}

/**
 * Deterministic color from string using djb2.
 */
function hashStringToColor(str) {
  let hash = 5381;
  if (str) {
    for (let i = 0; i < str.length; i++) hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = (hash & 0x0000ff);
  return (
    "#" +
    ("0" + r.toString(16)).slice(-2) +
    ("0" + g.toString(16)).slice(-2) +
    ("0" + b.toString(16)).slice(-2)
  );
}

/**
 * Highlight related rows based on dependency graph for the hovered ability.
 */
function setAbilityHover(step_uuid) {
  if (!abilityDependencies.value[step_uuid]) return;
  onHoverLocks.value = abilityDependencies.value[step_uuid].requiresAbilityIds;
  onHoverUnlocks.value = abilityDependencies.value[step_uuid].enablesAbilityIds;
  if (abilityDependencies.value[step_uuid].requireTypes.length) onHoverUnlocks.value.push(step_uuid);
  if (abilityDependencies.value[step_uuid].enableTypes.length) onHoverLocks.value.push(step_uuid);
}

/**
 * Begin drag operation: capture the origin row and its index.
 */
function startAbilitySwap(event) {
  const target = event?.target?.parentNode || null;
  tableDragTarget.value = target;
  tableDragTargetIndex.value = parseInt(
    target?.children?.[1]?.children?.[0]?.children?.[0]?.innerHTML ?? "0",
    10
  );
}

/**
 * Update the potential drop index while dragging.
 */
function swapAbilitiesHover(event) {
  const parent = event?.target?.parentNode || null;
  if (!parent?.children?.[1]) return;
  tableDragEndIndex.value = parseInt(
    parent.children[1].children[0].children[0].innerHTML ?? "0",
    10
  );
}

/**
 * Apply the row swap using captured indices and reset highlights.
 */
function swapAbilities() {
  const fromIndex = (tableDragTargetIndex.value ?? 1) - 1;
  const toIndex = (tableDragEndIndex.value ?? 1) - 1;
  if (fromIndex < 0 || toIndex < 0) return;

  const temp = localAbilities.value[fromIndex];
  localAbilities.value.splice(fromIndex, 1);
  localAbilities.value.splice(toIndex, 0, temp);

  tableDragHoverId.value = null;
  tableDragEndIndex.value = null;

  // Notify parent of new order
  emit("update:abilities", [...localAbilities.value]);
}

/**
 * Emit selection event to allow parent to open the editor modal.
 */
function selectAbility(ability) {
  emit("ability-click", ability);
}

/**
 * Persist the selected adversary profile via store.
 */
async function validateAndSaveAdversary() {
  console.debug(
    "[DetailsTable] localAbilities → store sync preview",
    localAbilities.value.map((a, i) => ({
      index: i,
      step_uuid: a.step_uuid,
      ability_id: a.ability_id,
      executor_facts: a.metadata?.executor_facts,
    }))
  );
  adversaryStore.selectedAdversaryAbilities = cloneDeep(localAbilities.value);
  console.debug(
    "[DetailsTable] selectedAdversaryAbilities before save",
    adversaryStore.selectedAdversaryAbilities.map((a, i) => ({
      index: i,
      step_uuid: a.step_uuid,
      ability_id: a.ability_id,
      executor_facts: a.metadata?.executor_facts,
    }))
  );
  await adversaryStore.saveSelectedAdversary($api);
}

/**
 * Export the current adversary profile as YAML (best-effort).
 */
function exportAdversary() {
  if (!selectedAdversary.value) return;

  let yaml = `id: ${selectedAdversary.value.adversary_id}\n`;
  yaml += `name: ${selectedAdversary.value.name}\n`;
  yaml += `description: ${selectedAdversary.value.description}\n`;
  yaml += `objective: ${selectedAdversary.value.objective}\n`;
  yaml += `atomic_ordering:\n`;
  localAbilities.value.forEach((ability) => (yaml += `- ${ability.ability_id}\n`));
  yaml += `abilities:\n`;
  localAbilities.value.forEach((ability) => {
    yaml += ` ${ability.ability_id}:\n`;
    yaml += `  name:  ${ability.name}\n`;
    yaml += `  tactic:  ${ability.tactic}\n`;
    yaml += `  technique_name:  "${ability.technique_name}"\n`;
    yaml += `  technique_id:  ${ability.technique_id}\n`;
    yaml += `  executors: \n`;
    ability.executors.forEach((executor) => {
      yaml += `   - ${executor.name}:\n`;
      yaml += `     platform: ${executor.platform}\n`;
      yaml += `     command: |\n       ${String(executor.command || "").replaceAll("\n", "\n       ")}\n`;
    });
  });

  const blob = new Blob([yaml], { type: "application/x-yaml" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `${selectedAdversary.value.name}.yaml`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Append a single ability to the local list and notify parent.
 */
function addAbilityToAdversary(ability) {
  // ✅ clone so instances never share state
  const inst = cloneDeep(ability);

  // ✅ always new frontend instance id
  inst.step_uuid = uuidv4();

  // ✅ instance-scoped metadata
  inst.metadata = inst.metadata || {};
  inst.metadata.executor_facts = inst.metadata.executor_facts || {};

  localAbilities.value.push(inst);
  emit("update:abilities", [...localAbilities.value]);
  showAbilitySelection.value = false;
}

/**
 * Append multiple abilities (from another adversary) and notify parent.
 */
function addAbilitiesFromAdversary(abilities) {
  abilities.forEach(a => addAbilityToAdversary(a));
  showAddFromAdversary.value = false;
}

/**
 * Remove an ability by index and notify parent.
 */
function deleteAbility(index) {
  localAbilities.value.splice(index, 1);
  emit("update:abilities", [...localAbilities.value]);
}

/**
 * Rebuild executors for all abilities using stored executor_facts.
 * Ensures platform/name/key are mapped consistently for UI/tooling.
 */
function rebuildExecutors() {
  try {
    localAbilities.value.forEach((ability) => {
      const executorFacts = ability?.metadata?.executor_facts || {};
      if (!executorFacts || !Object.keys(executorFacts).length) return;

      const rebuiltExecutors = buildExecutorsFromFacts(
        ability.executors,
        executorFacts
      );
      if (Array.isArray(rebuiltExecutors)) {
        ability.executors = rebuiltExecutors;
      }
    });
  } catch (err) {
    console.warn("[AutomationDetailsTable] Skipped executors rebuild:", err);
  }
}
/**
 * Get CSS classes for a given ability row based on drag-and-drop and dependency state.
 * @param ability 
 */
function getRowClass(ability) {
  return {
    'row-hover-above': ability.step_uuid === tableDragHoverId.value && tableDragHoverId.value != undefined && tableDragEndIndex.value < tableDragTargetIndex.value,
    'row-hover-below': ability.step_uuid === tableDragHoverId.value && tableDragHoverId.value != undefined && tableDragEndIndex.value > tableDragTargetIndex.value,
    'orange-row': needsParser.value.indexOf(ability.name) > -1,
    'row-hover': ability.step_uuid === tableDragHoverId.value && tableDragHoverId.value != undefined,
    'red-row-unclickable': undefinedAbilities.value.indexOf(ability.step_uuid) > -1
  };
}

/** Fetch sources and set a sensible default ("basic" if present) */
async function getSources() {
  try {
    await sourceStore.getSources($api);
    const basic = sources.value?.find(s => s?.name === "basic");
    if (basic) selectedSource.value = basic;
  } catch (error) {
    console.error("Error getting sources", error);
  }
}

/**
 * Load initial data required by the table and prime computed caches.
 * - Objectives
 * - Local abilities copy (with dependency graph)
 * - Fact sources (default to "basic" if present)
 */
onMounted(async () => {
  await objectiveStore.getObjectives($api);
  localAbilities.value = cloneDeep(props.abilities);
  findAbilityDependencies();
  rebuildExecutors();
  abilitiesReady.value = true;
  await getSources();
});

/**
 * Keep local state in sync with incoming prop changes.
 */
watch(
  () => props.abilities,
  (newAbilities) => {
    localAbilities.value = cloneDeep(newAbilities);
    findAbilityDependencies();
    rebuildExecutors();
    abilitiesReady.value = true;
  },
  { immediate: true }
);
</script>

<template lang="pug">
.automation-editor( v-if="selectedAdversary?.adversary_id || isCreatingNewAdversary" )
  //- Header
  .content(v-if="selectedAdversary && !isEditingName")
    h3.pointer(@click="isEditingName = true") {{ selectedAdversary.name }} {{ selectedAdversary.name === "New adversary" ? "(click to edit)" : "" }}
    p.pointer(@click="isEditingName = true") {{ selectedAdversary.description }}
  .form(v-if="isEditingName")
    .field
      .control
        input.input.is-large(v-model="selectedAdversary.name" placeholder="Adversary name")
    .field
      .control
        input.input(v-model="selectedAdversary.description" placeholder="Adversary description")
    p.help.has-text-danger.mb-3(v-if="validation.name") {{ validation.name }}
    button.button.is-primary(type="button" @click="isEditingName = false") Done

  //- Button row (grid: left | center | right)
  .toolbar(v-if="selectedAdversary && !isEditingName")
    //- Left buttons
    .toolbar-left.is-flex.is-align-items-center
        button.button.mr-2(@click="showAbilitySelection = true")
            span.icon
                font-awesome-icon(icon="fas fa-plus")
            span Add Ability
        button.button.mr-2(@click="showAddFromAdversary = true")
            span.icon
                font-awesome-icon(icon="fas fa-plus")
            span Add Adversary
        .vr.mx-3
    .toolbar-center.is-flex.is-align-items-center
        // Facts group
        .field.is-grouped.is-align-items-center.mr-2.mb-0
            .control
                span.toolbar-label.mr-2 Facts:
            .control
                .select
                    select(v-model="selectedSource")
                        option(disabled value="") Choose a Fact Source
                        option(v-for="source in sources" :key="source.id" :value="source") {{ `${source.name}` }}
            .control
                button.button(@click="modals.adversaries.showFactBreakdown = true")
                    span.icon
                        font-awesome-icon(icon="fas fa-unlock-alt")
                    span Fact Breakdown

        .vr.mx-2

        // Objective group
        .field.is-grouped.is-align-items-center.mb-0
            .control
                span.toolbar-label.mr-2 Objective:
            .control
                .select
                    select(v-model="selectedAdversary.objective")
                        option(v-for="objective in objectives" :key="objective.id" :value="objective.id") {{ objective.name }}

    // Right-aligned actions
    .toolbar-right.is-flex.is-align-items-center
        .vr.mx-3
        button.button.mr-2(@click="exportAdversary()")
            span.icon
                font-awesome-icon(icon="fas fa-file-export")
            span Export
        button.button.is-success.mr-2(@click="validateAndSaveAdversary()")
            span.icon
                font-awesome-icon(icon="fas fa-save")
            span Save
        button.button.is-danger.is-outlined(@click="modals.adversaries.showDeleteConfirm = true")
            span.icon
                font-awesome-icon(icon="fas fa-trash")
            span Delete

  //- Tactic breakdown
  .tactic-breakdown.pt-4.pb-4(title="Click to expand/collapse" @click="isTacticBreakdownActive = !isTacticBreakdownActive")
    span.tactic-item(
      v-for="tactic in getTacticBreakdown()"
      :class="{ 'active': isTacticBreakdownActive }"
      :style="`width: ${tactic[1]}%; background-color: ${hashStringToColor(tactic[0])};`"
      v-tooltip="tactic[0]"
    ) {{ `${tactic[0]}  ${tactic[1]}%` }}

  //- Ability table
  table.table.is-striped.is-fullwidth.is-narrow
    thead
      tr
        th
        th Ordering
        th Name
        th Tactic
        th Technique
        th Executors
        th Requires
        th Unlocks
        th Payload
        th Cleanup
        th
    tbody
      tr.pointer(
        v-for="(ability, index) in localAbilities"
        :class="getRowClass(ability)"
        @click="selectAbility(ability)"
        @mouseenter="setAbilityHover(ability.step_uuid)"
        @mouseleave="onHoverLocks = []; onHoverUnlocks = [];"
        )
        td.drag.is-flex.is-align-items-center.is-justify-content-center(
          @click.stop
          draggable="true"
          @dragenter="tableDragHoverId = ability.step_uuid"
          @dragstart="startAbilitySwap"
          @dragover.prevent="swapAbilitiesHover"
          @dragend="swapAbilities"
        )
          span &#9776;
        td
          .icon-text
            span {{ index + 1 }}
            span.icon.has-text-danger(v-if="!ability.step_uuid")
              font-awesome-icon(icon="fas fa-ban")
            span.icon.has-text-warning(v-if="needsParser.indexOf(ability.name) > -1")
              font-awesome-icon(icon="fas fa-exclamation-triangle")
        td {{ ability?.step_uuid ? ability?.name || 'Unnamed' : "Undefined Ability" }}
        td
          span(:style="`border-bottom: 2px ridge ${hashStringToColor(ability.tactic)}`") {{ ability.tactic }}
        td {{ ability.technique_name }}
        td
          span.icon-wrapper(
            v-for="(executor, index) in getExecutorDetail('platforms', ability)"
            v-tooltip="`${executor.platform} (${executor.name})`"
          )
            font-awesome-icon(
              :icon="executor.platform.includes('windows') ? 'fab fa-windows' : executor.platform.includes('darwin') ? 'fab fa-apple' : 'fab fa-linux'"
              class="executor-icon"
            )
            font-awesome-icon(
              v-if="executor.hasWarning === 'warning'"
              icon="fas fa-exclamation-triangle"
              class="warning-icon"
            )
            font-awesome-icon(
              v-else-if="executor.hasWarning === 'source'"
              icon="fas fa-puzzle-piece"
              class="source-icon"
            )
        td.has-text-centered(:class="{ 'unlock': onHoverUnlocks.indexOf(ability.step_uuid) > -1 }")
          span(
            v-if="abilityDependencies[ability.step_uuid] && getExecutorDetail('parser', ability)"
            v-tooltip="`This ability has requirements: (${abilityDependencies[ability.step_uuid].requireTypes})`"
          )
            span.icon.is-small
              font-awesome-icon(icon="fas fa-lock")
        td.has-text-centered(:class="{ 'lock': onHoverLocks.indexOf(ability.step_uuid) > -1 }")
          span(
            v-if="abilityDependencies[ability.step_uuid] && getExecutorDetail('parser', ability)"
            v-tooltip="`This ability unlocks other abilities: (${abilityDependencies[ability.step_uuid].enableTypes})`"
          )
            span.icon.is-small
              font-awesome-icon(icon="fas fa-key")
        td.has-text-centered
          span(v-if="getExecutorDetail('payload', ability)" v-tooltip="'This ability uses a payload'")
            span.icon.is-small
              font-awesome-icon(icon="fas fa-weight-hanging")
        td.has-text-centered
          span(v-if="getExecutorDetail('cleanup', ability)" v-tooltip="'This ability can clean itself up'")
            span.icon.is-small
              font-awesome-icon(icon="fas fa-trash")
        td.has-text-centered
          button.delete(@click.stop="deleteAbility(index)")

  .container.has-text-centered(
    v-if="abilitiesReady && Array.isArray(localAbilities.value) && !localAbilities.value.length"
  )
    p This profile has no abilities
    .icon-text(v-if="Array.isArray(needsParser) && needsParser.length")
    span.icon.has-text-warning
      font-awesome-icon(icon="fas fa-exclamation-triangle")
    span One or more of the abilities have unmet requirements, which may result in a failed operation if ran sequentially.
    .icon-text.mt-2(v-if="Array.isArray(undefinedAbilities) && undefinedAbilities.length")
    span.icon.has-text-danger
      font-awesome-icon(icon="fas fa-ban")
    span One or more of the referenced abilities are not defined

  //- Modals
  AbilitySelection(:active="showAbilitySelection" @select="addAbilityToAdversary" @close="showAbilitySelection = false" :canCreate="true")
  FactBreakdownModal(
    v-if="selectedSource && selectedSource.id && localAbilities.length"
    :abilities="localAbilities"
    :selectedSource="selectedSource"
  )
  AddAbilitiesFromAdversaryModal(:active="showAddFromAdversary" @select="addAbilitiesFromAdversary" @close="showAddFromAdversary = false")
  DeleteAdversaryConfirmationModal
</template>

<style scoped>
.drag { cursor: grab; }

.red-row-unclickable {
  pointer-events: none;
  font-weight: bold;
  border: 3px solid #8B0000;
}

.lock { background-color: blueviolet !important; }
.unlock { background-color: coral !important; }

.orange-row { border: 2px solid orange; }

.row-hover { background-color: #484848 !important; }
.row-hover-above { border-top: 3px solid green; }
.row-hover-below { border-bottom: 3px solid green; }

.tactic-breakdown {
  display: table;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transform-style: preserve-3d;
}
.tactic-item {
  display: table-cell;
  line-height: 8px;
  text-indent: -9999px;
  border-bottom: none !important;
}
.tactic-item.active {
  line-height: 30px;
  text-indent: 6px;
  font-size: .7em;
}
.icon-wrapper {
  position: relative;
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.25rem;
}
.executor-icon {
  font-size: 1.5rem;
  line-height: 1.5rem;
}
.warning-icon {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.7rem;
  color: orange;
  z-index: 2;
  pointer-events: none;
}
.source-icon {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.7rem;
  color: #a77dff;
  z-index: 2;
  pointer-events: none;
}
/* Center group  */
.toolbar-center .field.is-grouped {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
}
.toolbar-label {
  font-size: 1.0rem;
  font-weight: 600;
  line-height: 1.2;
}
/* Toolbar grid: left | center | right */
.toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* center column auto-sized, sides flex */
  align-items: center;
  column-gap: 1rem;
  width: 100%;
}

/* Right group hugs the right edge; center block stays centered */
.toolbar-right { justify-self: end; }
.toolbar-center { justify-self: center; }


.field.is-grouped .control + .control { margin-left: 0.5rem; }

</style>
