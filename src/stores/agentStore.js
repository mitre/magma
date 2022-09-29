import { defineStore } from "pinia";

export const useAgentStore = defineStore("agentStore", {
    state: () => {
        return {
            agents: [],
            agentConfig: {},
            selectedAgent: {}
        };
    },

    actions: {
        async getAgents($api) {
            try {
                const response = await $api.get("/api/v2/agents");
                // Sort agents so most recently seen is the first index
                this.agents = response.data.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
            } catch(error) {
                throw error;
            }
        },
        async getAgentConfig($api) {
            try {
                const response = await $api.get("/api/v2/config/agents");
                this.agentConfig = response.data;
            } catch(error) {
                throw error;
            }
        },
        async saveConfig($api) {
            let reqBody = this.agentConfig;
            delete reqBody.deployments;
            try {
                const response = await $api.patch("/api/v2/config/agents", reqBody);
                return response.data;
            } catch(error) {
                throw error;
            }
        },
        async saveSelectedAgent($api) {
            try {
                const response = await $api.patch(`/api/v2/agents/${this.selectedAgent.paw}`, this.selectedAgent);
                return response.data;
            } catch(error) {
                throw error;
            }
        },
        async deleteAgent($api, agentPaw, index) {
            try {
                const response = await $api.delete(`/api/v2/agents/${agentPaw}`);
                this.agents.splice(index, 1);
                return response.data;
            } catch(error) {
                throw error;
            }
        },
        async killAgent($api, agentPaw) {
            const reqBody = {
                watchdog: 1,
                sleep_min: 3,
                sleep_max: 3
            };
            try {
                const response = await $api.patch(`/api/v2/agents/${agentPaw}`, reqBody);
                return response.data;
            } catch(error) {
                throw error;
            }
        }
    },
});
