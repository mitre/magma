import { defineStore } from "pinia";

export const useAbilityStore = defineStore("abilityStore", {
  state: () => {
      return {
          abilities: []
      };
  },
  actions: {
      async getAbilities($api) {
          try {
              const response = await $api.get("/api/v2/abilities")
              this.abilities = response.data
          } catch(error) {
              console.error("Error fetching abilities", error)
          }
      }
  },
});
