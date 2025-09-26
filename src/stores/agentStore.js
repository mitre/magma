// src/stores/agentStore.js
import { defineStore } from "pinia";
import { toMs } from "@/utils/utils.js";

export const useAgentStore = defineStore("agentStore", {
  state: () => ({
    agents: [],
    agentConfig: {},
    selectedAgent: {},
    agentGroups: [],
    // server clock from API response headers
    serverNowMs: undefined,
    pendingKill: new Set(),
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

        // remember which agents were pending kill
        const pendingMap = new Map(
        (this.agents || [])
            .filter(a => a._pendingKill)
            .map(a => [a.paw, true])
        );

        // normalize + re-apply pendingKill
        this.agents = (res.data || [])
        .map(a => ({
            ...a,
            _lastSeenMs: toMs(a.last_seen),
            _pendingKill: pendingMap.has(a.paw) || a._pendingKill === true,
        }))
        .sort((a, b) => b._lastSeenMs - a._lastSeenMs);
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
        // clean up the flag
        this.pendingKill.delete(agentPaw);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    async killAgent($api, agentPaw) {
      try {
        const reqBody = { pending_kill: true };
            const idx = this.agents.findIndex(a => a.paw === agentPaw);
            if (idx !== -1) {
                // WTF is this API voodoo?  Setting watchdog to 1 and sleep to 3 forces an agent to check in almost immediately and then die because of pending_kill flag
                // This is a workaround until we have a proper "kill" command that an agent can execute immediately
                const reqBody = {
                watchdog: 1,
                sleep_min: 3,
                sleep_max: 3
                };

                this.pendingKill.add(agentPaw);
                const response = await $api.patch(`/api/v2/agents/${agentPaw}`, reqBody);
                this.agents = this.agents.map(a =>
                a.paw === agentPaw
                    ? { ...a, _pendingKill: true }
                    : a
                );
                // Flag agent as pending kill immediately
                this.agents[idx]._pendingKill = true;
            return response.data;
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
