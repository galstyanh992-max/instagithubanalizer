# JARVIS local daemon supervisor for Windows Task Scheduler autostart.
#
# Design notes (see docs/jarvis/remote-architecture.md, "Windows autostart"):
# - Working directory is derived from $PSScriptRoot (this script's own
#   location, scripts/), never hardcoded, so it is robust to the repo's
#   Cyrillic path and to being relocated.
# - No secrets on the command line: JARVIS_DAEMON_TOKEN etc. are loaded by
#   the daemon itself from .env.local, never passed as process arguments.
# - Runs with no visible console: launch this script via
#   `powershell.exe -WindowStyle Hidden -File scripts\daemon-service.ps1`
#   from the Task Scheduler action (see scripts/register-daemon-task.ps1).
# - Restart-on-failure with bounded exponential backoff (5s/10s/20s/40s,
#   capped at 60s) is implemented here rather than relied on from Task
#   Scheduler's own restart semantics, which are coarser and harder to bound.
# - A stop-flag file lets an operator cleanly stop the supervised loop
#   without it immediately restarting itself: create
#   <repoRoot>\.jarvis\state\daemon-service.stop and the loop exits instead
#   of relaunching.
# - Logs are rotated by date under <repoRoot>\logs\daemon\, one file per
#   calendar day, so a runaway loop cannot grow a single log file unbounded.

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$logDir = Join-Path $repoRoot 'logs\daemon'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stateDir = Join-Path $repoRoot '.jarvis\state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$stopFlag = Join-Path $stateDir 'daemon-service.stop'

$backoffSeconds = @(5, 10, 20, 40, 60)
$attempt = 0

# Always-appended meta log for the supervisor loop itself (launch/exit/
# backoff events), separate from the daemon process's own raw stdout/stderr
# (which Start-Process truncates fresh per attempt below).
$supervisorLog = Join-Path $logDir ("supervisor-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd'))
function Log-Supervisor([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $supervisorLog -Value $line
  Write-Host $line
}

Log-Supervisor "Supervisor starting. Repo root: $repoRoot"

while ($true) {
  if (Test-Path $stopFlag) {
    Log-Supervisor "Stop flag present ($stopFlag). Exiting supervisor without restarting."
    Remove-Item $stopFlag -Force
    break
  }

  # Start-Process forbids stdout/stderr sharing one file, and truncates on
  # open, so each attempt gets its own pair of files (bounded: one pair per
  # restart, and restarts are themselves bounded by backoff).
  $dateStamp = Get-Date -Format 'yyyy-MM-dd'
  $outLog = Join-Path $logDir "daemon-$dateStamp-attempt$attempt.out.log"
  $errLog = Join-Path $logDir "daemon-$dateStamp-attempt$attempt.err.log"
  Log-Supervisor "Launch attempt $attempt -> $outLog"

  $proc = Start-Process -FilePath 'npx.cmd' -ArgumentList @('tsx', 'src\daemon\index.ts') `
    -WorkingDirectory $repoRoot -NoNewWindow -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  Wait-Process -Id $proc.Id -ErrorAction SilentlyContinue
  $exitCode = $proc.ExitCode
  Log-Supervisor "Attempt $attempt exited (code $exitCode)."

  if (Test-Path $stopFlag) {
    Log-Supervisor "Stop flag present after exit. Not restarting."
    Remove-Item $stopFlag -Force
    break
  }

  $delay = $backoffSeconds[[Math]::Min($attempt, $backoffSeconds.Length - 1)]
  Log-Supervisor "Restarting in $delay s (next attempt $($attempt + 1))."
  Start-Sleep -Seconds $delay
  $attempt++
}
