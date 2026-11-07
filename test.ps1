$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
New-Item -ItemType Directory -Force -Path '.tmp' | Out-Null
$env:TEMP = (Resolve-Path '.tmp').Path
$env:TMP = $env:TEMP
Push-Location backend
try {
    & '..\.venv\Scripts\python.exe' -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
} finally { Pop-Location }
