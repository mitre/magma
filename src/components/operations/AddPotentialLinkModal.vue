<script setup>
import { inject, ref, onMounted, reactive, computed, toRaw } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useOperationStore } from '../../stores/operationStore';
import { useAgentStore } from "../../stores/agentStore";
import { useAbilityStore } from "../../stores/abilityStore";
import { useCoreStore } from "../../stores/coreStore";
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();
const agentStore = useAgentStore();
const abilityStore = useAbilityStore();
const coreStore = useCoreStore();
let selectedPotentialLink = ref();
let potentialLinkCommand = ref();
let potentialLinkToAdd = ref();
let filters = reactive({
    searchQuery: "",
    tactic: "",
    technique: "",
    executor: "",
    agent: "",
});

const filteredAbilities = computed(() => {
    return abilityStore.abilities.filter((ability) => (
        (ability.name.toLowerCase().includes(filters.searchQuery.toLowerCase()))
        && (!filters.tactic || ability.tactic === filters.tactic)
        && (!filters.technique || `${ability.technique_id} | ${ability.technique_name}` === filters.technique)
        && (!filters.executor || ability.executors.some((ex) => ex.platform === filters.agent.platform && filters.executor === ex.name))
    ));
});

function closeModal() {
    modals.value.operations.showAddPotentialLink = false;
    selectedPotentialLink.value = "";
}
function selectPotentialLink(link) {
    selectedPotentialLink.value = link;
    let selectedPotentialLinkFacts = {};
    potentialLinkToAdd.value = {};
    if (!selectedPotentialLink.value.ability_id) return;
    let executor = link.executors.find((e) => filters.executor === e.name);
    const fields = [...new Set([...executor.command.matchAll(/#{(.*?)}/gm)].map((field) => field[1]))];
    const opSource = coreStore.sources.find((s) => s.id === operationStore.selectedOperation.source.id);
    const opSourceCollected = coreStore.sources.find((source) => source.name === operationStore.selectedOperation.name);
    const facts = (opSource.facts.concat(opSourceCollected ? opSourceCollected.facts : [])).concat(operationStore.facts);
    potentialLinkCommand.value = executor.command;

    fields.filter((field) => facts.find((fact) => fact.name === field)).forEach((field) => {
        selectedPotentialLinkFacts[field] = []
        facts.filter((fact) => fact.name === field).forEach((fact) => {
            selectedPotentialLinkFacts[field].push({
                value: fact.value,
                origin: fact.origin_type,
                selected: false
            });
        });
    });

    if (operationStore.selectedOperation.state === "paused") {
        // TODO: let user know operation is paused and new link might not be added
    }
    function cartesian(args) {
        if (!args.length) return [];
        let r = [], max = args.length - 1;
        function helper(arr, i) {
            for (let j = 0; j < args[i].length; j++) {
                let a = arr.slice(0);
                a.push(args[i][j]);
                (i === max) ? r.push(a) : helper(a, i + 1);
            }
        }
        helper([], 0);
        return r;
    }

    let combinations = [];
    Object.keys(selectedPotentialLinkFacts).forEach((factName) => {
        combinations.push(selectedPotentialLinkFacts[factName].filter((fact) => fact.selected).map((fact) => `${factName}|${fact.value}`));
    });
    combinations = cartesian(combinations);
    if (selectedPotentialLink.value.executors) {
        executor = selectedPotentialLink.value.executors.find((e) => filters.executor === e.name);
    }

    if (!combinations.length) {
        potentialLinkToAdd.value = {
            ability: selectedPotentialLink.value,
            paw: filters.agent.paw,
            executor: {
                ...executor,
                command: potentialLinkCommand.value
            }
        };
        return;
    }

    combinations.forEach((factGroup) => {
        let command = potentialLinkCommand.value;
        factGroup.forEach((fact) => {
            let split = fact.split('|');
            command = command.replaceAll(`#{${split[0]}}`, split[1])
        });

        potentialLinkToAdd.value = {
            ability: selectedPotentialLink.value,
            paw: filters.agent.paw,
            executor: {
                ...executor,
                command: command
            }
        };
    });
}
async function addPotentialLink() {
    await operationStore.addPotentialLinks($api, toRaw(potentialLinkToAdd.value));
    closeModal();
}

onMounted(async () => {
    await agentStore.getAgents($api);
    if (agentStore.agents.length > 0){
        filters.agent = agentStore.agents[0];
        filters.executor = filters.agent.executors[0];
    }
    await abilityStore.getAbilities($api);
    await coreStore.getSources($api);
    await operationStore.getFacts($api);
});

</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showAddPotentialLink }")
    .modal-background(@click="closeModal()")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Add Potential Links
        .modal-card-body(v-if="!selectedPotentialLink")
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Agent
                .field-body
                    .field
                        .control
                            .select.is-fullwidth
                                select(v-model="filters.agent")
                                    option(v-for="agent in agentStore.agents" :key="agent.paw" :value="agent") {{ `${agent.display_name} - ${agent.paw}` }}
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Executor
                .field-body
                    .field
                        .control
                            .select.is-fullwidth
                                select(v-model="filters.executor")
                                    option(v-if="filters.agent" v-for="executor in filters.agent.executors" :key="executor" :value="executor") {{ executor }}
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Search
                .field-body
                    .field
                        .control.is-expanded
                            input.input(v-model="filters.searchQuery" type="text" placeholder="Search for a link...")
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Tactic
                .field-body
                    .field
                        .control
                            .select.is-fullwidth
                                select(v-model="filters.tactic")
                                    option(default value="") All tactics
                                    option(v-for="tactic in abilityStore.tactics" :key="tactic" :value="tactic") {{ tactic }}
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Technique
                .field-body
                    .field
                        .control
                            .select.is-fullwidth
                                select(v-model="filters.technique")
                                    option(default value="") All techniques
                                    option(v-for="technique in abilityStore.techniques" :key="technique" :value="technique") {{ technique }}
            hr
            .is-flex
                h1.is-size-4 Select a potential link
                h1.is-size-4.ml-auto.mr-5 {{ `${filteredAbilities.length} potential links`}}
            .is-flex.is-flex-wrap-wrap.is-align-content-flex-start
                .box.mb-2.mr-2.p-3.ability(v-for="ability in filteredAbilities" @click="selectPotentialLink(ability)")
                    .is-flex.is-justify-content-space-between.is-align-items-center.mb-1
                        .is-flex
                            span.tag.is-small.mr-3 {{ ability.tactic }} 
                        p.help.mt-0 {{ ability.technique_id }} - {{ ability.technique_name }}
                    strong {{ ability.name }}
                    p.help.mb-0 {{ ability.description }}
        .modal-card-body(v-else)
            span.is-size-3 {{ `${selectedPotentialLink.name}` }}
            span.is-size-5 {{ ` (${selectedPotentialLink.technique_id})` }}
            p.is-size-5 {{ `${selectedPotentialLink.description}` }}
            hr
            h1.is-size-5.has-text-centered.has-text-weight-bold Fact Templates
            p(v-if="Object.keys(selectedPotentialLink).length") This link needs facts in order to run properly. Select one value for each fact to add one potential link, otherwise, select multiple values and a potential link will be added for each possible combination.
            p(v-else) This link has no fact templates.
            h1.is-size-5.has-text-centered.has-text-weight-bold Link Command 
            p You can edit the link's command here. Editing the fact templates (<code>\#{...}</code>) may result in unexpected behavior.
            textarea.input.is-family-monospace(v-model="potentialLinkCommand")
        footer.modal-card-foot
            button.button(@click="closeModal()") Cancel 
            button.button(v-if="selectedPotentialLink" @click="selectedPotentialLink = ''") Back
            button.button.is-primary.ml-auto(@click="addPotentialLink()") Add Potential Link
            
</template>

<style scoped>
.modal-card {
    width: 80%;
}
@media(max-width: 1200px) {
    .box.ability {
        width: 98%;
    }
}
@media(min-width: 1200px) {
    .box.ability {
        width: 49%;
    }
}
textarea{
    min-height: 10vh;
}
.box.ability {
    position: relative;
    cursor: pointer;
    border: 1px solid transparent;
    background-color: #272727;
}
.box.ability:hover {
    border: 1px solid #474747;
}
.abilities {
    overflow-x: hidden;
}
</style>
