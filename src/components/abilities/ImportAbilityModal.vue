<script setup>
import { ref, inject } from "vue";
import { parseAllDocuments } from "yaml";
import { toast } from "bulma-toast";
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
const isImporting = ref(false);
const input = ref(null);

function updateFileName($event) {
    if ($event.target.files.length > 0) {
        fileName.value = $event.target.files[0].name;
        isFileSelected.value = true;
    } else {
        isFileSelected.value = false;
    }
}

function readFileText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Unable to read ability file."));
        reader.readAsText(file);
    });
}

function parseAbilityYaml(fileText) {
    const documents = parseAllDocuments(fileText);
    const errors = documents.flatMap((document) => document.errors);
    if (errors.length) {
        throw new Error(errors[0].message);
    }

    const parsedDocuments = documents
        .map((document) => document.toJSON())
        .filter((document) => document !== null && document !== undefined);
    const entries = parsedDocuments.flatMap((document) => Array.isArray(document) ? document : [document]);
    const abilities = entries.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
    if (!abilities.length || abilities.length !== entries.length) {
        throw new Error("Ability YAML must contain an ability object or a list of ability objects.");
    }
    return abilities;
}

function getErrorMessage(error) {
    const responseData = error.response?.data;
    if (responseData?.error) return responseData.error;
    if (responseData?.details) {
        return typeof responseData.details === "string" ? responseData.details : JSON.stringify(responseData.details);
    }
    return error.message || "Unable to import ability.";
}

function showToast(message, type) {
    toast({
        message,
        position: "bottom-right",
        type,
        dismissible: true,
        pauseOnHover: true,
        duration: 3000,
    });
}

async function submitFile() {
    const file = input.value.files[0];
    isImporting.value = true;
    try {
        const fileText = await readFileText(file);
        const abilities = parseAbilityYaml(fileText);
        for (const ability of abilities) {
            await abilityStore.importAbility($api, ability);
        }
        showToast(`Imported ${abilities.length} ${abilities.length === 1 ? "ability" : "abilities"}.`, "is-success");
        closeModal();
    } catch(error) {
        console.error("Error importing ability.", error);
        showToast(getErrorMessage(error), "is-danger");
    } finally {
        isImporting.value = false;
    }
}

function resetFileInput() {
    fileName.value = fileUploadPlaceholder;
    isFileSelected.value = false;
    if (input.value) {
        input.value.value = "";
    }
}

function closeModal() {
    resetFileInput();
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
            button.button.is-primary(:class="{ 'is-loading': isImporting }" :disabled="!isFileSelected || isImporting", @click="submitFile")
                span.icon
                    font-awesome-icon(icon="fas fa-save")
                span Import
</template>

<style scoped>
.modal-card{
    width: 70%;
}
</style>
