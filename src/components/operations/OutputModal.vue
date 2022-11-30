<script setup>
import { inject } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useOperationStore } from '../../stores/operationStore';
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showOutput }")
    .modal-background(@click="modals.operations.showOutput = false")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Output
        .modal-card-body
            template(v-if="operationStore.selectedLinkAttrs.facts")
                p.is-size-5 Facts:
                .box.p-0
                    pre.m-0.pt-2.pb-2
                        table.table.is-fullwidth
                            thead
                                tr
                                    th Name
                                    th Value
                                    th Score
                            tbody
                                tr(v-for="(fact, idx) in operationStore.selectedLinkAttrs.facts" :key="fact")
                                    td {{ fact.name }}
                                    td {{ fact.value }}
                                    td {{ fact.score }}
            span.is-size-5 Standard Output:
            template(v-if="operationStore.selectedLinkAttrs")
                .box.p-0 
                    pre.m-0.pt-2.pb-2 {{ operationStore.selectedLinkAttrs.results }}
            span.is-size-5(v-else) {{ ` Nothing to show` }}
            span.is-size-5 Standard Error:
            template(v-if="operationStore.selectedLinkAttrs.stderr")
                .box.p-0 
                    pre.m-0.pt-2.pb-2 {{ operationStore.selectedLinkAttrs.results.stderr }}
            span.is-size-5(v-else) {{ ` Nothing to show` }}
            
        footer.modal-card-foot 
            button.button(@click="modals.operations.showOutput = false") Close    
</template>

<style scoped>
.modal-card {
    width: 550px;
}
</style>
