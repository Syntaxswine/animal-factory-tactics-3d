param([ValidateRange(1024,65535)][int]$Port = 4460)
$ErrorActionPreference = 'Stop'
$env:PORT = [string]$Port
Write-Host "Window study: http://127.0.0.1:$Port/tactics/animal-window-study.html"
& node (Join-Path $PSScriptRoot 'tools/serve.mjs')
exit $LASTEXITCODE
