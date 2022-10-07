<script setup>
import { ref, computed } from "vue";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useAdversaryStore } from "../../stores/adversaryStore";
import { useAbilityStore } from "../../stores/abilityStore";
import { storeToRefs } from "pinia";

const adversaryStore = useAdversaryStore();
const { adversaries, selectedAdversaryAbilities } = storeToRefs(adversaryStore);
const abilityStore = useAbilityStore();
const { abilities } = storeToRefs(abilityStore);
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const adversaryId = ref("");
const adversaryAbilities = ref([]);

const abilitiesToAdd = computed(() => adversaryAbilities.value.filter((ability) => ability.selected));

function getAdversaryAbilities() {
    adversaryAbilities.value = adversaries.value
        .find((adversary) => adversary.adversary_id === adversaryId.value)
        .atomic_ordering
        .map((abilityId) => ({
            ...abilities.value.find((ability) => ability.ability_id === abilityId),
            selected: true
        }));
}

function addAbilities() {
    selectedAdversaryAbilities.value = selectedAdversaryAbilities.value.concat(abilitiesToAdd.value);
    modals.value.adversaries.showAddFromAdversary = false;
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.adversaries.showAddFromAdversary }")
    .modal-background(@click="modals.adversaries.showAddFromAdversary = false")
    .modal-card 
        header.modal-card-head 
            p.modal-card-title Add Abilities from Adversary
        .modal-card-body 
            form
                .field
                    label.label Select an adversary
                    .control
                        .select
                            select(v-model="adversaryId" @change="getAdversaryAbilities()")
                                option(disabled value="") Select one...
                                option(v-for="adversary in adversaries" :value="adversary.adversary_id") {{ adversary.name }} 
            div(v-if="adversaryId")
                .control.mt-4
                    a(@click="adversaryAbilities.forEach((ability) => ability.selected = true)") Select All
                    | &nbsp;&nbsp;/&nbsp;&nbsp;
                    a(@click="adversaryAbilities.forEach((ability) => ability.selected = false)") Unselect All
                .is-flex.is-flex-direction-column
                    label.checkbox(v-for="ability in adversaryAbilities")
                        input.mr-2(type="checkbox" v-model="ability.selected")
                        strong.mr-3 {{ ability.name }}
                        span.mr-3 {{ ability.tactic }}
        footer.modal-card-foot.is-flex.is-justify-content-flex-end 
            button.button(@click="modals.adversaries.showAddFromAdversary = false") Close
            button.button.is-primary(@click="addAbilities()")
                span.icon
                    font-awesome-icon(icon="fas fa-plus")
                span Add {{ abilitiesToAdd.length }} Abilities
</template>
    