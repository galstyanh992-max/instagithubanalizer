# Repository Security

Repository code is untrusted until verified. Analysis is static and rejects or quarantines install hooks, credential harvesting, prompt injection instructions, remote shell pipes and privileged Docker mounts. Unknown or reciprocal licenses prevent automatic code import.

Staging is not installation. Activation requires successful source fingerprinting, security and license gates, compatibility testing, adapter review and explicit approval. Security/OSINT tools additionally require an authorized target policy.

The Supabase control-plane migration enables RLS for every Phase C table, grants only the authenticated role, and applies both `USING` and `WITH CHECK` owner predicates. Operational payloads deliberately exclude raw private content.
