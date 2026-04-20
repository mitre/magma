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
    await abilityStore.uploadAbility($api, file);

    fileName.value = fileUploadPlaceholder;
    isFileSelected.value = false;
    modals.value.abilities.showImport = false;
}

function closeModal() {
    fileName.value = fileUploadPlaceholder;
    isFileSelected.value = false;
    if (input.value) {
        input.value.value = "";
    }
    modals.value.abilities.showImport = false;
}
</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.abilities.showImport }")
    .modal-background(@click="closeModal")
    .modal-card
        header.modal-card-head
            p.modal-card-title Import Ability YAML
        .modal-card-body
            .file.has-name.is-fullwidth
                label.file-label
                    input.file-input(type="file", ref="input", accept=".yml,.yaml", @change="updateFileName")
                    span.file-cta
                        span.file-icon
                            font-awesome-icon(icon="fas fa-upload")
                        span.file-label Choose a file...
                    span.file-name {{ fileName }}
        footer.modal-card-foot.is-flex.is-justify-content-flex-end
            button.button(@click="closeModal") Close
            button.button.is-primary(:disabled="!isFileSelected", @click="submitFile($event)")
                span.icon
                    font-awesome-icon(icon="fas fa-save")
                span Import
</template>

<style scoped>
.modal-card{
    width: 70%;
}
</style>
