$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try { & node (Join-Path $PSScriptRoot 'tools/lifecycle.mjs') stop; exit $LASTEXITCODE }
finally { Pop-Location }
