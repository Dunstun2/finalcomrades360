param (
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "Searching for processes on port $Port..." -ForegroundColor Cyan

$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($process) {
    $pidToKill = $process.OwningProcess
    $processName = (Get-Process -Id $pidToKill).ProcessName
    Write-Host "Found process '$processName' (PID: $pidToKill) on port $Port. Killing it..." -ForegroundColor Yellow
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    Write-Host "Process terminated successfully." -ForegroundColor Green
} else {
    Write-Host "No process found listening on port $Port." -ForegroundColor Gray
}
