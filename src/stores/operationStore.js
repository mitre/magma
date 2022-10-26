import { defineStore } from "pinia";

export const useOperationStore = defineStore("operationStore", {
    state: () => {
        return {
            operations: [],
            selectedOperation: {id: ""}
        };
    },

    actions: {
        async getOperations($api) {
            try {
                const response = await $api.get("/api/v2/operations");
                // Sort operations
                // this.agents = response.data.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
            } catch(error) {
                throw error;
            }
        },
    },
});
