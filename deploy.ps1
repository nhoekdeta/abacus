# Publish the current changes to GitHub Pages.
#
#   Usage:  .\deploy.ps1 "what I changed"
#           .\deploy.ps1            (uses a default message)
#
# What it does:
#   1. Bumps the service-worker cache version in sw.js  (peanick-ponita-vN -> vN+1)
#      so returning visitors get the new files instead of stale cached ones.
#   2. Commits everything.
#   3. Pushes to origin/main -> GitHub Pages rebuilds in ~1 minute.
#
# Live site: https://nhoekdeta.github.io/abacus/

param(
  [string]$Message = "Update site"
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# Make sure git is reachable even if it's not on PATH.
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  $env:Path += ";C:\Program Files\Git\cmd"
}

# --- 1. bump service-worker cache version -------------------------------------
$swPath = Join-Path $PSScriptRoot "sw.js"
$sw = Get-Content -Raw -Path $swPath
$m = [regex]::Match($sw, 'peanick-ponita-v(\d+)')
if (-not $m.Success) {
  Write-Error "Could not find the cache version string in sw.js"
}
$old = [int]$m.Groups[1].Value
$new = $old + 1
$sw = $sw -replace 'peanick-ponita-v\d+', "peanick-ponita-v$new"
Set-Content -Path $swPath -Value $sw -NoNewline
Write-Host "sw.js cache: v$old -> v$new" -ForegroundColor Cyan

# --- 2. commit --------------------------------------------------------------
git add -A
if (git diff --cached --quiet; $LASTEXITCODE -eq 0) {
  Write-Host "Nothing to commit." -ForegroundColor Yellow
  exit 0
}
git commit -m $Message

# --- 3. push --------------------------------------------------------------
git push
Write-Host ""
Write-Host "Pushed. GitHub Pages will rebuild in about a minute:" -ForegroundColor Green
Write-Host "  https://nhoekdeta.github.io/abacus/" -ForegroundColor Green
