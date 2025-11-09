import cloneDeep from 'lodash/cloneDeep';

/**
 * Rebuilds an ability’s executor array using executor_facts keys
 * like linux_sh_0, linux_sh_1, etc.
 *
 * @param {Array} originalExecutors - The ability.executors array
 * @param {Object} executorFactsMap - Normalized executor_facts object
 * @returns {Array} New executor list with injected facts
 */
export function buildExecutorsFromFacts(originalExecutors, executorFactsMap) {
  if (!Array.isArray(originalExecutors)) return [];
    const platformNameCounts = {};

return originalExecutors.map((executor) => {
  const base = `${executor.platform}_${executor.name}`;
  const count = platformNameCounts[base] ?? 0;
  platformNameCounts[base] = count + 1;

  const key = `${base}_${count}`;
  const facts = executorFactsMap?.[key] || [];
  
  return {
    ...cloneDeep(executor),
    executor_facts: facts.map(({ trait, value }) => ({ trait, value })),
    key: key,
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
      if (!executorFacts || typeof executorFacts !== 'object') return step;
      console.debug('[normalizeStepExecutorFacts] input step:', JSON.stringify(step, null, 2));
      console.debug('[normalizeStepExecutorFacts] input executor_facts:', JSON.stringify(executorFacts, null, 2));
      const normalizedFacts = {};
      for (const [platformKey, facts] of Object.entries(executorFacts)) {
        if (!platformKey.includes('_')) {
          const matchingExecutors = abilityExecutors?.filter(e => e.platform === platformKey) || [];
          matchingExecutors.forEach((executor, i) => {
            const key = `${platformKey}_${executor.name}_${i}`;
            normalizedFacts[key] = facts;
          });
        } else {
          normalizedFacts[platformKey] = facts;
        }
      }

      return {
        ...step,
        metadata: {
          ...step.metadata,
          executor_facts: normalizedFacts
        }
      };
    }
    export function normalizeExecutorFactsForSave(executorFacts) {
      const normalized = {};
      for (const [key, facts] of Object.entries(executorFacts || {})) {
        if (!Array.isArray(facts) || facts.length === 0) continue;

        const [platform] = key.split('_');
        if (!normalized[platform]) {
          normalized[platform] = facts.map(({ trait, value }) => ({ trait, value }));
        } else {
          normalized[platform].push(...facts.map(({ trait, value }) => ({ trait, value })));
        }
      }
      return normalized;
    }

