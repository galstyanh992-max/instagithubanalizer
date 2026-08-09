# Capability Gap Detection

For each normalized requirement the detector reports one of: `AVAILABLE`, `AVAILABLE_DEGRADED`, `AVAILABLE_BUT_DISABLED`, `AVAILABLE_ON_DEMAND`, `MISSING`, or `UNSUITABLE`.

Existing registry implementations are always checked first. Only `MISSING` requirements query the repository knowledge base. Candidate scores combine task fit, security posture, license policy, integration architecture and local compatibility.

Gap discovery is triggered by a task, an explicit user command, or a separately configured low-frequency refresh. Phase C creates no infinite crawler and performs no random installation.
