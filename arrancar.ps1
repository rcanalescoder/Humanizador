$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Falta Node.js 24 o posterior. Ejecuta instalar.ps1.' -ForegroundColor Yellow
    exit 1
}
Push-Location $PSScriptRoot
try { & node (Join-Path $PSScriptRoot 'tools/lifecycle.mjs') start; exit $LASTEXITCODE }
finally { Pop-Location }
