<script setup>
/**
 * Automation view logic: handles loading, selecting, and editing adversaries and abilities.
 * Provides UI bindings for adversary dropdown, import modal, and edit modal.
 */

import { ref, inject, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import cloneDeep from "lodash/cloneDeep";
import { v4 as uuidv4 } from "uuid";

import { useAgentStore } from "@/stores/agentStore";
import { useAbilityStore } from "@/stores/abilityStore";
import { useCoreStore } from "@/stores/coreStore";
import { useCoreDisplayStore } from "@/stores/coreDisplayStore";
import { useAdversaryStore } from "@/stores/adversaryStore";
import { useObjectiveStore } from "@/stores/objectiveStore";
import { buildExecutorsFromFacts } from "@/utils/executorUtils";

import ImportAutomationModal from "@/components/adversaries/ImportModal.vue";
import DetailsTable from "@/components/adversaries/DetailsTable.vue";
import EditAbilityModal from "@/components/abilities/CreateEditAbility.vue";


// ────────────────────────────
// Store initialization
// ────────────────────────────
const $api = inject("$api");
const router = useRouter();

const coreStore = useCoreStore();
const coreDisplayStore = useCoreDisplayStore();
const agentStore = useAgentStore();
const abilityStore = useAbilityStore();
const adversaryStore = useAdversaryStore();
const objectiveStore = useObjectiveStore();

const { modals } = storeToRefs(coreDisplayStore);
const { agents } = storeToRefs(agentStore);
const { abilities } = storeToRefs(abilityStore);
const { adversaries, selectedAdversary, selectedAdversaryAbilities } = storeToRefs(adversaryStore);
const { objectives } = storeToRefs(objectiveStore);


// ────────────────────────────
// Local reactive state
// ────────────────────────────
const selectedAbility = ref(null);
const showEditModal = ref(false);
const selectedAgent = ref({});
const importedFileContent = ref({});
const isAdversaryDropdownOpen = ref(false);
const adversarySearchQuery = ref("");
const isCreatingNewAdversary = ref(false);


// ────────────────────────────
// Computed values
// ────────────────────────────

/** Filter and sort adversaries by search input, excluding the currently selected one. */
const filteredAdversaries = computed(() => {
  if (!Array.isArray(adversaries.value) || !adversaries.value.length) return [];

  const search = adversarySearchQuery.value.toLowerCase();
  const currentId = selectedAdversary.value?.adversary_id ?? null;

  return adversaries.value
    .filter(a => a.name?.toLowerCase().includes(search) && a.adversary_id !== currentId)
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Extract operation-level facts from imported profile content. */
const operationFacts = computed(() => importedFileContent.value?.operation_facts || []);


// ────────────────────────────
// Action handlers
// ────────────────────────────

/** 
 * Select an adversary profile from the dropdown. 
 * Resets any open modals or ability editing state.
 */
function selectAdversary(adversary) {
  showEditModal.value = false;
  selectedAbility.value = null;
  selectedAdversary.value = adversary;
  adversaryStore.loadAdversaryFromProfile(adversary);
  isAdversaryDropdownOpen.value = false;
  adversarySearchQuery.value = "";
}

/**
 * Create a new temporary adversary profile for editing before saving to backend.
 */
function createAdversary() {
  const defaultObjectiveId = objectives.value?.[0]?.id ?? null;
  isCreatingNewAdversary.value = true;

  const newAdversary = {
    adversary_id: uuidv4(),
    name: "New Adversary Profile",
    description: "",
    objective: defaultObjectiveId,
    atomic_ordering: [],
    abilities: [],
  };

  adversaryStore.selectedAdversary = newAdversary;
  adversaryStore.selectedAdversaryAbilities = [];

  coreDisplayStore.modals.adversaries = {
    showFactBreakdown: false,
    showDeleteConfirm: false,
    showImport: false,
    showDetails: false,
  };
}

/**
 * Import an adversary profile JSON and sanitize its data before loading into store.
 */
async function handleImportedProfile(profile) {
  try {
    if (!Array.isArray(profile.atomic_ordering)) {
      throw new Error("Invalid profile: atomic_ordering must be an array.");
    }

    const cleanProfile = {
      adversary_id: profile.id || profile.adversary_id || uuidv4(),
      name: profile.name || "Imported Adversary",
      description: profile.description || "",
      objective: typeof profile.objective === "object"
        ? profile.objective?.id
        : profile.objective || null,
      operation_facts: profile.operation_facts || [],
      atomic_ordering: profile.atomic_ordering.map(step =>
        typeof step === "string"
          ? { ability_id: step }
          : {
              ...step,
              ability_id: step.ability_id,
              facts: step.facts || [],
              metadata: step.metadata || {},
            }
      ),
    };

    adversaryStore.loadAdversaryFromProfile(cleanProfile);
    importedFileContent.value = cleanProfile;
  } catch (e) {
    console.error("Error importing adversary profile:", e);
  }
}

/**
 * Handle clicking on an ability in the DetailsTable.
 * Merges metadata and executor facts into a complete editable object.
 */
function handleAbilityClick(step) {
  const stepUuid = step?.step_uuid;
  if (!stepUuid) return;

  const live = selectedAdversaryAbilities.value.find(
    a => a.step_uuid === stepUuid
  );

  const built = cloneDeep(live || step);

  built.executors = Array.isArray(built.executors) ? built.executors : [];
  built.metadata = built.metadata || {};
  built.metadata.executor_facts = built.metadata.executor_facts || {};

  selectedAbility.value = built;
  showEditModal.value = true;
}



/** Close the edit ability modal. */
function closeEditModal() {
  showEditModal.value = false;
}

/** Apply updates to an ability instance within the adversary store. */
function onUpdateAbility(updatedAbility) {
  adversaryStore.updateAbilityInstance(updatedAbility);

  // ✅ force new array ref so DetailsTable watcher fires
  adversaryStore.selectedAdversaryAbilities = [
    ...adversaryStore.selectedAdversaryAbilities
  ];

  selectedAbility.value = cloneDeep(updatedAbility);
}

function removeAbilityFromAdversary(stepUuid) {
  selectedAdversaryAbilities.value =
    selectedAdversaryAbilities.value.filter(a => a.step_uuid !== stepUuid);
}


// ────────────────────────────
// Lifecycle
// ────────────────────────────

/**
 * Load initial data (abilities, adversaries, agents) on mount.
 */
onMounted(async () => {
  await Promise.all([
    abilityStore.getAbilities($api),
    adversaryStore.getAdversaries($api),
    agentStore.getAgents($api),
  ]);
});
</script>

<template>
  <div class="content">
  <h2 class="title is-3">Automation</h2>
  <p>
    Build and run automated sequences by chaining abilities together. Import an automation profile, or start by selecting an adversary to preload abilities.
  </p>
  <hr />

  <!-- Adversary Selector -->
  <section id="select-adversary" class="is-flex is-align-items-center mb-4">
    <div
      class="dropdown searchable is-flex-grow-1 mr-2"
      :class="{ 'is-active': isAdversaryDropdownOpen }"
    >
      <div class="dropdown-trigger">
        <button
          class="button is-fullwidth"
          type="button"
          @click="isAdversaryDropdownOpen = !isAdversaryDropdownOpen"
        >
          <span>{{ selectedAdversary?.name || "Select an adversary" }}</span>
          <span class="icon is-small">
            <font-awesome-icon icon="fas fa-angle-down" />
          </span>
        </button>
      </div>

      <div class="dropdown-menu is-fullwidth" role="menu">
        <div class="dropdown-content">
          <div class="dropdown-item">
            <input
              class="input"
              v-model="adversarySearchQuery"
              placeholder="Search for an adversary..."
            />
          </div>
          <div class="dropdown-divider" />
          <a
            v-for="adversary in filteredAdversaries"
            :key="adversary.adversary_id"
            class="dropdown-item"
            @click="selectAdversary(adversary)"
            @mousedown.stop.prevent
            @click.stop.prevent="selectAdversary(adversary)"
            :class="{ 'is-active': adversary.adversary_id === selectedAdversary?.adversary_id }"
          >
            {{ adversary.name }}
          </a>
          <p class="has-text-centered" v-if="!filteredAdversaries.length">No results</p>
        </div>
      </div>
    </div>

    <button class="button is-primary mr-2" @click="createAdversary">
      <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
      <span>New Profile</span>
    </button>

    <button class="button mr-2" type="button" @click="modals.automationImport = true">
      <span class="icon"><font-awesome-icon icon="fas fa-file-import" /></span>
      <span>Import</span>
    </button>
  </section>


    <!-- Ability Edit Modal -->
    <EditAbilityModal
      v-if="showEditModal"
      :active="showEditModal"
      :ability="selectedAbility"
      :agent="selectedAgent"
      :operationFacts="operationFacts"
      @remove="removeAbilityFromAdversary"
      :allow-command-edit="false"
      :allow-trait-edit="true"
      delete-mode="adversary"
      @close="closeEditModal"
      @update="onUpdateAbility"
    />
    <!-- Modal & Details -->
    <ImportAutomationModal
      v-if="modals.automationImport"
      @close="modals.automationImport = false"
      @imported="handleImportedProfile"
    />

    <section v-if="!showEditModal" class="box mt-4">
        <DetailsTable
        :abilities="selectedAdversaryAbilities"
        @ability-click="handleAbilityClick"
        @update:abilities="adversaryStore.selectedAdversaryAbilities = $event"
        :isCreatingNewAdversary="isCreatingNewAdversary"
        />

    </section>
  </div>

</template>
