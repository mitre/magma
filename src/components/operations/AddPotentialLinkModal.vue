 <script setup>
import { inject, ref, onMounted, reactive, computed, toRaw } from "vue";
import { storeToRefs } from "pinia";

import CodeEditor from "@/components/core/CodeEditor.vue";
import { useOperationStore } from '@/stores/operationStore';
import { useAgentStore } from "@/stores/agentStore";
import { useAbilityStore } from "@/stores/abilityStore";
import { useSourceStore } from "@/stores/sourceStore";

const props = defineProps({ 
    active: Boolean,
    operation: Object,
    agent: Object
});
const emit = defineEmits(['select', 'close']);

const $api = inject("$api");

const operationStore = useOperationStore();
const agentStore = useAgentStore();
const abilityStore = useAbilityStore();
const sourceStore = useSourceStore();
const { sources } = storeToRefs(sourceStore);

let selectedPotentialLink = ref({});
let selectedPotentialLinkFacts = ref({});
let potentialLinkCommand = ref("");
let potentialLinkFields = ref([]);
let filters = reactive({
    searchQuery: "",
    tactic: "",
    technique: "",
    executor: "",
    agent: ""
});

const filteredAbilities = computed(() => {
    return abilityStore.abilities.filter((ability) => (
        (ability.name.toLowerCase().includes(filters.searchQuery.toLowerCase()))
        && (!filters.tactic || ability.tactic === filters.tactic)
        && (!filters.technique || `${ability.technique_id} | ${ability.technique_name}` === filters.technique)
        && (!filters.executor || ability.executors.some((ex) => ex.platform === filters.agent.platform && filters.executor === ex.name))
    ));
});

const potentialLinksToAdd = computed(() => {
    let links = [];    
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
    Object.keys(selectedPotentialLinkFacts.value).forEach((factName) => {
        combinations.push(selectedPotentialLinkFacts.value[factName].facts.filter((fact) => fact.selected).map((fact) => `${factName}|${fact.value}`));
        if (selectedPotentialLinkFacts.value[factName].customValue) {
            combinations[0].push(`${factName}|${selectedPotentialLinkFacts.value[factName].customValue}`);
        }
    });
    combinations = cartesian(combinations);

    let executor;
    if (selectedPotentialLink.value.executors) {
        executor = selectedPotentialLink.value.executors.find((e) => filters.executor === e.name);
    }

    if (!combinations.length) {
        links.push({
            ability: selectedPotentialLink.value,
            paw: filters.agent.paw,
            executor: {
                ...executor,
                command: potentialLinkCommand.value
            }
        });
        return links;
    }

    combinations.forEach((factGroup) => {
        let command = potentialLinkCommand.value;
        factGroup.forEach((fact) => {
            let split = fact.split('|');
            command = command.replaceAll(`#{${split[0]}}`, split[1])
        });

        links.push({
            ability: selectedPotentialLink.value,
            paw: filters.agent.paw,
            facts: factGroup.map((fact) => { 
                let split = fact.split('|');
                return { trait: split[0], value: '1' };
            }),
            executor: {
                ...executor,
                command: command
            }
        });
    });

    return links;
});

const canSelectAgent = computed(() => !props.agent || !props.agent.paw);

onMounted(async () => {
    await agentStore.getAgents($api);
    if (agentStore.agents.length > 0 && canSelectAgent) {
        filters.agent = agentStore.agents[0];
        filters.executor = filters.agent.executors[0];
    } else {
        filters.agent = props.agent.paw;
        filters.executor = filters.agent.executors[0];
    }
    await abilityStore.getAbilities($api);
    await sourceStore.getSources($api);
    await operationStore.getFacts($api);
});

function selectPotentialLink(link) {
    selectedPotentialLink.value = link;
    selectedPotentialLinkFacts.value = {};
    if (!selectedPotentialLink.value.ability_id) return;

    let executor = link.executors.find((e) => filters.executor === e.name);
    potentialLinkCommand.value = executor.command;
    potentialLinkFields.value = [...new Set([...executor.command.matchAll(/#{(.*?)}/gm)].map((field) => field[1]))];

    potentialLinkFields.value.forEach((field) => {
        selectedPotentialLinkFacts.value[field] = {
            customValue: "",
            facts: []
        };

        if (props.operation && props.operation.id) {
            const opSource = sources.value.find((s) => s.id === props.operation.source.id);
            const opSourceCollected = sources.value.find((source) => source.name === props.operation.name);
            const facts = (opSource.facts.concat(opSourceCollected ? opSourceCollected.facts : [])).concat(operationStore.facts);
            
            facts.filter((fact) => fact.name === field).forEach((fact) => {
                selectedPotentialLinkFacts.value[field].facts.push({
                    value: fact.value,
                    origin: fact.origin_type,
                    selected: false
                });
            });
        }
    });

    if (props.operation && props.operation.state === "paused") {
        // TODO: let user know operation is paused and new link might not be added
    }
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': props.active }")
    .modal-background(@click="emit('close')")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Add Potential Links
        .modal-card-body(v-if="!selectedPotentialLink.name")
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Agent
                .field-body
                    .field
                        .control(v-if="canSelectAgent")
                            .select.is-fullwidth
                                select(v-model="filters.agent")
                                    option(disabled default value="") Select an agent
                                    option(v-for="agent in agentStore.agents" :key="agent.paw" :value="agent") {{ agent.display_name }} - {{ agent.paw }}
                        .control(v-else)
                            p.pt-2 {{ props.agent.display_name }} - {{ props.agent.paw }}
            .field.is-horizontal
                .field-label.is-normal 
                    label.label Executor
                .field-body
                    .field
                        .control
                            .select.is-fullwidth
                                select(v-model="filters.executor")
                                    option(disabled default value="") Select an executor
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
            .is-flex.is-justify-content-space-between.content
                h3 Select a potential link
                h3.m-0 {{ `${filteredAbilities.length} available links` }}
            .is-flex.is-flex-wrap-wrap.is-align-content-flex-start
                .box.mb-2.mr-2.p-3.ability(v-for="ability in filteredAbilities" @click="selectPotentialLink(ability)")
                    .is-flex.is-justify-content-space-between.is-align-items-center.mb-1
                        .is-flex
                            span.tag.is-small.mr-3 {{ ability.tactic }} 
                        p.help.mt-0 {{ ability.technique_id }} - {{ ability.technique_name }}
                    strong {{ ability.name }}
                    p.help.mb-0 {{ ability.description }}
        .modal-card-body(v-else)
            .content
                .is-flex.is-align-items-end.mb-2
                    h1.m-0 {{ `${selectedPotentialLink.name}` }}
                    p.ml-4 {{ ` ${selectedPotentialLink.technique_id} - ${selectedPotentialLink.technique_name}` }}
                p {{ `${selectedPotentialLink.description}` }}
            hr

            label.label.has-text-centered.mt-3 Link Command 
            CodeEditor(v-model="potentialLinkCommand" language="bash" line-numbers)
            p.help Editing the fact templates (<code>\#{...}</code>) may result in unexpected behavior.

            div(v-if="potentialLinkFields.length") 
                label.label.has-text-centered Fact Templates
                p.mb-2 This link needs facts in order to run properly. Select at least one value for each fact, and/or add a custom value.
                .block(v-for="factName in Object.keys(selectedPotentialLinkFacts)")
                    span.icon-text 
                        label.label.mb-0 {{ factName }}
                        span.icon.has-text-warning(
                            v-if="selectedPotentialLinkFacts[factName].facts.every((fact) => !fact.selected) && !selectedPotentialLinkFacts[factName].customValue"
                            v-tooltip="`There are currently empty fact templates. You can still add this link but it may not run properly.`")
                            font-awesome-icon(icon="fa-exclamation-triangle")
                    .control
                        input.input(v-model="selectedPotentialLinkFacts[factName].customValue" type="text" placeholder="Enter a custom value")
                    div(v-for="fact in selectedPotentialLinkFacts[factName].facts")
                        label.checkbox
                            input.mr-2(type="checkbox" v-model="fact.selected")
                            span.mr-2 {{ fact.value }}
                            span.tag.mr-2 {{ fact.origin }}
    
        footer.modal-card-foot
            button.button(@click="emit('close')") Cancel 
            button.button(v-if="selectedPotentialLink" @click="selectedPotentialLink = ''") Back
            button.button.is-primary.ml-auto(@click="emit('select', potentialLinksToAdd)") Add {{ potentialLinksToAdd.length }} Potential Link{{ potentialLinksToAdd.length > 1 ? 's' : '' }}
            
</template>

<style scoped>
.modal-card {
    width: 60%;
}
@media(max-width: 1500px) {
    .box.ability {
        width: 98%;
    }
}
@media(min-width: 1500px) {
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
