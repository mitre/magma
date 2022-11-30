import { defineStore } from "pinia";

export const useCoreStore = defineStore("coreStore", {
    state: () => {
        return {
            mainConfig: {},
            availablePlugins: [],
            planners: [],
            obfuscators: [],
            sources: []
        };
    },
    getters: {
        enabledPlugins: (state) => (state.mainConfig ? state.mainConfig.plugins : [])  
    },
    actions: {
        async getMainConfig($api) {
            try {
                const response = await $api.get("/api/v2/config/main");
                this.mainConfig = response.data;
            } catch(error) {
                console.error("Error fetching main config", error);
            }
        },
        async getAvailablePlugins($api) {
            try {
                const response = await $api.get("/api/v2/health");
                this.availablePlugins = response.data.plugins;
            } catch (error) {
                throw error;
            }
        },
        async updateMainConfigSetting($api, key, value) {
            try {
                await $api.patch("/api/v2/config/main", {
                    prop: key,
                    value: value
                });
                this.mainConfig[key] = value;
            } catch(error) {
                console.error("Error updating main config", error);
            }
        },
        async getPlanners($api) {
            try {
                const response = await $api.get("/api/v2/planners")
                this.planners = response.data;
            } catch(error) {
                console.error("Error getting planners", error);
            }
        },
        async getObfuscators($api) {
            try {
                const response = await $api.get("/api/v2/obfuscators")
                this.obfuscators = response.data;
            } catch(error) {
                console.error("Error getting obfuscators", error);
            }
        },
        async getSources($api) {
            try {
                const response = await $api.get("/api/v2/sources");
                this.sources = response.data;
            } catch(error) {
                console.error("Error getting sources", error);
            }
        }
    },
});
