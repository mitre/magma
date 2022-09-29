<script setup>
import { ref } from "vue";
let dropdownItems = ref([
  { display_text: "Dropdown item 1" },
  { display_text: "Dropdown item 2" },
  { display_text: "Dropdown item 3" },
]);
let agentPanelTabs = ref([
  { display_name: "All", platform: "N/A" },
  { display_name: "Ragdoll", platform: "Windows" },
  { display_name: "Sandcat", platform: "Windows" },
  { display_name: "Manx", platform: "Windows" },
]);
let selectedDropdown = ref(0);
let selectedAgentPanelTab = ref("All");
let isTableStriped = ref(false);
let isModalActive = ref(false);
let currentPageIndex = ref(3);
let selectedPanelAgentIdx = ref(0);
const handleDropdownSelect = (idx) => {
  selectedDropdown.value = idx;
};
const isDropdownActive = (idx) => {
  return selectedDropdown.value == idx;
};
</script>

<template lang="pug">
// box
h1.title.my-60 Box
.box Testing box Element
// buttons
h1.title.my-60 Buttons
.buttons
    button.button Testing button element
    button.button.is-primary Testing button element with primary color
    button.button.is-small small 
    button.button.is-large large
// notification
h1.title.my-60 Notification
.notification.is-warning
    button.delete
    p Testing notification element with warning color
// progress bar
h1.title.my-60 Progress bar
p Testing progress bar element with primary color
progress(value="20" max="100").progress.is-primary 20%
// table
h1.title.my-60 Table
button.button.my-60(@click="isTableStriped = !isTableStriped") Toggle Table Stripe
table.table(:class="{'is-striped': isTableStriped}")
    thead
        tr
            th Decide
            th Status
            th Link/ability name
            th Agent
            th Host
            th pid
            th Link Command
            th Link Output
    tbody
        tr(v-for="index in 5" :key="index")
            td 3/12/2022 11:08:18
            td
                span.tag.is-success Success
            td Collect ARP details
            td nxdqkh 
            td VAN-DST-10
            td 12383
            td
                button.button View Command
            td
                button.button View Output
// tags
h1.title.my-60 Tags
span.tag.is-primary Tag
span.tag.is-success Success
span.tag.is-danger Danger
// dropdown menu
h1.title.my-60 Dropdown
.dropdown.is-hoverable.my-60
    .dropdown-trigger
        button.button 
            span Dropdown 
            span.icon.is-small
                i.fas.fa-angle-down
    .dropdown-menu
        .dropdown-content 
            a.dropdown-item(
                v-for="(dropdownItem, idx) in dropdownItems" 
                :key="dropdownItem.display_text" 
                :class="isDropdownActive(idx) ? 'is-active': ''"
                @click="handleDropdownSelect(idx)") {{ dropdownItem.display_text }}
// message
h1.title.my-60 Message
.message.my-60
    p.message-header Testing Message Component 
    p.message-body Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque risus mi, tempus quis placerat ut, porta nec nulla. Vestibulum rhoncus ac ex sit amet fringilla. Nullam gravida purus diam, et dictum felis venenatis efficitur. Aenean ac eleifend lacus, in mollis lectus. Donec sodales, arcu et sollicitudin porttitor, tortor urna tempor ligula, id porttitor mi magna a neque. Donec dui urna, vehicula et sem eget, facilisis sodales sem.
// modal
h1.title.my-60 Modal
button.button.is-primary(@click="isModalActive = true") Launch Example Modal
.modal(:class="{ 'is-active': isModalActive }")
    .modal-background
    .modal-card
        header.modal-card-head 
            p.modal-card-title Modal Title
        section.modal-card-body Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean efficitur sit amet massa fringilla egestas. Nullam condimentum luctus turpis.
        footer.modal-card-foot 
            button.button.is-success(@click="isModalActive = false") Save 
            button.button(@click="isModalActive = false") Cancel
// navbar
h1.title.my-60 Navbar
nav.navbar
    .navbar-brand
    a.navbar-item(href="https://localhost:3000")
        img(src="/src/assets/img/caldera-logo.png" alt="Caldera Logo")
    .navbar-menu
        .navbar-start
            a.navbar-item(v-for="idx in 4" :key="idx") Example navbar item {{ idx }}
// pagination
h1.title.my-60 Pagination
nav.pagination
    ul.pagination-list
        li
            a.pagination-link 1
        li
            span.pagination-ellipsis &hellip;
        li(v-for="idx in 5" :key="idx")
            a.pagination-link(:class="{ 'is-current': idx == currentPageIndex }" @click="currentPageIndex = idx") {{ idx + 45 }}
        li
            span.pagination-ellipsis &hellip;
        li
            span.pagination-link 86
// panel
h1.title.my-60 Panel 
article.panel
    p.panel-heading Agents
    .panel-block
        p.control.has-icons-left
            input.input(placeholder="Search")
            span.icon.is-left
                i.fas.fa-search
    p.panel-tabs
        a(v-for="agentPanelTab in agentPanelTabs" :key="agentPanelTab.display_name" :class="{'is-active': agentPanelTab.display_name === selectedAgentPanelTab}" 
        @click="selectedAgentPanelTab = agentPanelTab.display_name") {{ agentPanelTab.display_name }}
    a.panel-block(v-for="idx in 6" :key="idx" :class="{'is-active': selectedPanelAgentIdx == idx}" @click="selectedPanelAgentIdx = idx")
        span.panel-icon
            i.fas.fa-robot
        span Example Agent {{ idx }}
h1.title.my-60 Form elements have no variables
</template>

<style scoped>
.my-60 {
  margin-top: 30px;
  margin-bottom: 30px;
}
</style>
