<script setup>
import { inject } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useOperationStore } from '../../stores/operationStore';
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();

async function deleteOperation() {
    await operationStore.deleteOperation($api, operationStore.selectedOperation.id);
    modals.value.operations.showDelete = false;
}

</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showDelete }")
    .modal-background(@click="modals.operations.showDelete = false")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Delete Operation?
        .modal-card-body Are you sure you want to delete this operation?
        footer.modal-card-foot 
            button.button.is-danger(@click="deleteOperation()") Delete
            button.button(@click="modals.operations.showDelete = false") Cancel 
            
</template>

<style scoped>
.modal-card {
    width: 550px;
}
</style>
