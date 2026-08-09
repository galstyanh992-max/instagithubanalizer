# Routing Observability

Phase C records capability selections, ordered fallbacks, detected gaps, discovered/staged/rejected repositories, task outcome, latency and failure class. Aggregate views can compute tool, provider and agent success rates without storing private task content.

The Dashboard Capability Center reads its counts and repository cards from owner-guarded APIs. It displays physical records, generic identifiers, Repository KB totals, reference-only entries, automatic installs and automatic activations separately.

Useful alerts are: rising fallback rate, repeated timeout/rate-limit classes, an open circuit, stale source fingerprints, incompatible adapters, and any attempt to transition from discovery directly to enabled.
