# 05ZER: Antigravity Permission-Bypass Repair

## 1. Verified Defect
The production Antigravity adapter (`src/lib/worker-registry/adapters/antigravity-cli.ts`) was using `--dangerously-skip-permissions`, bypassing all native sandbox security of `agy.exe`. This allowed unrestricted filesystem and command execution in headless mode.

## 2. Implemented Fix
Removed `--dangerously-skip-permissions` from the adapter.
The adapter now correctly spawns `agy.exe` securely:
- shell: false
- No bypass flags
- `--add-dir` for workspace isolation
- Non-interactive (`-p`)

## 3. Official Safe Execution Mechanism
Based on local `agy --help` and runtime probe, the **official and supported** way to execute headless tasks securely without bypass flags is by configuring explicit granular allow-rules in `~/.gemini/antigravity-cli/settings.json`.

- When run non-interactively without bypass flags, `agy` strictly enforces a deny-by-default policy and automatically blocks any tool (e.g. `write_file`, `command`) not explicitly permitted.
- By defining `{"permissions": {"allow": ["write_file(*)"]}}` or using `trustedWorkspaces`, users can authorize safe operations for specific isolated workspaces while maintaining full security against unapproved arbitrary execution.

## 4. E2E Verification
Ran a complete synchronous E2E test of the adapter using the official `agy.exe` (v1.1.7).
- `AntigravityWorkerAdapter.execute()` executed successfully without bypass flags.
- `settings.json` allow-rules correctly permitted `multiply.ts` creation.
- `command` execution (like running `npm test` internally) was correctly auto-denied by the sandbox, confirming the security boundary is active.
- The external E2E suite executed `npm test` successfully (4 tests passed).
- **Exit Code**: 0.

## 5. Security Status
- **ANTIGRAVITY_BINARY_STATUS**: OFFICIAL_VERIFIED
- **ANTIGRAVITY_EXECUTABLE_PATH**: `C:\Users\Admin\AppData\Local\agy\bin\agy.exe`
- **ANTIGRAVITY_BYPASS_FLAGS**: REMOVED
- **ANTIGRAVITY_E2E_STATUS**: PASS

Phase 05 (Worker Adapters Security & Stabilization) repairs are complete.
Ready for Phase 05 Consolidation.

