param([switch]$RebuildFrontend)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
New-Item -ItemType Directory -Force -Path '.tmp' | Out-Null
$env:TEMP = (Resolve-Path '.tmp').Path
$env:TMP = $env:TEMP
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    & python -m venv .venv
    if (-not (Test-Path -LiteralPath $venvPython)) { throw 'Python 3.13 is required. Install it, then retry.' }
}
& python -m pip --python $venvPython install -r backend/requirements.lock.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
if (-not (Test-Path -LiteralPath '.env')) {
    $reviewSecret = & $venvPython -c 'import secrets; print(secrets.token_urlsafe(32))'
    $settings = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '.env.example')).Replace('REVIEWER_TOKEN=', "REVIEWER_TOKEN=$reviewSecret")
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $settings)
}
if ($RebuildFrontend -or -not (Test-Path -LiteralPath 'frontend\dist\index.html')) {
    Push-Location frontend
    try {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    } finally { Pop-Location }
}
Write-Host 'Ready. Add provider keys to .env, then run .\start.ps1.'
Write-Host 'The reviewer token is in your local .env. Do not commit that file.'
