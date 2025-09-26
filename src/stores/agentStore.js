// src/stores/agentStore.js
import { defineStore } from "pinia";
import { toMs } from "@/utils/utils.js";

export const useAgentStore = defineStore("agentStore", {
  state: () => ({
    agents: [],
    agentConfig: {},
    selectedAgent: {},
    agentGroups: [],
    // new: server clock from API response headers
    serverNowMs: undefined,
  }),

  actions: {
    async getAgents($api) {
      try {
        // no query cache-busters; your API forbids unknown params
        const res = await $api.get("/api/v2/agents", {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });

        // capture server time (kills client/server clock skew)
        this.serverNowMs = Date.parse(res.headers?.date) || Date.now();

        // normalize last_seen -> _lastSeenMs and sort by it (desc)
        this.agents = (res.data || [])
          .map(a => ({ ...a, _lastSeenMs: toMs(a.last_seen) }))
          .sort((a, b) => b._lastSeenMs - a._lastSeenMs);
        
        const first = this.agents[0]
        this.updateAgentGroups();
      } catch (error) {
        throw error;
      }
    },

    async getAgentConfig($api) {
      try {
        const response = await $api.get("/api/v2/config/agents");
        this.agentConfig = response.data;
      } catch (error) {
        throw error;
      }
    },

    async saveConfig($api) {
      const reqBody = { ...this.agentConfig };
      delete reqBody.deployments;
      try {
        const response = await $api.patch("/api/v2/config/agents", reqBody);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    async saveSelectedAgent($api) {
      try {
        const { group, trusted, sleep_min, sleep_max, watchdog, pending_contact } = this.selectedAgent;
        const response = await $api.patch(
          `/api/v2/agents/${this.selectedAgent.paw}`,
          { group, trusted, sleep_min, sleep_max, watchdog, pending_contact }
        );
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    async deleteAgent($api, agentPaw, index) {
      try {
        const response = await $api.delete(`/api/v2/agents/${agentPaw}`);
        this.agents.splice(index, 1);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    async killAgent($api, agentPaw) {
      try {
     
        const idx = this.agents.findIndex(a => a.paw === agentPaw);
        if (idx !== -1) {
        // Flag agent as pending kill immediately
        this.agents[idx]._pendingKill = true;
        }
        
    } catch (error) {
        throw error;
    }
    },

    updateAgentGroups() {
      if (!this.agents) return;
      this.agentGroups = [...new Set(this.agents.map(agent => agent.group))];
    },
  },
});
