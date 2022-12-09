<script setup>
import AgentChartStatus from "@/components/agents/AgentChartStatus.vue";
</script>

<template lang="pug">
.columns
  .column.is-3
    .box.is-flex.is-flex-direction-column
      AgentChartStatus.is-flex-grow-1
      router-link.button.is-primary.is-fullwidth(to="/agents") 
        span Manage Agents
        span.icon
          font-awesome-icon(icon="fas fa-arrow-right")
  .column.is-3
    .box
      p.has-text-centered.has-text-weight-bold Operations TODO
  .column.is-3
    .box
      p.has-text-centered.has-text-weight-bold Abilities TODO
  .column.is-3
    .box
      p.has-text-centered.has-text-weight-bold Adversaries TODO


</template>

<style scoped>
.box {
  height: 300px;
}
</style>
