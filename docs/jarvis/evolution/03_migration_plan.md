# Migration Plan

Additive Prisma models may later store infrastructure operations, steps, approvals and artifacts. Do not apply destructive migrations. Rollback consists of application rollback plus a new additive migration; external resources are never automatically deleted and retain compensation metadata.
