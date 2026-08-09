# Capability Intelligence

Phase C adds an intelligence layer to the existing JARVIS planner, capability registry, provider router and execution engine. It does not introduce another orchestrator or registry.

The flow is: classify task → normalize required capabilities → inspect existing implementations → rank tool/agent/skill/provider candidates → reduce context → execute with fallback → store operational feedback. Missing capabilities enter repository discovery; discovery never implies installation or activation.

Physical implementation records and normalized generic capability identifiers remain separate metrics. The frozen Phase B baseline is 242 physical records and 375 generic identifiers.

Safety invariants: existing capabilities first; no blind clone/install; no automatic activation; side effects remain behind existing approval policies; n8n remains on demand; JARVIS remains the sole planner and supervisor.
