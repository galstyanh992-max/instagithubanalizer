# Repository Curator

The curator accepts repository metadata or a controlled file fixture, never executes repository code during analysis, and produces a deterministic assessment.

Lifecycle states are `DISCOVERED`, `UNVERIFIED`, `SCANNING`, `VERIFIED`, `REFERENCE_ONLY`, `CANDIDATE`, `STAGED`, `TESTING`, `APPROVED`, `ENABLED`, `DISABLED`, `REJECTED`, `QUARANTINED`, `DEPRECATED`, and `MISSING`.

The gate inspects manifests, install hooks, environment access, remote-script execution, prompt injection text and dangerous Docker mounts. Only `CANDIDATE` assessments can be staged. Staging writes an inert assessment manifest beneath `.jarvis/staging`; it runs no clone, package manager, Docker, postinstall or activation command.

Repository fingerprints reserve fields for repository identity, commit SHA, artifact digest, license and verification time. A candidate cannot become verified until these fields and live compatibility checks exist.
