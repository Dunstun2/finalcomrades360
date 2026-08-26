# Permanent Port Fix for Windows
# Run this script as Administrator once to prevent port conflicts

Write-Host "=== Windows Port Reservation Fix ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Stop Hyper-V services that reserve ports
Write-Host "1. Stopping Hyper-V services..." -ForegroundColor Yellow
try {
    Stop-Service -Name "hns" -Force -ErrorAction SilentlyContinue
    Stop-Service -Name "WinNAT" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Services stopped" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Some services not found (OK if Hyper-V not installed)" -ForegroundColor Yellow
}

# Reserve port 3000 for your application
Write-Host ""
Write-Host "2. Reserving port 3000 for your application..." -ForegroundColor Yellow
try {
    netsh int ipv4 add excludedportrange protocol=tcp startport=3000 numberofports=1 | Out-Null
    Write-Host "   ✓ Port 3000 reserved" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Port may already be reserved" -ForegroundColor Yellow
}

# Kill any stuck Node processes
Write-Host ""
Write-Host "3. Cleaning up Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "   ✓ Node processes cleaned" -ForegroundColor Green

# Restart network adapter to release stuck ports
Write-Host ""
Write-Host "4. Releasing stuck ports..." -ForegroundColor Yellow
netsh int ip reset | Out-Null
Write-Host "   ✓ Network stack reset" -ForegroundColor Green

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Port 3000 is now permanently reserved for your app." -ForegroundColor Green
Write-Host "Restart your computer for all changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "After restart, run: npm run dev" -ForegroundColor Cyan
