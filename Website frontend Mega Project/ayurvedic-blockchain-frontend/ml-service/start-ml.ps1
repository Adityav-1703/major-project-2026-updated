# Stop any old ML service on port 5001 (duplicate processes cause 160 vs 224 errors)
Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Set-Location $PSScriptRoot
Write-Host "Starting AyurAuth ML service (models/herbal_auth_improved_final.h5 = 224x224)..."
python app.py
