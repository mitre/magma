<script setup>
import { ref, inject, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useOperationStore } from '../../stores/operationStore';
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showDetails }")
    .modal-background(@click="modals.operations.showDetails = false")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Operation Details
        .modal-card-body(v-if="operationStore.selectedOperation")
            table.table
                tbody
                    tr
                        th Operation Details
                        td {{`${operationStore.selectedOperation.name}`}}
                    tr
                        th Adversary
                        td {{`${operationStore.selectedOperation.adversary.name}`}}
                    tr
                        th Fact Source
                        td {{`${operationStore.selectedOperation.source.name}`}}
                    tr
                        th Group
                        td {{operationStore.selectedOperation.autonomous ? "all" : "red"}}
                    tr
                        th Planner
                        td {{`${operationStore.selectedOperation.planner.name}`}}
                    tr
                        th Obfuscator
                        td {{`${operationStore.selectedOperation.obfuscator}`}}
                    tr
                        th Autonomous
                        td {{operationStore.selectedOperation.autonomous ? "autonomous" : "manual"}}
                    tr
                        th Parser
                        td {{`${operationStore.selectedOperation.use_learning_parsers}`}}
                    tr
                        th Auto Close
                        td {{`${operationStore.selectedOperation.auto_close}`}}
                    tr
                        th Jitter
                        td {{`${operationStore.selectedOperation.jitter}`}}
        footer.modal-card-foot 
            button.button(@click="modals.operations.showDetails = false") Close 
            
</template>

<style scoped>
.modal-card {
    width: 600px;
}
.table{
    background-color: inherit !important;
}

</style>
