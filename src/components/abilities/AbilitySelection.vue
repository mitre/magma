<script setup>
import { ref, reactive, computed } from 'vue';
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useAbilityStore } from "../../stores/abilityStore";
import { storeToRefs } from "pinia";
import CreateEditAbility from "../abilities/CreateEditAbility.vue";
import AutoSuggest from "../core/AutoSuggest.vue";

const emit = defineEmits(['select']);

const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const abilityStore = useAbilityStore();
const { abilities, tactics, techniqueIds, techniqueNames } = storeToRefs(abilityStore);

let filters = reactive({
    searchQuery: "",
    tactic: "",
    techniqueId: "",
    techniqueName: ""
});
let showFilters = ref(false);
let showCreateAbilityModal = ref(false);

const filteredAbilities = computed(() => {
    return abilities.value.filter((ability) => (
        ability.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        ability.tactic.toLowerCase().includes(filters.tactic.toLowerCase()) &&
        ability.technique_id.toLowerCase().includes(filters.techniqueId.toLowerCase()) &&
        ability.technique_name.toLowerCase().includes(filters.techniqueName.toLowerCase())
    ));
});

const hasFiltersApplied = computed(() => {
    return filters.searchQuery || filters.tactic || filters.techniqueId || filters.techniqueName;
});

function clearFilters() {
    filters.searchQuery = "";
    filters.tactic = "";
    filters.techniqueId = "";
    filters.techniqueName = "";
}

function createAbility() {
    showCreateAbilityModal.value = true;
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.abilities.showAbilitySelection }")
    .modal-background(@click="modals.abilities.showAbilitySelection = false")
    .modal-card 
        header.modal-card-head 
            p.modal-card-title Select Ability
        .modal-card-body 
            form
                .field
                    .control.has-icons-left
                        input.input(v-model="filters.searchQuery" type="text" placeholder="Search for an ability...")
                        span.icon.is-left
                            font-awesome-icon(icon="fas fa-search")
                .field(v-if="showFilters")
                    label.label Tactic
                    .control
                        AutoSuggest(v-model="filters.tactic" :items="tactics" placeholder="Tactic")
                .field(v-if="showFilters")
                    label.label Technique ID
                    .control
                        AutoSuggest(v-model="filters.techniqueId" :items="techniqueIds" placeholder="Technique ID")
                .field(v-if="showFilters")
                    label.label Technique Name
                    .control
                        AutoSuggest(v-model="filters.techniqueName" :items="techniqueNames" placeholder="Technique Name")
            .is-flex.is-justify-content-space-between.mt-2
                a(@click="showFilters = !showFilters") {{ showFilters ? "Hide" : "Show" }} filters
                a(v-if="hasFiltersApplied" @click="clearFilters()") Clear filters
            hr.mt-3
            .card.p-3.mb-2.pointer(v-for="ability in filteredAbilities" @click="emit('select', ability)")
                .is-flex.is-justify-content-space-between.is-align-items-center
                    span.tag.is-small {{ ability.tactic }} 
                    p.help.mt-0 {{ ability.technique_id }} - {{ ability.technique_name }}
                p.mt-1 {{ ability.name }}
                p.help {{ ability.description }}
        footer.modal-card-foot.is-flex.is-justify-content-space-between
            button.button(@click="createAbility()")
                span.icon
                    font-awesome-icon(icon="fas fa-plus")
                span Create an Ability
            button.button(@click="modals.abilities.showAbilitySelection = false") Close

//- Modals
CreateEditAbility(:ability="{}" :active="showCreateAbilityModal" :creating="true" @close="showCreateAbilityModal = false")
</template>

<style scoped>
.card {
    border: 1px solid transparent;
    user-select: none;
}
.card:hover {
    border: 1px solid white;
}

.modal-card {
    width: 800px;
}
</style> 
    