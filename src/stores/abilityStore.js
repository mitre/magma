import { defineStore } from "pinia";

export const useAbilityStore = defineStore("abilityStore", {
    state: () => {
        return {
            abilities: [],
            payloads: [],
        };
    },
    getters: {
        platforms: (state) => {
            let platforms = {};
            state.abilities.forEach((ability) => {
                ability.executors.forEach((executor) => {
                    if (!platforms[executor.platform]) {
                        platforms[executor.platform] = [executor.name];
                    } else if (!platforms[executor.platform].includes(executor.name)) {
                        platforms[executor.platform].push(executor.name);
                    }
                });
            });
            return platforms;
        },
        tactics: (state) => (
            [...new Set(state.abilities.map((ability) => ability.tactic))].sort()
        ),
        techniques: (state) => (
            [...new Set(state.abilities.map((ability) => `${ability.technique_id} | ${ability.technique_name}`))].sort()
        ),
        techniqueIds: (state) => (
            [...new Set(state.abilities.map((ability) => ability.technique_id))].sort()
        ),
        techniqueNames: (state) => (
            [...new Set(state.abilities.map((ability) => ability.technique_name))].sort()
        ),
        plugins: (state) => (
            [...new Set(state.abilities.map((ability) => ability.plugin))].sort()
        )
    },
    actions: {
        async getAbilities($api) {
            try {
                const response = await $api.get("/api/v2/abilities");
                this.abilities = response.data;
            } catch(error) {
                console.error("Error fetching abilities", error);
            }
        },
        async saveAbility($api, ability, create) {
            try {
                if (create) {
                    const response = await $api.post(`/api/v2/abilities`, ability);
                    this.abilities.push(response.data);
                } else {
                    const response = await $api.patch(`/api/v2/abilities/${ability.ability_id}`, ability);
                    const index = this.abilities.findIndex((a) => a.ability_id === response.data.ability_id);
                    this.abilities[index] = response.data;
                }
            } catch(error) {
                console.error("Error saving ability", error);
            }
        },
        async deleteAbility($api, abilityId) {
            try {
                await $api.delete(`/api/v2/abilities/${abilityId}`);
                this.abilities.splice(this.abilities.findIndex((ability) => ability.ability_id === abilityId), 1);
            } catch(error) {
                console.error("Error fetching abilities", error);
            }
        },
        async getPayloads($api) {
            try {
                const response = await $api.get("/api/v2/payloads");
                this.payloads = response.data.payloads;
            } catch(error) {
                console.error("Error fetching payloads", error);
            }
        }
    },
});
