# Cleanly stops the JARVIS daemon supervisor loop (scripts/daemon-service.ps1)
# without it immediately restarting itself, by dropping a stop-flag file the
# loop checks between attempts, then stopping the current daemon process.
#
# Note: Node.js on Windows has no reliable SIGINT-equivalent for a process
# with no attached console (as used here, via Start-Process -NoNewWindow),
# so this performs a hard stop of the current attempt rather than a graceful
# in-process shutdown handler run. The daemon has no in-flight local state
# that a hard stop corrupts — task claims are lease-based and safely
# reclaimed by another poll cycle after lease expiry.

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$stateDir = Join-Path $repoRoot '.jarvis\state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType File -Force -Path (Join-Path $stateDir 'daemon-service.stop') | Out-Null

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*daemon/index.ts*' -or $_.CommandLine -like '*daemon\index.ts*' } |
  ForEach-Object {
    Write-Host "Stopping daemon process $($_.ProcessId)..."
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host 'Stop flag set and current daemon process(es) stopped.'
