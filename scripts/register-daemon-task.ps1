# Registers the JARVIS daemon supervisor (scripts/daemon-service.ps1) as a
# Windows Task Scheduler task that starts automatically at user logon.
#
# Run this once, interactively, as the normal Windows user who should run
# the daemon (no elevation required/used — LogonTrigger + current user is
# sufficient; this deliberately does NOT request admin rights).
#
# Re-run safely: unregisters any prior task with the same name first.

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$serviceScript = Join-Path $repoRoot 'scripts\daemon-service.ps1'
$taskName = 'JARVIS-Daemon'

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Write-Host "Removing existing task '$taskName'..."
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# -WindowStyle Hidden: no visible console window.
# -ExecutionPolicy Bypass: scoped to this single process invocation only,
# does not change the machine/user execution policy.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$serviceScript`"" `
  -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn

# Run only as the current interactive user (no elevation, no SYSTEM
# account) — matches "run as normal user unless elevation is genuinely
# required" from the autostart requirements.
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings `
  -Description 'Starts the JARVIS local daemon (src/daemon) at user logon. Managed by scripts/daemon-service.ps1 (its own bounded restart-on-failure loop); Task Scheduler RestartCount/RestartInterval is a secondary safety net for the supervisor script itself.' `
  | Out-Null

Write-Host "Registered scheduled task '$taskName' (AtLogOn, current user, no elevation)."
Write-Host "Start it now without logging out via: Start-ScheduledTask -TaskName '$taskName'"
