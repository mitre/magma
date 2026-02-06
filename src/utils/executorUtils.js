import { v4 as uuidv4 } from "uuid";
import cloneDeep from "lodash/cloneDeep";
/**
 * Rebuilds an ability’s executor array using executor_facts keys
 * like linux_sh_0, linux_sh_1, etc.
 *
 * @param {Array} originalExecutors - The ability.executors array
 * @param {Object} executorFactsMap - Normalized executor_facts object
 * @returns {Array} New executor list with injected facts
 */
export function buildExecutorsFromFacts(originalExecutors, executorFactsMap = {}) {
  if (!Array.isArray(originalExecutors)) return [];

  return originalExecutors.map((executor) => {
    const platformFacts = executorFactsMap?.[executor.platform] || [];

    return {
      ...cloneDeep(executor),
      executor_facts: cloneDeep(platformFacts),
      payloads: Array.isArray(executor.payloads) ? executor.payloads : [],
    };
  });
}

/**
 * Normalizes unstructured executor_facts using ability executor info
 *
 * @param {Object} step - Adversary step with optional executor_facts
 * @param {Array} abilityExecutors - Ability.executors list to match
 * @returns {Object} Step with normalized executor_facts
 */
export function normalizeStepExecutorFacts(step, abilityExecutors) {
  const executorFacts = step?.metadata?.executor_facts;
  if (!executorFacts || typeof executorFacts !== "object") return step;

  return {
    ...step,
    metadata: {
      ...step.metadata,
      executor_facts: executorFacts,
    },
  };
}

    // utils/executorUtils.js
export function normalizeExecutorFactsForSave(executorFacts = {}) {
  const normalized = {};

  for (const [key, facts] of Object.entries(executorFacts)) {
    if (!Array.isArray(facts) || facts.length === 0) continue;

    // UI keys supported:
    // - uuid::linux
    // - linux_sh_0
    // - linux (already backend style)
    let platform = key;

    if (key.includes("::")) {
      platform = key.split("::").pop();      // uuid::linux -> linux
    } else if (key.includes("_")) {
      platform = key.split("_")[0];          // linux_sh_0 -> linux
    }

    normalized[platform] ??= [];
    normalized[platform].push(
      ...facts.map(({ trait, value }) => ({ trait, value }))
    );
  }

  return normalized;
}



