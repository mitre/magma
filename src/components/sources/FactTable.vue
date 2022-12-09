<script setup>
import { ref, inject } from "vue";
import { storeToRefs } from "pinia";

import AbilitySelection from "@/components/abilities/AbilitySelection.vue";
import AddAbilitiesFromAdversaryModal from "@/components/adversaries/AddAbilitiesFromAdversaryModal.vue";
import { useSourceStore } from "@/stores/sourceStore.js";
import { getAbilityFacts } from "@/utils/abilityUtil.js";

const $api = inject("$api");

const sourceStore = useSourceStore();
const { selectedSource } = storeToRefs(sourceStore);

let factIndexToEdit = ref(-1);
let showAbilitySelection = ref(false);
let showAddFromAdversary = ref(false);

function addFact() {
    selectedSource.value.facts.push({
        trait: "",
        value: "",
        score: 0
    });
    factIndexToEdit.value = selectedSource.value.facts.length - 1;
}

function removeFact(factIndex) {
    selectedSource.value.facts.splice(factIndex, 1);
    saveFacts();
}

async function saveFacts() {
    factIndexToEdit.value = -1;
    await sourceStore.saveSource($api);
}

async function addFromAbility(ability) {
    const abilityFacts = getAbilityFacts(ability);
    if (!abilityFacts.length) {
        // TODO: Notify user that ability had no facts to add
        showAbilitySelection.value = false;
        return;
    }

    abilityFacts.forEach((fact) => {
        selectedSource.value.facts.push({
            trait: fact,
            value: "",
            score: 0
        });
    });
    showAbilitySelection.value = false;
    await sourceStore.saveSource($api);
}

async function addFromAdversary(abilities) {
    abilities.forEach((ability) => addFromAbility(ability));
    showAddFromAdversary.value = false;
}
</script>

<template lang="pug">
.buttons.m-0
    button.button(@click="addFact()")
        span.icon
            font-awesome-icon(icon="fas fa-plus")
        span Add Fact
    button.button(@click="showAbilitySelection = true")
        span.icon
            font-awesome-icon(icon="fas fa-plus")
        span Add Facts from Ability
    button.button(@click="showAddFromAdversary = true")
        span.icon
            font-awesome-icon(icon="fas fa-plus")
        span Add Facts from Adversary

table.table.is-striped.is-fullwidth
    colgroup(width="30%")
    colgroup(width="30%")
    colgroup(width="20%")
    colgroup(width="20%")
    thead
        tr
            th Fact Trait
            th Fact Value
            th Score
            th
    tbody
        tr(v-for="(fact, index) of selectedSource.facts")
            td 
                input.input(v-if="factIndexToEdit === index" v-model="fact.trait" placeholder="Fact trait")
                span(v-else) {{ fact.trait || "---" }}
            td 
                input.input(v-if="factIndexToEdit === index" v-model="fact.value" placeholder="Fact value")
                span(v-else) {{ fact.value || "---" }}
            td 
                input.input(v-if="factIndexToEdit === index" v-model="fact.score" placeholder="Fact score")
                span(v-else) {{ fact.score }}
            td
                .buttons
                    button.button.is-primary(
                            v-if="factIndexToEdit === index" @click="saveFacts()"
                            :disabled="!fact.trait || !fact.value || fact.score === ''"
                            )
                        span.icon
                            font-awesome-icon(icon="fa-save")
                    button.button(v-else @click="factIndexToEdit = index")
                        span.icon
                            font-awesome-icon(icon="fa-pencil-alt")
                    button.button.is-danger.is-outlined(@click="removeFact(index)")
                        span.icon
                            font-awesome-icon(icon="fa-trash")

//- Modals
AbilitySelection(:active="showAbilitySelection" @select="addFromAbility" @close="showAbilitySelection = false" :canCreate="false")
AddAbilitiesFromAdversaryModal(:active="showAddFromAdversary" @select="addFromAdversary" @close="showAddFromAdversary = false")

</template>
