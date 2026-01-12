<script setup>
import { inject, ref, reactive, watch, onMounted, computed, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import cloneDeep from 'lodash/cloneDeep';
import { useAbilityStore } from '@/stores/abilityStore';
import CodeEditor from '@/components/core/CodeEditor.vue';
import AutoSuggest from '@/components/core/AutoSuggest.vue';

const props = defineProps({
  ability: Object,
  agent: Object,
  operationFacts: Array,
  abilityFacts: Array,
  active: { type: Boolean, default: false },
  creating: Boolean
});
function handleClickOutside(event) {
  // Loop through each executor and close its dropdown if the click is outside
  for (const executor of abilityToEdit.value.executors || []) {
    const dropdownEl = document.querySelector(`.executor-payload-dropdown-${executor.key}`);
    if (dropdownEl && !dropdownEl.contains(event.target)) {
      executor.showPayloadDropdown = false;
    }
  }
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});


const emit = defineEmits(['close', 'update']);
const $api = inject('$api');
const abilityStore = useAbilityStore();
const { tactics, techniqueIds, techniqueNames, platforms, payloads } = storeToRefs(abilityStore);

let abilityToEdit = ref({});

let validation = reactive({
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

const isPayloadDropdownOpen = ref(false);
const userFactsMap = reactive({});

function getExecutorKey(executor) {
  return executor.key;
}
function getUserFactsFor(executor, index = null) {
  const executorKey = getExecutorKey(executor, index);
  if (!userFactsMap[executorKey]) userFactsMap[executorKey] = [];

  const existingTraits = userFactsMap[executorKey].map(f => f.trait);
  const cmdFields = getCommandFields(executor.command || '');

  for (const trait of cmdFields) {
    if (!existingTraits.includes(trait)) {
      userFactsMap[executorKey].push({ trait, value: '' });
    }
  }
  return userFactsMap[executorKey];
}
const commandFields = computed(() => {
  const cmd = abilityToEdit.value.executors?.[0]?.command || '';
  if (!cmd) return [];
  return [...new Set([...cmd.matchAll(/#{(.*?)}/gm)].map(m => m[1]))];
});
const predefinedFacts = computed(() => {
  return commandFields.value
    .map(trait => {
      return props.abilityFacts?.find(f => f.trait === trait)
    })
    .filter(Boolean);
});
const selectedFacts = computed(() => {
  const facts = [];
  for (const [index, executor] of (abilityToEdit.value.executors || []).entries()) {
    facts.push(...getUserFactsFor(executor, index));
  }
  return [...predefinedFacts.value, ...facts].filter(f => f.value?.trim());
});
const userFactsPerExecutor = computed(() => {
  const map = {};
  (abilityToEdit.value.executors || []).forEach((executor, index) => {
    const key = getExecutorKey(executor, index);
    map[key] = userFactsMap[key] || [];
  });
  return map;
});
const formattedPayloads = computed(() => {
  return (Array.isArray(payloads.value) ? payloads.value : []).map(p => {
    return typeof p === 'string' ? { payload_id: p, name: p } : p;
  });
});
function isPredefinedTrait(trait) {
  return predefinedFacts.value.some(pre => pre.trait === trait);
}
function addExecutor() {
  const baseExecutor = {
    cleanup: [],
    timeout: 60,
    platform: 'darwin',
    name: platforms.value.darwin[0],
    payloads: [],
    parsers: [],
    key: uuidv4(),
    showPayloadDropdown: false,
    payloadSearch: ''
  };
  if (!abilityToEdit.value.executors) abilityToEdit.value.executors = [baseExecutor];
  else abilityToEdit.value.executors.push(baseExecutor);
}
function setAbilityToEdit() {
  console.info(
    '[Ability.vue] setAbilityToEdit() with props.ability:',
    JSON.stringify(props.ability ?? null, null, 2)
  );

  // HARD GUARD: abilities view may mount with no selected ability
  if (!props.ability) {
    abilityToEdit.value = {
      requirements: [],
      executors: [],
      metadata: {}
    };
    return;
  }

  const cloned = cloneDeep(props.ability) || {};

  cloned.requirements = Array.isArray(cloned.requirements) ? cloned.requirements : [];
  cloned.executors = Array.isArray(cloned.executors) ? cloned.executors : [];
  cloned.metadata = cloned.metadata || {};

  for (const executor of cloned.executors) {
    executor.showPayloadDropdown ??= false;
    executor.payloadSearch ??= '';
    executor.payloads = Array.isArray(executor.payloads) ? executor.payloads : [];
    executor.cleanup = Array.isArray(executor.cleanup) ? executor.cleanup : [];
    executor.parsers = Array.isArray(executor.parsers) ? executor.parsers : [];
  }

  abilityToEdit.value = cloned;
  initializeUserFacts();
}
function initializeUserFacts() {
  if (!abilityToEdit.value.executors) return;

  const executorFacts = abilityToEdit.value.metadata?.executor_facts || {};
  console.info('[Ability.vue] initializeUserFacts() → executor_facts:', JSON.stringify(executorFacts, null, 2));
  console.info('[Ability.vue] executors:', JSON.stringify(abilityToEdit.value.executors, null, 2));

  for (const [index, executor] of abilityToEdit.value.executors.entries()) {
    console.info(`[Ability.vue] Initializing user facts for executor ${index}:`, executor);
    const key = getExecutorKey(executor, index);
    let savedFacts = executorFacts[key] || [];
    if (!savedFacts.length && executorFacts[executor.platform]?.length) {
      console.info(`[Ability.vue] No facts found for ${key}, falling back to platform key: ${executor.platform}`);
      savedFacts = executorFacts[executor.platform];
    }

    if (!userFactsMap[key]) userFactsMap[key] = [];

    // Merge saved values by trait
    const existing = userFactsMap[key];
    for (const saved of savedFacts) {
      const idx = existing.findIndex(f => f.trait === saved.trait);
      if (idx >= 0) {
        existing[idx].value = saved.value;
      } else {
        existing.push({ trait: saved.trait, value: saved.value });
      }
    }
    // Add any missing traits with empty value, but don't overwrite
    const cmdFields = getCommandFields(executor.command || '');
    for (const trait of cmdFields) {
      if (!existing.some(f => f.trait === trait)) {
        existing.push({ trait, value: '' });
      }
    }
  }
    console.info('[Ability.vue] userFactsMap after initialization:', JSON.stringify(userFactsMap, null, 2));
}
function validateAndSaveAbility() {
  // updateInjectedFacts();
  validation.name = abilityToEdit.value.name ? '' : 'Name cannot be empty';
  validation.tactic = abilityToEdit.value.tactic ? '' : 'Tactic cannot be empty';
  validation.techniqueId = abilityToEdit.value.technique_id ? '' : 'Technique ID cannot be empty';
  validation.techniqueName = abilityToEdit.value.technique_name ? '' : 'Technique Name cannot be empty';
  validation.executors = abilityToEdit.value.executors?.length &&
    abilityToEdit.value.executors.every(ex => ex.platform && ex.name && ex.command && ex.timeout >= 0)
    ? '' : 'Executors are invalid or missing.';

  if (Object.values(validation).every(v => !v)) {
    // Build executor_facts structure
    const executorFacts = {};

    (abilityToEdit.value.executors || []).forEach((executor, idx) => {
      const key = getExecutorKey(executor, idx);
      const userFacts = userFactsMap[key]?.filter(f => f.trait && f.value?.trim()) || [];
      if (userFacts.length > 0) {
        executorFacts[key] = userFacts;
      }
    });
    // ✅ Update the local object itself
      abilityToEdit.value.metadata = {
        ...(abilityToEdit.value.metadata || {}),
        executor_facts: executorFacts
      };

    // Emit back to parent
    emit('update', {
      ...cloneDeep(abilityToEdit.value),
      metadata: {
        ...(abilityToEdit.value.metadata || {}),
        executor_facts: executorFacts
      }
    });

    emit('close');
  }
}
async function deleteAbility() {
  await abilityStore.deleteAbility($api, abilityToEdit.value.ability_id);
  emit('close');
}
function getCommandFields(command = '') {
  if (!command) return [];
  return [...new Set([...command.matchAll(/#{(.*?)}/gm)].map(m => m[1]))];
}

function filteredPayloads(searchQuery) {
  const query = searchQuery?.toLowerCase() || '';
  return formattedPayloads.value.filter(p => p.name.toLowerCase().includes(query)).map(p => p.payload_id);
}
function togglePayload(executor, payloadId) {
  const list = executor.payloads;
  const idx = list.indexOf(payloadId);
  if (idx === -1) {
    list.push(payloadId);
  } else {
    list.splice(idx, 1);
  }
}
onMounted(async () => {
  await abilityStore.getAbilities($api);
  await abilityStore.getPayloads($api);
  setAbilityToEdit();
  console.log('Payloads loaded:', payloads.value);
})
watch(
  () => props.ability,
  () => {
    setAbilityToEdit(),
  { immediate: true }
  }
)
</script>

<template>
  <div class="modal" :class="{ 'is-active': props.active }">
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
            :key="index + (abilityToEdit.ability_id || 0)"
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

              <!-- Dropdown trigger -->
              <div class="dropdown"   :class="['executor-payload-dropdown-' + executor.key, { 'is-active': executor.showPayloadDropdown }]" style="width: 100%;">
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

                <!-- Dropdown content -->
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
                <div
                  class="control"
                  v-for="(payload, idx) in executor.payloads"
                  :key="payload"
                >
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
            <!-- Command and Facts -->
            <div class="field mt-5">
              <label class="label">Command</label>
              <CodeEditor v-model="executor.command" language="bash" line-numbers :readonly="true" />
            </div>

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
                  <tr v-for="fact in predefinedFacts" :key="'predef-' + fact.trait">
                    <td><span>{{ fact.trait }}</span></td>
                    <td><span>{{ fact.value }}</span></td>
                  </tr>
                  <tr
                    v-for="fact in userFactsPerExecutor[getExecutorKey(executor, index)].filter(f => !isPredefinedTrait(f.trait))"
                    :key="'user-' + fact.trait"
                  >
                      <td>
                        <span>{{ fact.trait }}</span>
                        <font-awesome-icon
                          icon="fa-exclamation-triangle"
                          class="ml-2 has-text-warning"
                          :class="{ 'is-invisible': !!fact.value }"
                        />
                      </td>
                      <td>
                        <input
                          class="input"
                          v-model="fact.value"
                          placeholder="Enter a custom value"
                        />
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
              <button class="button" type="button" @click="abilityToEdit.requirements.push({ module: '', relationship_match: [{ source: '', edge: '', target: '' }] })">
                <span class="icon"><font-awesome-icon icon="fas fa-plus" /></span>
                <span>Add Requirement</span>
              </button>
            </div>

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
              <button class="button" type="button" @click="executor.parsers.push({ module: '', parserconfigs: [{ source: '', edge: '', target: '' }] })">
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
              <button class="button is-danger is-outlined" v-if="!props.creating" @click="deleteAbility">
                <span class="icon">
                  <font-awesome-icon icon="fas fa-trash" />
                </span>
                <span>Delete</span>
              </button>
            </div>
            <div class="is-flex">
              <button class="button" @click="emit('close')">Cancel</button>
              <button class="button is-primary" @click="validateAndSaveAbility">
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
