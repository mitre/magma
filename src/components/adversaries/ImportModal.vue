<template>
  <div class="modal is-active">
    <div class="modal-background" @click="$emit('close')"></div>
    <div class="modal-content" style="max-width: 600px;">
      <div class="box">
        <h3 class="title is-5">Import Adversary</h3>
        <p class="mb-4">Import an adversary in YAML format. Export any existing adversary to see the required format.</p>

        <div class="is-flex is-align-items-center mb-5">
          <div class="file has-name is-fullwidth mr-3">
            <label class="file-label">
              <input
                class="file-input"
                type="file"
                accept=".yml,.yaml"
                @change="handleFileImport"
              />
              <span class="file-cta">
                <span class="file-icon">
                  <font-awesome-icon icon="fas fa-upload" />
                </span>
                <span class="file-label">Choose a file...</span>
              </span>
              <span class="file-name">{{ selectedFileName }}</span>
            </label>
          </div>

          <button class="button is-primary is-bold" :disabled="!selectedFileName" @click="triggerImport">
            <span class="icon">
              <font-awesome-icon icon="fas fa-file-import" />
            </span>
            <span>Import</span>
          </button>
        </div>
      </div>
    </div>
    <button class="modal-close is-large" @click="$emit('close')"></button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import yaml from 'js-yaml';
import { toast } from 'bulma-toast';

const emit = defineEmits(["close", "imported"]);

const selectedFile = ref(null);
const selectedFileName = ref("");

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedFile.value = file;
  selectedFileName.value = file.name;
}

function triggerImport() {
  if (!selectedFile.value) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      const parsed = yaml.load(content);
      emit("imported", parsed);
      emit("close");
    } catch (err) {
      console.error("YAML parse error:", err);
      toast({
        message: "Invalid YAML file.",
        type: "is-danger",
        duration: 3000,
        position: "bottom-right",
      });
    }
  };
  reader.readAsText(selectedFile.value);
}
</script>
