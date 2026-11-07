$ErrorActionPreference = 'Stop'
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { throw 'Run .\setup.ps1 first.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'frontend\dist\index.html'))) { throw 'Run .\setup.ps1 -RebuildFrontend first.' }
Set-Location -LiteralPath (Join-Path $PSScriptRoot 'backend')
Write-Host 'Open http://127.0.0.1:8000. Press Ctrl+C here to stop.'
& $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000
