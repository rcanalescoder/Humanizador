param([switch]$Check, [switch]$Configure)
$ErrorActionPreference = 'Stop'
function Test-Node {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCommand) { return $false }
  $versionText = & node -p process.versions.node
  return ($LASTEXITCODE -eq 0 -and ([version]$versionText).Major -ge 24)
}
Write-Host 'Humanizador - preparar Node.js en Windows' -ForegroundColor Cyan
if (-not (Test-Node)) {
  Write-Host 'Necesitas Node.js 24 o posterior con npm: https://nodejs.org/en/download' -ForegroundColor Yellow
  if ($Check) { exit 1 }
  $answer = Read-Host 'Abrir la descarga oficial? [S/n]'
  if ($answer -notmatch '^(n|no)$') { Start-Process 'https://nodejs.org/en/download' }
  Write-Host 'Completa el instalador de Node.js para Windows. Incluye npm y permite agregarlo a PATH.'
  Read-Host 'Pulsa Intro cuando hayas terminado' | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  if (-not (Test-Node)) { Write-Host 'Abre una terminal nueva y repite instalar.ps1.' -ForegroundColor Yellow; exit 1 }
}
Push-Location $PSScriptRoot
try {
  $arguments = @()
  if ($Check) { $arguments += '--check' }
  if ($Configure) { $arguments += '--configure' }
  & node (Join-Path $PSScriptRoot 'tools/install.mjs') @arguments
  exit $LASTEXITCODE
} finally { Pop-Location }
