# Tool, Agent, Skill and Provider Selection

All selectors share one explainable ranking contract. Factors are task fit, specialization, availability, health, historical success, latency, cost, privacy, locality, resource usage, risk and compatibility.

Hard gates remove candidates that do not match the task, exceed maximum risk, are excluded by a circuit breaker, or are unavailable without an allowed on-demand path. Stable ID ordering resolves exact ties.

The result contains the selected implementation, every factor score and an ordered fallback chain. Provider selection extends the existing provider router; it does not replace it. Agent selection remains subordinate to the JARVIS planner.
