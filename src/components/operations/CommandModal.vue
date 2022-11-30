<script setup>
import { inject, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { useOperationStore } from '../../stores/operationStore';
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
const operationStore = useOperationStore();
let editableCommand = ref();

function isLinkEditable(currentLink) {
    if (!currentLink) return false;
    editableCommand.value = operationStore.selectedLinkAttrs.command;
    // Link can only be editable if operation is running, and if link is paused, queued, or completed
    return operationStore.isOperationRunning() && ((currentLink.status === -1) && !(currentLink.finish.length > 0 || currentLink.output === 'True'));
}

</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showCommand }")
    .modal-background(@click="modals.operations.showCommand = false")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Command
        .modal-card-body
            section(v-if="isLinkEditable(operationStore.selectedLink)")
                p.is-size-5 Edit Command:
                textarea.input(v-model="editableCommand")
            .box.p-0(v-else)
                pre.m-0.pt-2.pb-2(
                    v-if="!operationStore.selectedLinkAttrs.plainTextCommand || operationStore.selectedLinkAttrs.plainTextCommand === operationStore.selectedLinkAttrs.command"
                ) {{ operationStore.selectedLinkAttrs.command }}
                template(v-else-if="operationStore.selectedLinkAttrs.plainTextCommand && operationStore.selectedLinkAttrs.plainTextCommand !== operationStore.selectedLinkAttrs.command")
                    p.is-size-5 Obfuscated:
                    pre.m-0.pt-2.pb-2 {{ operationStore.selectedLinkAttrs.command }}
                    p.is-size-5 Plaintext:
                    pre.m-0.pt-2.pb-2 {{ operationStore.selectedLinkAttrs.plainTextCommand }}
        footer.modal-card-foot.is-flex
            button.button.is-primary(v-if="isLinkEditable(operationStore.selectedLink)" @click="operationStore.updateLink($api, -3, editableCommand)") Approve
            button.button(@click="modals.operations.showCommand = false") Close
            button.button.is-danger.ml-auto(v-if="isLinkEditable(operationStore.selectedLink)" @click="operationStore.updateLink($api, -2)") Discard
</template>

<style scoped>
.modal-card {
    width: 550px;
}
</style>
