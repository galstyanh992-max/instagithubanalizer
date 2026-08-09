# Execution Learning

The local feedback store retains a bounded set of operational records: capability ID, task class, outcome, duration, failure class, timestamp and allowlisted metadata. Prompt text, tool input/output, messages, content, credentials, cookies and tokens are removed.

Historical success and latency can influence later rankings. Three consecutive controlled failures open the circuit for a cooldown interval; the implementation remains registered and automatically becomes eligible after cooldown.

Supabase tables mirror minimal owner-scoped metadata when connected. Local selection and fallback continue if Supabase is unavailable.
