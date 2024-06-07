<script setup>
import { ref, inject} from "vue";
import { useAbilityStore } from "../../stores/abilityStore";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
import { storeToRefs } from "pinia";

const $api = inject("$api");

const abilityStore = useAbilityStore();
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);

const fileUploadPlaceholder = "No file selected.";
const fileName = ref(fileUploadPlaceholder);
const isFileSelected = ref(false);
const input = ref(null);

async function updateFileName($event) {
    if ($event.target.files.length > 0) {
        fileName.value = $event.target.files[0].name;
        isFileSelected.value = true;
    } else {
        isFileSelected.value = false;
    }
}

async function submitFile($event) {
    const file = input.value.files[0];
    await abilityStore.savePayload($api, file);

    fileName.value = fileUploadPlaceholder;
    isFileSelected.value = false;
    modals.value.payloads.showUpload = false;
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.payloads.showUpload }")
    .modal-background(@click="modals.payloads.showUpload = false")
    .modal-card
        header.modal-card-head
            p.modal-card-title Upload a payload
        .modal-card-body
            .columns.is-vcentered
                .column
                    .file.has-name.is-fullwidth
                        label.file-label
                            input.file-input(type="file", ref="input", @change="updateFileName")
                            span.file-cta
                                span.file-icon
                                    i.fas.fa-upload
                                span.file-label Choose a file…
                            span.file-name {{ fileName }}
                .column.is-narrow
                    button.button.is-primary(:disabled="!isFileSelected", @click="submitFile($event)") Upload
        footer.modal-card-foot.is-flex.is-justify-content-flex-end
            button.button(@click="modals.payloads.showUpload = false") Close
</template>
