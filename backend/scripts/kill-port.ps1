param([int]$Port = 4000)

$processIds = @(
  Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
)

if (-not $processIds -or $processIds.Count -eq 0) {
  Write-Host "No process listening on port $Port."
  exit 0
}

foreach ($processId in $processIds) {
  if (-not $processId) { continue }
  Write-Host "Stopping PID $processId (port $Port)..."
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 300

$stillBound = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($stillBound) {
  Write-Host "Warning: port $Port may still be in use. Retry or close the other terminal."
  exit 1
}

Write-Host "Port $Port is free."
