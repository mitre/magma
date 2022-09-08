import { defineStore } from "pinia";

export const usePluginStore = defineStore({
  id: "plugin",
  state: () => ({
    plugins: [],
  }),
  actions: {
    async getAllPlugins($api) {
      try {
        const res = await $api.get("/api/v2/health");
        this.plugins = res.data.plugins;
        return res.data.plugins;
      } catch (error) {
        throw error;
      }
    },
  },
});
