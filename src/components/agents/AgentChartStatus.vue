<script setup>
import { inject, ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";
import { storeToRefs } from "pinia";

import { useAgentStore } from "@/stores/agentStore";
import { getAgentStatus } from "@/utils/agentUtil.js";

const $api = inject("$api");

const agentStore = useAgentStore();
const { agents } = storeToRefs(agentStore);

const agentChartStatus = ref(null);
const chart = ref(null);
const poll = ref(null); 

onMounted(async () => {
  window.addEventListener("resize", resizeChart);

  const [cfg, ag] = await Promise.allSettled([
    agentStore.getAgentConfig($api),
    agentStore.getAgents($api),
  ]);
  if (cfg.status === "rejected") console.warn("[cmp] getAgentConfig failed:", cfg.reason);
  if (ag.status === "rejected")  console.error("[cmp] getAgents failed:", ag.reason);

  await initChart();

  poll.value = setInterval(() => {
    agentStore.getAgents($api).catch(err => console.warn("[poll] getAgents failed:", err));
  }, 10_000);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
  if (poll.value) clearInterval(poll.value);
  if (chart.value) {
    chart.value.dispose(); // avoid ECharts memory leaks
    chart.value = null;
  }
});

watch(() => {
    if (chart.value) {
      setChartOption();
    } else {
      console.log("[watch] chart not ready yet, skipping setOption");
    }
  }
);

async function initChart() {
  chart.value = echarts.init(agentChartStatus.value);
  chart.value.showLoading("default", {
    maskColor: "rgba(25, 25, 25, 0.8)",
    textColor: "white",
  });
  resizeChart();

  try {
    await agentStore.getAgents($api); // initial fetch
  } finally {
    setChartOption();
    chart.value.hideLoading();
  }
}

function setChartOption() {
  const option = {
    title: {
      text: `${agents.value.length} Agent${agents.value.length === 1 ? "" : "s"}`,
      textStyle: { color: "white" },
    },
    tooltip: { trigger: "item" },
    legend: { show: false },
    series: [
      {
        id: "agent-status",
        name: "Agent Status",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "hsl(0deg, 0%, 14%)",
          borderWidth: 2,
        },
        label: { show: false, position: "center" },
        labelLine: { show: false },
        data: getChartData(),
      },
    ],
  };
  chart.value.setOption(option, { notMerge: true, replaceMerge: ["series"], lazyUpdate: true });
}

function getChartData() {
  if (!agents.value.length) return [];
  const nowMs = agentStore.serverNowMs ?? Date.now();
  const cfg = agentStore.agentConfig;

  return [
    {
      name: "Alive (trusted)",
      value: agents.value.filter(a => getAgentStatus(a, nowMs, cfg) === "alive" && a.trusted).length,
      itemStyle: { color: "#4a9" },
    },
    {
      name: "Alive (untrusted)",
      value: agents.value.filter(a => getAgentStatus(a, nowMs, cfg) === "alive" && !a.trusted).length,
      itemStyle: { color: "#F7DB89" },
    },
    {
      name: "Pending kill",
      value: agents.value.filter(a => getAgentStatus(a, nowMs, cfg) === "pending kill").length,
      itemStyle: { color: "hsl(207deg, 61%, 53%)" },
    },
    {
      name: "Dead",
      value: agents.value.filter(a => getAgentStatus(a, nowMs, cfg) === "dead").length,
      itemStyle: { color: "#c31" },
    },
  ];
}

function resizeChart() {
  if (!chart.value) return;
  chart.value.resize();
}
</script>

<template lang="pug">
#agentChartStatus(ref="agentChartStatus")
</template>

<style scoped>
#agentChartStatus { width: 100%; height: 100%; }
</style>
