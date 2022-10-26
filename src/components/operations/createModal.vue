<script setup>
import { ref, inject, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useCoreDisplayStore } from "../../stores/coreDisplayStore";
const $api = inject("$api");
const coreDisplayStore = useCoreDisplayStore();
const { modals } = storeToRefs(coreDisplayStore);
let adversaries = ref([{name: "testAdversary", id: 0}]);
let selectedAdversary = ref({id: ""})
let sources = ref([{name: "testSource", id: 0}]);
let selectedSource = ref({id: ""})
let selectedGroup = ref(0);
let obfuscators = ref([{name: "testObf1", id: 0}, {name: "testObf2", id: 1}, {name: "testObf3", id: 2}, {name: "testObf4", id: 3}])
let selectedObfuscator = ref(0);
let isAuto = ref(true);
let isDefParser = ref(true);
let isAutoClose = ref(false);
let isPause = ref(false);
let minJitter = ref(2);
let maxJitter = ref(8);
let visibility = ref(50);
onMounted(async () => {
});

</script>

<template lang="pug">
.modal(:class="{ 'is-active': modals.operations.showCreate }")
    .modal-background(@click="modals.operations.showCreate = false")
    .modal-card
        header.modal-card-head 
            p.modal-card-title Start New Operation
        .modal-card-body
            form
                .field
                    input.input(placeholder="Operation Name")
                .field
                    .select 
                        select(v-model="selectedAdversary.id")
                            option(disabled selected value="") Choose an adversary 
                            option(v-for="adversary in adversaries" :key="adversary.id" :value="adversary.id") {{ `${adversary.name}` }}
                .field
                    .select
                        select(v-model="selectedSource.id")
                            option(disabled selected value="") Choose a Fact Source 
                            option(v-for="source in sources" :key="source.id" :value="source.id") {{ `${source.name}` }}
                .field
                    button.button(:class="{ 'is-primary': selectedGroup == 0 }" @click="selectedGroup = 0") All groups
                    button.button.mx-2(:class="{ 'is-primary': selectedGroup == 1 }", @click="selectedGroup = 1") Red
                .field
                    button.button.mr-2(v-for="obf in obfuscators" :key="obf.id" :value="obf.id" :class="{ 'is-primary': selectedObfuscator == obf.id }" @click="selectedObfuscator = obf.id") {{ `${obf.name}` }}
                .field.is-horizontal
                    input.is-checkradio(type="radio" id="auto" :checked="isAuto" @click="isAuto = true")
                    label.label.ml-3.mt-1(for="auto") Run autonomously
                    input.is-checkradio.ml-3(type="radio" id="manual" :checked="!isAuto" @click="isAuto = false")
                    label.label.ml-3.mt-1(for="manual") Require manual approval
                .field.is-horizontal
                    input.is-checkradio(type="radio" id="defaultparser" :checked="isDefParser" @click="isDefParser = true")
                    label.label.ml-3.mt-1(for="defaultparser") Use Default Parser
                    input.is-checkradio.ml-3(type="radio" id="nondefaultparser" :checked="!isDefParser" @click="isDefParser = false")
                    label.label.ml-3.mt-1(for="nondefaultparser") Require manual approval
                .field.is-horizontal
                    input.is-checkradio(type="radio" id="keepopen" :checked="!isAutoClose" @click="isAutoClose = false")
                    label.label.ml-3.mt-1(for="keepopen") Keep open forever
                    input.is-checkradio.ml-3(type="radio" id="autoclose" :checked="isAutoClose" @click="isAutoClose = true")
                    label.label.ml-3.mt-1(for="autoclose") Auto close operation
                .field.is-horizontal
                    input.is-checkradio(type="radio" id="runimmediately" :checked="!isPause" @click="isPause = false")
                    label.label.ml-3.mt-1(for="runimmediately") Run immediately
                    input.is-checkradio.ml-3(type="radio" id="pausestart" :checked="isPause" @click="isPause = true")
                    label.label.ml-3.mt-1(for="pausestart") Pause on start
                .field.is-horizontal
                    label.label Jitter (sec/sec)
                    input.input.is-small(v-model="minJitter")
                    input.input.is-small(v-model="maxJitter")
                .field.is-horizontal
                    label.label Visibility
                    input(type="range" min="0" max="100" v-model="visibility")
                    label.label {{ `${visibility}` }}
        footer.modal-card-foot 
            button.button.is-primary(@click="modals.operations.showCreate = false") Start 
            button.button(@click="modals.operations.showCreate = false") Cancel
</template>

<style scoped>
.modal-card {
    width: 550px;
}
</style>
