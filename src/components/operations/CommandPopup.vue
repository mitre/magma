<script setup>
import { inject, ref, computed } from "vue";

import { useOperationStore } from '@/stores/operationStore';
import { b64DecodeUnicode } from "@/utils/utils";

const props = defineProps({
    link: Object
});

const $api = inject("$api");

const operationStore = useOperationStore();

let editableCommand = ref();

const command = computed(() => {
    return b64DecodeUnicode(props.link.command);
});
const plaintextCommand = computed(() => {
    return b64DecodeUnicode(props.link.plaintext_command);
});
const isCommandObfuscated = computed(() => {
    return command.value !== plaintextCommand.value;
});

function isLinkEditable(currentLink) {
    if (!currentLink) return false;
    editableCommand.value = props.link.command;
    // Link can only be editable if operation is running, and if link is paused, queued, or completed
    return operationStore.isOperationRunning() && ((currentLink.status === -1) && !(currentLink.finish.length > 0 || currentLink.output === 'True'));
}
</script>

<template lang="pug">
section(v-if="isLinkEditable(props.link)")
    p.is-size-5 Edit Command:
    textarea.input(v-model="editableCommand")
.box.p-0.mb-2(v-else)
    div(v-if="isCommandObfuscated")
        label.label Obfuscated
        pre.m-0.pt-2.pb-2 {{ command }}
        label.label.mt-2 Plaintext
        pre.m-0.pt-2.pb-2 {{ plaintextCommand }}
    pre.m-0.pt-2.pb-2(v-else) {{ command }}
    
.buttons
    button.button.is-primary(v-if="isLinkEditable(props.link)" @click="operationStore.updateLink($api, -3, editableCommand)") Approve
    button.button.is-danger.ml-auto(v-if="isLinkEditable(props.link)" @click="operationStore.updateLink($api, -2)") Discard 
</template>
