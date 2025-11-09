import { defineStore } from "pinia";
import { useAbilityStore as abilityStore } from "@/stores/abilityStore";
import { useObjectiveStore } from "@/stores/objectiveStore";
import {
  buildExecutorsFromFacts,
  normalizeStepExecutorFacts,
  normalizeExecutorFactsForSave,
} from "@/utils/executorUtils";
import { v4 as uuidv4 } from "uuid";
import cloneDeep from "lodash/cloneDeep";

/**
 * Adversary store:
 * - Loads, selects, edits, saves, and deletes adversaries
 * - Generates hydrated ability rows for the details table
 * - Normalizes executor facts for load/save
 */
export const useAdversaryStore = defineStore("adversaryStore", {
  state: () => ({
    adversaries: [],
    selectedAdversary: {},
    selectedAdversaryAbilities: [],
    objectives: [],
    selectedObjective: "",
  }),

  actions: {
    /** Fetch the list of adversaries from the backend. */
    async getAdversaries($api) {
      try {
        const response = await $api.get("/api/v2/adversaries");
        this.adversaries = response.data;
      } catch (error) {
        console.error("Error fetching adversaries", error);
      }
    },

    /** Fetch the list of objectives from the backend. */
    async getObjectives($api) {
      try {
        const response = await $api.get("/api/v2/objectives");
        this.objectives = response.data;
      } catch (error) {
        console.error("Error fetching objectives", error);
      }
    },

    /** Create a new objective with a placeholder name/description and select it. */
    async createObjective($api) {
      try {
        const response = await $api.post("/api/v2/objectives", {
          name: "New objective",
          description: "Enter a description",
        });
        this.objectives.push(response.data);
        this.selectedObjective = this.objectives[this.objectives.length - 1];
      } catch (error) {
        console.error("Error creating objective", error);
      }
    },

    /** Persist the currently selected objective’s updates. */
    async saveObjective($api) {
      try {
        await $api.put(
          `/api/v2/objectives/${this.selectedObjective.id}`,
          this.selectedObjective
        );
      } catch (error) {
        console.error("Error saving objective", error);
      }
    },

    /**
     * Save (PATCH) the currently selected adversary.
     * Falls back to POST on 404/500. Normalizes executor facts before send.
     */
    async saveSelectedAdversary($api) {
      const buildAtomicOrdering = () =>
        this.selectedAdversaryAbilities.map(({ ability_id, metadata = {} }) => {
          const normalizedFacts = normalizeExecutorFactsForSave(
            metadata.executor_facts || {}
          );
          return {
            ability_id,
            metadata: { executor_facts: normalizedFacts },
          };
        });

      const reqBody = {
        adversary_id: this.selectedAdversary.adversary_id,
        name: this.selectedAdversary.name,
        description: this.selectedAdversary.description,
        objective:
          this.selectedAdversary.objective?.id ??
          this.selectedAdversary.objective ??
          null,
        atomic_ordering: buildAtomicOrdering(),
      };

      try {
        const response = await $api.patch(
          `/api/v2/adversaries/${reqBody.adversary_id}`,
          reqBody
        );
        const idx = this.adversaries.findIndex(
          (a) => a.adversary_id === reqBody.adversary_id
        );
        if (idx !== -1) this.adversaries[idx] = response.data;
        return response.data;
      } catch (error) {
        const code = error.response?.status;
        if (code !== 404 && code !== 500) {
          console.error("Unexpected error during PATCH:", error);
          throw error;
        }
        try {
          const response = await $api.post("/api/v2/adversaries", reqBody);
          this.adversaries.push(response.data);
          return response.data;
        } catch (postErr) {
          console.error("POST also failed:", postErr);
          throw postErr;
        }
      }
    },

    /** Delete the currently selected adversary and clear related state. */
    async deleteAdversary($api) {
      try {
        await $api.delete(
          `/api/v2/adversaries/${this.selectedAdversary.adversary_id}`
        );
        const index = this.adversaries.findIndex(
          (a) => a.adversary_id === this.selectedAdversary.adversary_id
        );
        this.selectedAdversary = {};
        this.selectedAdversaryAbilities = [];
        if (index !== -1) this.adversaries.splice(index, 1);
      } catch (error) {
        console.error("Error deleting adversary", error);
      }
    },

    /**
     * Legacy helper: hydrate selectedAdversaryAbilities from atomic_ordering
     * when atomic_ordering is a list of ability_ids (strings).
     * (Use generateSelectedAdversaryAbilities for richer step objects.)
     */
    updateSelectedAdversaryAbilities() {
      if (!this.selectedAdversary.atomic_ordering) {
        this.selectedAdversaryAbilities = [];
        return;
      }
      this.selectedAdversaryAbilities =
        this.selectedAdversary.atomic_ordering.map((ability_id) => {
          return {
            ...abilityStore().abilities.find(
              (ability) => ability.ability_id === ability_id
            ),
          };
        });
    },

    /**
     * Build the table-ready abilities from an adversary profile.
     * - Accepts string ids or { ability_id, step_uuid, metadata } objects
     * - Normalizes executor facts and rebuilds executors
     */
    generateSelectedAdversaryAbilities(adversary, abilitiesStore) {
      return (adversary.atomic_ordering || [])
        .map((step, index) => {
          const stepObj =
            typeof step === "string"
              ? { ability_id: step, step_uuid: uuidv4(), metadata: {} }
              : step;

          const stepId = stepObj.ability_id;
          const abilityTemplate = abilitiesStore.abilities.find(
            (a) => a.ability_id === stepId
          );
          if (!abilityTemplate) {
            console.warn(
              `[Automation] Ability not found for step ${index}: ${stepId}`
            );
            return null;
          }

          const clonedAbility = cloneDeep(abilityTemplate);
          const stepUuid = stepObj.step_uuid || uuidv4();

          // Merge metadata (step overrides template)
          const metadata = {
            ...(clonedAbility.metadata || {}),
            ...(stepObj.metadata || {}),
          };
          metadata.executor_facts ??= {};

          // Normalize and rebuild executors
          const normalizedStep = normalizeStepExecutorFacts(
            { ...stepObj, metadata },
            clonedAbility.executors
          );
          const normalizedExecutorFacts =
            normalizedStep.metadata.executor_facts ?? {};
          const rebuiltExecutors = buildExecutorsFromFacts(
            clonedAbility.executors,
            normalizedExecutorFacts
          );

          clonedAbility.executors = rebuiltExecutors;
          clonedAbility.metadata = {
            ...clonedAbility.metadata,
            ...metadata,
            executor_facts: { ...normalizedExecutorFacts },
          };

          return {
            step_uuid: stepUuid,
            ability_id: clonedAbility.ability_id,
            name: clonedAbility.name,
            tactic: clonedAbility.tactic,
            technique_id: clonedAbility.technique_id,
            technique_name: clonedAbility.technique_name,
            executors: clonedAbility.executors,
            metadata: clonedAbility.metadata,
          };
        })
        .filter(Boolean);
    },

    /**
     * Load an adversary profile (from API or imported JSON) into store state.
     * - Ensures each step has step_uuid and metadata
     * - Normalizes executor facts
     * - Populates selectedAdversaryAbilities for the table
     */
    async loadAdversaryFromProfile(profile) {
      const abilityStoreInstance = abilityStore();
      const objectiveStoreInstance = useObjectiveStore();
      const defaultObjective = objectiveStoreInstance.objectives?.[0]?.id ?? null;
      const objectiveId =
        profile.objective?.id ?? profile.objective ?? defaultObjective;

      // Ensure abilities are available
      if (!abilityStoreInstance.abilities.length) {
        await abilityStoreInstance.getAbilities($api);
      }

      // Selected adversary shell
      this.selectedAdversary = cloneDeep({
        adversary_id: profile.adversary_id || profile.id || uuidv4(),
        name: profile.name || "Imported",
        description: profile.description || "",
        objective: objectiveId,
      });

      // Normalize each step into { ability_id, step_uuid, metadata }
      this.selectedAdversary.atomic_ordering = (profile.atomic_ordering || [])
        .map((step) => {
          const normalized = step?.ability_id
            ? JSON.parse(JSON.stringify(step))
            : step;

          // String → object
          if (typeof normalized === "string") {
            return {
              ability_id: normalized,
              step_uuid: uuidv4(),
              metadata: {},
            };
          }

          // Object with ability_id
          if (normalized && typeof normalized === "object" && normalized.ability_id) {
            const abilityDef = abilityStoreInstance.abilities.find(
              (a) => a.ability_id === normalized.ability_id
            );
            const stepWithUUID = {
              ...normalized,
              step_uuid: normalized.step_uuid || uuidv4(),
              metadata: { ...normalized.metadata },
            };
            // Normalize executor facts vs. the ability's executors
            const normalizedStepExecutorFacts = normalizeStepExecutorFacts(
              stepWithUUID,
              abilityDef?.executors || []
            );
            return normalizedStepExecutorFacts;
          }

          console.warn("[Automation] Skipping invalid step format:", step);
          return null;
        })
        .filter(Boolean);

      // Build table-ready abilities
      this.selectedAdversaryAbilities = this.generateSelectedAdversaryAbilities(
        this.selectedAdversary,
        abilityStoreInstance
      );
      // Force reactive array update (no-op reassign but keeps intention clear)
      this.selectedAdversaryAbilities.splice(
        0,
        this.selectedAdversaryAbilities.length,
        ...this.selectedAdversaryAbilities
      );
    },

    /**
     * Update a single step (by step_uuid) in selectedAdversaryAbilities.
     * Uses shallow merge to preserve reactivity.
     */
    updateAbilityInstance(updatedStep) {
      const idx = this.selectedAdversaryAbilities.findIndex(
        (s) => s.step_uuid === updatedStep.step_uuid
      );
      if (idx !== -1) {
        this.selectedAdversaryAbilities[idx] = {
          ...this.selectedAdversaryAbilities[idx],
          ...updatedStep,
        };
      } else {
        console.warn(
          "[Automation] Could not find ability with step_uuid:",
          updatedStep.step_uuid
        );
      }
    },
  },
});
