<!-- CreateEditAbility.vue -->
<script setup>
/**
 * CreateEditAbility.vue
 *
 * Backwards-compatible ability editor that supports:
 * - Template abilities (no step_uuid, no metadata.executor_facts)
 * - Adversary step instances (have step_uuid and metadata.executor_facts)
 *
 * Core rule:
 * - UI identity is ALWAYS derived from a UI-only step_uuid + executor identity (name+platform).
 * - Backend persistence for executor_facts remains platform-keyed (linux/darwin/windows) for compatibility.
 */

import { inject, ref, reactive, watch, onMounted, computed, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import cloneDeep from 'lodash/cloneDeep';
import { v4 as uuidv4 } from 'uuid';

import { useAbilityStore } from '@/stores/abilityStore';
import CodeEditor from '@/components/core/CodeEditor.vue';
import AutoSuggest from '@/components/core/AutoSuggest.vue';
import { useSourceStore } from '@/stores/sourceStore';

const sourceStore = useSourceStore();
const { sources } = storeToRefs(sourceStore);
const newAbility = ref(null);

const props = defineProps({
  ability: Object,
  agent: Object,
  operationFacts: Array,
  active: { type: Boolean, default: false },
  creating: Boolean,
  // CONTEXT FLAGS
  allowCommandEdit: {
    type: Boolean,
    default: true
  },
  allowTraitEdit: {
    type: Boolean,
    default: false
  },
  deleteMode: {
    type: String,
    default: 'ability',
  }
});

const emit = defineEmits(['close', 'save', 'remove']);

const $api = inject('$api');
const abilityStore = useAbilityStore();
const { tactics, techniqueIds, techniqueNames, platforms, payloads } = storeToRefs(abilityStore);

/**
 * validation
 * - Basic client-side validation used before emitting updated ability/step data.
 */
const validation = reactive({
  name: '',
  tactic: '',
  techniqueId: '',
  techniqueName: '',
  executors: ''
});

const VALID_EXECUTORS = {
  linux: ['sh'],
  darwin: ['sh'],
  windows: ['cmd', 'psh', 'pwsh']
};

/**
 * userFactsMap
 * - UI-only, step-scoped, executor-scoped container for user-edited facts.
 * - Keyed by derived UI executor key: `${step_uuid}::${executor.name}::${executor.platform}`
 * - Values are objects keyed by trait:
 *   { [trait]: { customValue: string, selected: string[] } }
 */
const userFactsMap = reactive({});

/**
 * handleClickOutside
 * - Closes an executor's payload dropdown when clicking outside.
 */
function handleClickOutside(event) {
  for (const [index, executor] of (abilityToEdit.value.executors || []).entries()) {
    const key = getExecutorKey(executor, index);
    const dropdownEl = document.querySelector(
      `.executor-payload-dropdown[data-executor-key="${CSS.escape(key)}"]`
    );
    if (dropdownEl && !dropdownEl.contains(event.target)) {
      executor.showPayloadDropdown = false;
    }
  }
}

onMounted((async () => {
  document.addEventListener('click', handleClickOutside);
  await sourceStore.getSources($api);
}));

const factSourceFacts = computed(() => {
  return sources.value.flatMap(src =>
    (src.facts || []).map(f => ({
      trait: f.trait,
      value: f.value,
      sourceName: src.name // 👈 HUMAN name
    }))
  );
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});


/**
 * getStepUuid
 * - Ensures we ALWAYS have a UI-only step_uuid for stable UI identity.
 * - Backwards compatible:
 *   - If backend provided step_uuid, we use it.
 *   - If missing (template ability), we generate a UI uuid.
 */
function getStepUuid() {
  const existing =
    abilityToEdit.value?.step_uuid ||
    props.ability?.step_uuid ||
    null;

  if (existing) return existing;

  // UI-only UUID (never meant to persist to backend; parent may strip on save)
  const created = uuidv4();

  // Store on current editor state so it's stable during this edit session
  if (!abilityToEdit.value) abilityToEdit.value = {};
  abilityToEdit.value.step_uuid = created;

  return created;
}


// /mnt/data/CreateEditAbility.vue (script setup, near initializeUserFacts)
function ensureTraitSlot(executor, trait) {
  const key = getExecutorKey(executor);
  userFactsMap[key] ??= {};
  userFactsMap[key][trait] ??= { customValue: '', selected: [] };
  return userFactsMap[key][trait];
}

/**
 * getExecutorKey
 * - Single source of truth for executor identity in the UI.
 * - IMPORTANT: derived (never stored on executor object).
 * - Backwards compatible:
 *   - Works with abilities that do or do not have step_uuid.
 */
function getExecutorKey(executor) {
  const stepUuid = ensureStepUuid();
  return `${stepUuid}::${executor.ui_uuid}`;
}

/**
 * getCommandFields
 * - Extracts #{trait} placeholders from a command string.
 * - Returns unique list of traits.
 */
function getCommandFields(command = '') {
  if (!command) return [];
  return [...new Set([...command.matchAll(/#{(.*?)}/gm)].map(m => m[1]))];
}

const matchedFactsByTrait = computed(() => {
  const map = {};
  const facts = factSourceFacts.value;

  (abilityToEdit.value.executors || []).forEach(executor => {
    const key = getExecutorKey(executor);
    const userFacts = userFactsMap[key] || {};

    getCommandFields(executor.command || '').forEach(trait => {
      map[trait] ??= facts
        .filter(f => f.trait === trait)
        .map(f => ({
          value: f.value,
          origin: f.sourceName || 'fact-source',
          selected: userFacts[trait]?.selected?.includes(f.value) || false
        }));
    });
  });

  return map;
});

function toggleSuggestedFact(executor, trait, fact) {
  const key = getExecutorKey(executor);
  userFactsMap[key] ??= {};
  userFactsMap[key][trait] ??= { customValue: '', selected: [] };

  const selected = userFactsMap[key][trait].selected;

  if (fact.selected) {
    if (!selected.includes(fact.value)) selected.push(fact.value);
  } else {
    userFactsMap[key][trait].selected =
      selected.filter(v => v !== fact.value);
  }
}

/**
 * formattedPayloads
 * - Normalizes payload records into objects.
 */
const formattedPayloads = computed(() => {
  return (Array.isArray(payloads.value) ? payloads.value : []).map(p => {
    return typeof p === 'string' ? { payload_id: p, name: p } : p;
  });
});

/**
 * filteredPayloads
 * - Applies executor payload search input to the payload list.
 */
function filteredPayloads(searchQuery) {
  const query = searchQuery?.toLowerCase() || '';
  return formattedPayloads.value
    .filter(p => p.name.toLowerCase().includes(query))
    .map(p => p.payload_id);
}

/**
 * togglePayload
 * - Adds/removes payload IDs from an executor.
 */
function togglePayload(executor, payloadId) {
  const list = executor.payloads;
  const idx = list.indexOf(payloadId);
  if (idx === -1) list.push(payloadId);
  else list.splice(idx, 1);
}

/**
 * addExecutor
 * - Adds a new executor entry to the ability being edited.
 * - Backwards compatible:
 *   - Does not assume step_uuid exists; UI key will derive from getStepUuid().
 */
function addExecutor() {
  const baseExecutor = {
    ui_uuid: uuidv4(),
    command: '',
    cleanup: [],
    timeout: 60,
    platform: 'darwin',
    name: platforms.value?.darwin?.[0] || 'sh',
    payloads: [],
    parsers: [],
    uploads: [],
    variations: [],
    additional_info: {},
    showPayloadDropdown: false,
    payloadSearch: ''
  };

  if (!abilityToEdit.value.executors) {
    abilityToEdit.value.executors = [baseExecutor];
  } else {
    abilityToEdit.value.executors.push(baseExecutor);
  }
}

/**
 * setAbilityToEdit
 * - Clones the incoming ability/step instance and normalizes it for editing.
 * - Backwards compatible:
 *   - If metadata.executor_facts is missing, initializes it to {}.
 *   - If step_uuid is missing, generates UI-only step_uuid for stable UI identity.
 */
function setAbilityToEdit() {
  if (!props.ability) {
    abilityToEdit.value = {
      step_uuid: uuidv4(), // UI-only for creation flows
      requirements: [],
      executors: [],
      metadata: { executor_facts: {} }
    };

    // Clear stale facts
    Object.keys(userFactsMap).forEach(k => delete userFactsMap[k]);
    return;
  }

  const cloned = cloneDeep(props.ability);

  // Ensure UI-only step_uuid exists
  cloned.step_uuid = cloned.step_uuid || uuidv4();

  cloned.requirements = Array.isArray(cloned.requirements) ? cloned.requirements : [];
  cloned.executors = Array.isArray(cloned.executors) ? cloned.executors : [];
  cloned.metadata = cloned.metadata || {};
  cloned.metadata.executor_facts = cloned.metadata.executor_facts || {};

  // Normalize executor shape (do not set executor.key)
  for (const executor of cloned.executors) {
    executor.showPayloadDropdown ??= false;
    executor.payloadSearch ??= '';
    executor.payloads = Array.isArray(executor.payloads) ? executor.payloads : [];
    executor.cleanup = Array.isArray(executor.cleanup) ? executor.cleanup : [];
    executor.parsers = Array.isArray(executor.parsers) ? executor.parsers : [];
    executor.uploads = Array.isArray(executor.uploads) ? executor.uploads : [];
    executor.variations = Array.isArray(executor.variations) ? executor.variations : [];
    executor.additional_info = executor.additional_info || {};
  }

  abilityToEdit.value = cloned;

  // Clear stale facts
  Object.keys(userFactsMap).forEach(k => delete userFactsMap[k]);

  initializeUserFacts();
}

function initializeUserFacts() {
  if (!abilityToEdit.value.executors) return;

  const executorFacts = abilityToEdit.value.metadata?.executor_facts || {};

  for (const executor of abilityToEdit.value.executors) {
    const key = getExecutorKey(executor);
    userFactsMap[key] ??= {};

    const platformFacts = executorFacts[executor.platform] || [];

    // ✅ group persisted facts by trait
    const byTrait = {};
    for (const { trait, value } of platformFacts) {
      (byTrait[trait] ??= []).push(String(value ?? ''));
    }

    // ✅ hydrate into customValue + selected
    for (const [trait, values] of Object.entries(byTrait)) {
      userFactsMap[key][trait] ??= { customValue: '', selected: [] };

      const trimmed = values.map(v => v.trim()).filter(Boolean);
      userFactsMap[key][trait].customValue = trimmed[0] ?? '';
      userFactsMap[key][trait].selected = trimmed.slice(1);
    }

    // ensure trait slots exist for all placeholders
    getCommandFields(executor.command || '').forEach(trait => {
      userFactsMap[key][trait] ??= { customValue: '', selected: [] };
    });
  }
}

/**
 * validateAndSaveAbility
 * - Validates and emits an updated ability/step object.
 * - Persists facts in metadata.executor_facts using BACKEND COMPATIBLE format:
 *   { linux: [{trait,value}], darwin: [...], windows: [...] }
 * - Always includes step_uuid in emitted object for stable UI references.
 */
function validateAndSaveAbility() {
  console.log('[SAVE] clicked');
  validation.name = abilityToEdit.value.name ? '' : 'Name cannot be empty';
  validation.tactic = abilityToEdit.value.tactic ? '' : 'Tactic cannot be empty';
  validation.techniqueId = abilityToEdit.value.technique_id ? '' : 'Technique ID cannot be empty';
  validation.techniqueName = abilityToEdit.value.technique_name ? '' : 'Technique Name cannot be empty';

  validation.executors =
    abilityToEdit.value.executors?.length &&
    abilityToEdit.value.executors.every(
      ex => ex.platform && ex.name && ex.command && ex.timeout >= 0
    )
      ? ''
      : 'Executors are invalid or missing.';
  console.log('[SAVE] validation state', JSON.parse(JSON.stringify(validation)));
  if (!Object.values(validation).every(v => !v)) {
    console.log('[SAVE] blocked by validation');
    return;
  }
  if (!Object.values(validation).every(v => !v)) return;

  // ✅ Build platform-keyed executor_facts from userFactsMap
  const executorFacts = {};

  (abilityToEdit.value.executors || []).forEach((executor) => {
    const key = getExecutorKey(executor);
    const platform = executor.platform;

    const traitMap = userFactsMap[key] || {};
    executorFacts[platform] ??= [];

    Object.entries(traitMap).forEach(([trait, data]) => {
      const custom = (data?.customValue ?? '').trim();
      if (custom) {
        executorFacts[platform].push({ trait, value: custom });
      }

      (data?.selected ?? []).forEach((v) => {
        const val = String(v ?? '').trim();
        if (val) {
          executorFacts[platform].push({ trait, value: val });
        }
      });
    });
  });
  console.log('[SAVE] executor_facts', executorFacts);


  // Update local ability
  abilityToEdit.value.step_uuid = getStepUuid();
  abilityToEdit.value.metadata = {
    ...(abilityToEdit.value.metadata || {}),
    executor_facts: executorFacts
  };
  console.log('[SAVE] emitting save');
  // Emit updated object
  emit('save', cloneDeep(abilityToEdit.value));
}


function ensureStepUuid() {
  if (!abilityToEdit.value.step_uuid) {
    abilityToEdit.value.step_uuid = uuidv4();
    console.log('[Ability.vue] Generated UI step_uuid:', abilityToEdit.value.step_uuid);
  }
  return abilityToEdit.value.step_uuid;
}

async function deleteAbility() {
  if (props.deleteMode === 'ability') {
    // GLOBAL DELETE (file + backend)
    await abilityStore.deleteAbility($api, abilityToEdit.value.ability_id);
    emit('close');
    return;
  }

  console.warn('[CreateEditAbility] Delete blocked: deleteMode=none');
}

// Load dropdown data
onMounted(async () => {
  await abilityStore.getAbilities($api);
  await abilityStore.getPayloads($api);
});

// When ability changes, re-normalize + hydrate
watch(
  () => props.ability,
   () =>  {
      setAbilityToEdit();
  },
  { immediate: true }
);
</script>

<template>
  <div class="modal is-active">
    <div class="modal-background" @click="$emit('close')"></div>
    <div class="modal-card" style="width: 80%;">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ props.creating ? 'Create' : 'Edit' }} Ability</p>
      </header>

      <section class="modal-card-body content m-0">
        <form>
          <!-- Basic Info -->
          <label class="label">Ability ID</label>
          <div class="field" v-if="!props.creating">
            <div class="control">
              <input class="input" v-model="abilityToEdit.ability_id" disabled />
            </div>
          </div>
          <div class="field" v-else>
            <p class="is-italic">ID will be automatically created</p>
          </div>

          <div class="field">
            <label class="label">Name</label>
            <div class="control">
              <input class="input" v-model="abilityToEdit.name" :class="{ 'is-danger': validation.name }" />
              <p class="has-text-danger">{{ validation.name }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">Description</label>
            <div class="control">
              <textarea class="textarea" v-model="abilityToEdit.description"></textarea>
            </div>
          </div>

          <div class="field">
            <label class="label">Tactic</label>
            <div class="control" v-if="tactics.length > 0">
              <AutoSuggest v-model="abilityToEdit.tactic" :items="tactics" :isDanger="!!validation.tactic" placeholder="Tactic" />
              <p class="has-text-danger">{{ validation.tactic }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">Technique ID</label>
            <div class="control" v-if="techniqueIds.length > 0">
              <AutoSuggest v-model="abilityToEdit.technique_id" :items="techniqueIds" :isDanger="!!validation.techniqueId" placeholder="Technique ID" />
              <p class="has-text-danger">{{ validation.techniqueId }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">Technique Name</label>
            <div class="control" v-if="techniqueNames.length > 0">
              <AutoSuggest v-model="abilityToEdit.technique_name" :items="techniqueNames" :isDanger="!!validation.techniqueName" placeholder="Technique Name" />
              <p class="has-text-danger">{{ validation.techniqueName }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">Options</label>
            <div class="control">
              <input type="checkbox" v-model="abilityToEdit.singleton" />
              <span class="ml-3">Singleton</span>
            </div>
            <div class="control">
              <input type="checkbox" v-model="abilityToEdit.repeatable" />
              <span class="ml-3">Repeatable</span>
            </div>
            <div class="control">
              <input type="checkbox" v-model="abilityToEdit.delete_payload" />
              <span class="ml-3">Delete payload</span>
            </div>
          </div>
        </form>

        <!-- Executors Section -->
        <p class="has-text-centered has-text-weight-semibold is-size-5 mb-2 mt-4">Executors</p>
        <p class="has-text-danger has-text-centered mb-3">{{ validation.executors }}</p>

        <div class="has-text-centered mb-4">
          <button type="button" class="button is-primary" @click="addExecutor">
            <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
            <span>Add Executor</span>
          </button>
        </div>

        <div
          class="box"
          v-for="(executor, index) in abilityToEdit.executors"
          :key="getExecutorKey(executor, index)"
        >
          <!-- Delete button aligned top-right -->
          <div class="is-flex is-justify-content-flex-end">
            <button
              type="button"
              class="button is-small is-danger is-light"
              @click="abilityToEdit.executors.splice(index, 1)"
            >
              <span class="icon is-small">
                <font-awesome-icon icon="fas fa-times" />
              </span>
            </button>
          </div>

          <!-- Flex row for Platform and Executor -->
          <div class="is-flex" style="gap: 1.5rem;">
            <!-- Platform -->
            <div class="field" style="flex: 0 0 150px;">
              <label class="label">Platform</label>
              <div class="control">
                <div class="select is-fullwidth">
                  <select v-model="executor.platform">
                    <option v-for="platform in Object.keys(platforms)" :key="platform" :value="platform">
                      {{ platform }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Executor -->
            <div class="field" style="flex: 0 0 150px;">
              <label class="label">Executor</label>
              <div class="control">
                <div class="select is-fullwidth">
                  <select v-model="executor.name">
                    <option v-for="exec in VALID_EXECUTORS[executor.platform] || []" :key="exec" :value="exec">
                      {{ exec }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Payloads Dropdown + Selected Tags -->
          <div class="field mt-4">
            <label class="label">Payloads</label>

            <div
              class="dropdown executor-payload-dropdown"
              :data-executor-key="getExecutorKey(executor, index)"
              :class="{ 'is-active': executor.showPayloadDropdown }"
              style="width: 100%;"
            >
              <div class="dropdown-trigger">
                <button
                  class="button is-fullwidth"
                  @click="executor.showPayloadDropdown = !executor.showPayloadDropdown"
                  type="button"
                >
                  <span>Select payloads</span>
                  <span class="icon is-small">
                    <font-awesome-icon icon="fas fa-angle-down" />
                  </span>
                </button>
              </div>

              <div class="dropdown-menu" role="menu">
                <div class="dropdown-content px-2 py-2" style="max-height: 200px; overflow-y: auto;">
                  <div class="control has-icons-left mb-2">
                    <input
                      v-model="executor.payloadSearch"
                      class="input is-small"
                      placeholder="Search payloads..."
                    />
                    <span class="icon is-left is-small">
                      <font-awesome-icon icon="fas fa-search" />
                    </span>
                  </div>

                  <div
                    class="dropdown-item"
                    v-for="payload in filteredPayloads(executor.payloadSearch)"
                    :key="payload"
                    @click.stop="togglePayload(executor, payload)"
                    style="cursor: pointer;"
                  >
                    <label class="checkbox">
                      <input
                        type="checkbox"
                        :checked="executor.payloads.includes(payload)"
                        @change.stop
                      />
                      {{ payload }}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected tags -->
            <div class="field is-grouped is-grouped-multiline mt-3" style="margin-left: 9rem;">
              <div class="control" v-for="(payload, idx) in executor.payloads" :key="payload">
                <div class="tags has-addons">
                  <span class="tag is-primary is-light">{{ payload }}</span>
                  <a class="tag is-delete" @click="executor.payloads.splice(idx, 1)"></a>
                </div>
              </div>
              <div class="control" v-if="executor.payloads.length === 0">
                <span class="tag is-light">No payloads</span>
              </div>
            </div>
          </div>

          <!-- Command -->
          <div class="field mt-5">
            <label class="label">Command</label>
            <CodeEditor v-model="executor.command" language="bash" line-numbers :readonly="!props.allowCommandEdit" />
          </div>

          <!-- Facts -->
          <div class="field" v-if="getCommandFields(executor.command).length">
            <label class="label">Fact Templates</label>
            <p>This ability needs facts in order to run properly. Provide at least one value for each fact.</p>
            <details open>
              <summary>
                <span class="has-text-weight-bold is-size-5 ml-2">Facts</span>
              </summary>
              <table class="mt-2">
                <tr>
                  <th>Trait</th>
                  <th>Value</th>
                </tr>

                <!-- Command traits with selectable facts -->
                <tr
                  v-for="trait in getCommandFields(executor.command)"
                  :key="'trait-' + trait"
                >
                  <td>
                    <span>{{ trait }}</span>
                    <font-awesome-icon
                      icon="fa-exclamation-triangle"
                      class="ml-2 has-text-warning"
                      v-if="!(
                        userFactsMap[getExecutorKey(executor, index)]?.[trait]?.customValue ||
                        userFactsMap[getExecutorKey(executor, index)]?.[trait]?.selected?.length
                      )"
                    />
                  </td>

                  <td>
                    <!-- Custom value -->
                    <input
                      class="input mb-2"
                      :disabled="!props.allowTraitEdit"
                      placeholder="Enter a custom value"
                      v-model="ensureTraitSlot(executor, trait).customValue"
                    />

                    <!-- Suggested facts -->
                    <div
                      v-for="fact in matchedFactsByTrait[trait] || []"
                      :key="fact.value"
                    >
                      <label class="checkbox">
                        <input
                          type="checkbox"
                          :checked="userFactsMap[getExecutorKey(executor)]?.[trait]?.selected?.includes(fact.value)"
                          :disabled="!props.allowTraitEdit"
                          @change="toggleSuggestedFact(executor, trait, {
                            value: fact.value,
                            selected: $event.target.checked
                          })"
                        />
                        <span class="ml-2">{{ fact.value }}</span>
                        <span class="tag ml-2">{{ fact.origin }}</span>
                      </label>
                    </div>
                  </td>
                </tr>
              </table>

            </details>
          </div>

          <!-- Cleanup -->
          <div class="field">
            <label class="label">Cleanup</label>
            <div class="field has-addons" v-for="(cleanup, cidx) in executor.cleanup" :key="cidx">
              <div class="control is-expanded">
                <CodeEditor v-model="executor.cleanup[cidx]" :key="cidx" language="bash" line-numbers />
              </div>
              <div class="control">
                <a class="button" @click="executor.cleanup.splice(cidx, 1)">
                  <span class="icon"><font-awesome-icon icon="fas fa-times" /></span>
                </a>
              </div>
            </div>
            <button class="button" type="button" @click="executor.cleanup.push('')">
              <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
              <span>Add Cleanup Command</span>
            </button>
          </div>

          <!-- Requirements -->
          <div class="field">
            <label class="label">Requirements</label>
            <div class="field has-addons" v-for="(requirement, rIdx) in abilityToEdit.requirements" :key="rIdx">
              <div class="control is-expanded">
                <input class="input" type="text" v-model="requirement.module" placeholder="Requirement Module" />
              </div>
              <div class="control">
                <a class="button" @click="abilityToEdit.requirements.splice(rIdx, 1)">
                  <span class="icon"><font-awesome-icon icon="fas fa-times" /></span>
                </a>
              </div>
              <div class="field has-addons" v-for="(rel, relIdx) in requirement.relationship_match" :key="relIdx">
                <input class="input" type="text" v-model="rel.source" placeholder="Source" />
                <input class="input" type="text" v-model="rel.edge" placeholder="Edge [optional]" />
                <input class="input" type="text" v-model="rel.target" placeholder="Target [optional]" />
              </div>
            </div>
            <button
              class="button"
              type="button"
              @click="abilityToEdit.requirements.push({ module: '', relationship_match: [{ source: '', edge: '', target: '' }] })"
            >
              <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
              <span>Add Requirement</span>
            </button>
          </div>

          <!-- Parsers -->
          <div class="field">
            <label class="label">Parsers</label>
            <div class="field has-addons" v-for="(parser, pIdx) in executor.parsers" :key="pIdx">
              <div class="control is-expanded">
                <input class="input" type="text" v-model="parser.module" placeholder="Parser Module" />
              </div>
              <div class="control">
                <a class="button" @click="executor.parsers.splice(pIdx, 1)">
                  <span class="icon"><font-awesome-icon icon="fas fa-times" /></span>
                </a>
              </div>
              <div class="field has-addons" v-for="(cfg, cfgIdx) in parser.parserconfigs" :key="cfgIdx">
                <input class="input" type="text" v-model="cfg.source" placeholder="Output Source" />
                <input class="input" type="text" v-model="cfg.edge" placeholder="Output Edge [optional]" />
                <input class="input" type="text" v-model="cfg.target" placeholder="Output Target [optional]" />
              </div>
            </div>
            <button
              class="button"
              type="button"
              @click="executor.parsers.push({ module: '', parserconfigs: [{ source: '', edge: '', target: '' }] })"
            >
              <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
              <span>Add Parser</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <footer class="modal-card-foot is-flex is-justify-content-space-between">
          <div class="is-flex">
            <button class="button" @click="setAbilityToEdit">
              <span class="icon">
                <font-awesome-icon icon="fas fa-undo" />
              </span>
              <span>Reset</span>
            </button>

            <button class="button is-danger is-outlined" v-if="!props.creating && props.deleteMode !== 'none'" @click="deleteAbility">
              <span class="icon">
                <font-awesome-icon icon="fas fa-trash" />
              </span>
              <span>Delete</span>
            </button>
          </div>

          <div class="is-flex">
            <button class="button" @click="emit('close')">Cancel</button>
            <button type="button" class="button is-primary" @click="validateAndSaveAbility">
              <span class="icon">
                <font-awesome-icon icon="fas fa-save" />
              </span>
              <span>{{ props.creating ? 'Create' : 'Save' }}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.box {
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 18px;
  right: 20px;
}

.modal-card {
  width: 1000px;
}

@media screen and (max-width: 1050px) {
  .modal-card {
    width: 600px;
  }
}
</style>
