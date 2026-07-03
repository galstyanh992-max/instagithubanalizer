#!/usr/bin/env bun
/**
 * Wrapper that runs the prisma seed script directly via Bun.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const script = path.join(import.meta.dirname, '..', 'prisma', 'seed.ts')
const result = spawnSync('bun', ['run', script], { stdio: 'inherit' })
process.exit(result.status ?? 0)
