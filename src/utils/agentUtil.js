// src/utils/agentUtil.js
export function getAgentStatus(agent, nowMs = Date.now(), cfg = {}) {
   
  if (agent._pendingKill) {
    // Optional: distinguish final killed vs still pending
    const lastSeen = agent._lastSeenMs || (agent.last_seen ? new Date(agent.last_seen).getTime() : null);
    if (lastSeen) {
      const sleepMaxSec = Number(agent.sleep_max) || Number(cfg.sleep_max) || 60;
      const bufferMs = Math.min(180_000, Math.max(15_000, Math.floor(sleepMaxSec * 500)));
      if (nowMs - lastSeen > sleepMaxSec * 1000 + bufferMs) {
        return "killed"; // final state
      }
    }
    return "pending kill";
  }

  if (!agent.last_seen) return "dead";
  const lastMs = new Date(agent.last_seen).getTime();
  const msSinceSeen = nowMs - lastMs;

  const sleepMaxSec = Number(agent.sleep_max) || Number(cfg.sleep_max) || 60;
  const bufferMs = Math.min(180_000, Math.max(15_000, Math.floor(sleepMaxSec * 500)));

  return msSinceSeen <= (sleepMaxSec * 1000 + bufferMs) ? "alive" : "dead";
}
