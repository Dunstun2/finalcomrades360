$p = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($p) {
    Stop-Process -Id $p.OwningProcess -Force
    Write-Host "Process on port 5000 killed."
} else {
    Write-Host "No process found on port 5000."
}
