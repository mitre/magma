<script setup>
import { computed } from "vue";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { storeToRefs } from "pinia";

const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const props = defineProps({
  abilities: {
    type: Array,
    required: true
  },
  selectedSource: {
    type: [Object, null],
    required: false,
    default: null
  }
});

function isTraitSatisfied(ability, executor, trait) {
  const facts = ability?.metadata?.executor_facts?.[executor.platform] || [];
  return facts.some(f => f.trait === trait && String(f.value).trim());
}


const breakdown = computed(() => {
  if (!props.abilities || !props.selectedSource) {
    return { sourceFacts: [], requiredFacts: [] };
  }

  const source = props.selectedSource?.value ?? props.selectedSource;

  /* ───────────── Source facts ───────────── */

  const factsByTrait = {};
  source?.facts?.forEach(f => {
    if (!f?.trait) return;
    factsByTrait[f.trait] ??= [];
    factsByTrait[f.trait].push(f.value);
  });

  const sourceFactMap = new Map();
  Object.entries(factsByTrait).forEach(([trait, values]) => {
    sourceFactMap.set(trait, {
      trait,
      values,
      usage: []
    });
  });

  /* ───────────── Required-only facts ───────────── */

  const requiredFactMap = new Map();

  props.abilities.forEach((ability, idx) => {
    const order = idx + 1;

    ability?.executors?.forEach(exec => {
      const cmd = exec?.command || "";
      const traits = [...cmd.matchAll(/#\{([^}]+)\}/g)].map(m => m[1]);

      traits.forEach(trait => {
        const targetMap = sourceFactMap.has(trait)
          ? sourceFactMap
          : requiredFactMap;

        if (!targetMap.has(trait)) {
          targetMap.set(trait, {
            trait,
            values: sourceFactMap.has(trait) ? factsByTrait[trait] : [],
            usage: []
          });
        }

        const entry = targetMap.get(trait);

        let usageRow = entry.usage.find(
          u => u.order === order && u.ability === ability.name
        );

        if (!usageRow) {
          usageRow = {
            order,
            ability: ability.name,
            abilityRef: ability,
            executors: []
          };
          entry.usage.push(usageRow);
        }
        const execKey = `${exec.platform}::${exec.name}`;
        if (!usageRow._executorKeys) {
            usageRow._executorKeys = new Set();
            }

        if (!usageRow._executorKeys.has(execKey)) {
            usageRow._executorKeys.add(execKey);
            usageRow.executors.push({
                platform: exec.platform,
                name: exec.name
        });
        }
      });
    });
  });

  return {
    sourceFacts: Array.from(sourceFactMap.values()),
    requiredFacts: Array.from(requiredFactMap.values())
  };
});
</script>
<style scoped>
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

/* Overlay icons — MATCH DetailsTable */
.needs-input-icon {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.7rem;
  color: #f2b705;
  z-index: 3;
  pointer-events: none;
}
.fact-source-values {
  color: #a77dff;
  font-weight: 500;
}

</style>
<template>
  <div
    class="modal"
    :class="{ 'is-active': modals.adversaries.showFactBreakdown }"
  >
    <div
      class="modal-background"
      @click="modals.adversaries.showFactBreakdown = false"
    ></div>

    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Fact Breakdown</p>
      </header>

      <section class="modal-card-body">

        <!-- ───────────── Fact Source Facts ───────────── -->
        <div v-if="breakdown.sourceFacts.length">
            <h3 class="title is-5 mb-4">Fact Source Facts</h3>

            <div
            class="fact-block mb-6"
            v-for="fact in breakdown.sourceFacts"
            :key="fact.trait"
            >
            <!-- Fact header -->
            <h4 class="title is-6 mb-1">
                {{ fact.trait }}
            </h4>

            <p class="has-text-grey mb-3">
                Value:
                <span class="fact-source-values">
                    {{ fact.values.join(', ') || '—' }}
                </span>

            </p>

            <!-- Usage table -->
            <table class="table is-narrow is-fullwidth">
                <thead>
                <tr>
                    <th style="width: 80px;">Order #</th>
                    <th>Ability</th>
                    <th style="width: 220px;">Executors</th>
                </tr>
                </thead>

                <tbody>
                <tr
                    v-for="use in fact.usage"
                    :key="`${use.order}-${use.ability}`"
                >
                    <td>{{ use.order }}</td>
                    <td>{{ use.ability }}</td>

                    <!-- Executors grouped -->
                    <td>
                    <span
                        v-for="exec in use.executors"
                        :key="`${exec.platform}-${exec.name}`"
                        class="icon-wrapper mr-1">
                        <font-awesome-icon
                        class="executor-icon"
                        :icon="
                            exec.platform.includes('windows')
                            ? 'fab fa-windows'
                            : exec.platform.includes('darwin')
                            ? 'fab fa-apple'
                            : 'fab fa-linux'
                        "
                        v-tooltip="`${exec.platform} / ${exec.name}`"
                        />
                    </span>
                    </td>
                </tr>

                <!-- Empty usage row -->
                <tr v-if="!fact.usage.length">
                    <td colspan="3" class="has-text-grey has-text-centered">
                    Not used by any ability yet
                    </td>
                </tr>
                </tbody>
            </table>

            <hr />
            </div>
        </div>

        <!-- ───────────── Required (User-Defined) Facts ───────────── -->
        <div v-if="breakdown.requiredFacts.length" class="mt-6">
            <h3 class="title is-5 mb-4">
            Required Facts (Not in Fact Source)
            </h3>

            <div
            class="fact-block mb-6"
            v-for="fact in breakdown.requiredFacts"
            :key="fact.trait"
            >
            <h4 class="title is-6 mb-1">
                {{ fact.trait }}
            </h4>

            <table class="table is-narrow is-fullwidth">
                <thead>
                <tr>
                    <th style="width: 80px;">Order #</th>
                    <th>Ability</th>
                    <th style="width: 220px;">Executors</th>
                </tr>
                </thead>

                <tbody>
                <tr
                    v-for="use in fact.usage"
                    :key="`${use.order}-${use.ability}`"
                >
                    <td>{{ use.order }}</td>
                    <td>{{ use.ability }}</td>

                    <td>
                        <span
                            v-for="exec in use.executors"
                            :key="`${exec.platform}-${exec.name}`"
                            class="icon-wrapper mr-1"
                            >
                            <!-- Platform icon -->
                            <font-awesome-icon
                                :icon="
                                exec.platform.includes('windows')
                                    ? 'fab fa-windows'
                                    : exec.platform.includes('darwin')
                                    ? 'fab fa-apple'
                                    : 'fab fa-linux'
                                "
                                class="executor-icon"
                                v-tooltip="`${exec.platform} / ${exec.name}`"
                            />

                            <!-- Required but unsatisfied -->
                            <font-awesome-icon
                                v-if="!isTraitSatisfied(use.abilityRef, exec, fact.trait)"
                                icon="fas fa-exclamation-triangle"
                                class="needs-input-icon"
                                v-tooltip="'Required fact has no values in selected fact source'"
                            />
                        </span>

                    </td>
                </tr>
                </tbody>
            </table>

            <hr />
            </div>
        </div>

        <!-- ───────────── Empty State ───────────── -->
        <p
            v-if="!breakdown.sourceFacts.length && !breakdown.requiredFacts.length"
            class="has-text-centered has-text-grey"
        >
            No facts found in selected fact source
        </p>

        </section>

      <footer class="modal-card-foot is-flex is-justify-content-flex-end">
        <button
          class="button"
          @click="modals.adversaries.showFactBreakdown = false"
        >
          Close
        </button>
      </footer>
    </div>
  </div>
</template>
