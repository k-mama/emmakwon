[CmdletBinding()]
param(
    [switch]$SkipVenv,
    [switch]$ForceFFmpeg
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

if ($env:OS -ne "Windows_NT") {
    throw "This build script must run on Windows."
}

if ($SkipVenv) {
    $Python = "python"
} else {
    $Venv = Join-Path $Root ".build-venv"
    if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            & py -3.11 -m venv $Venv
        } else {
            & python -m venv $Venv
        }
    }
    $Python = Join-Path $Venv "Scripts\python.exe"
}

& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $Root "requirements\build.txt")

$FFmpegArgs = @((Join-Path $Root "build\provision_ffmpeg.py"))
if ($ForceFFmpeg) { $FFmpegArgs += "--force" }
& $Python @FFmpegArgs

$Dist = Join-Path $Root "dist"
$Work = Join-Path $Root "build\pyinstaller-work"
if (Test-Path $Dist) { Remove-Item -Recurse -Force $Dist }
if (Test-Path $Work) { Remove-Item -Recurse -Force $Work }

& $Python -m PyInstaller `
    --noconfirm `
    --clean `
    --distpath $Dist `
    --workpath $Work `
    (Join-Path $Root "build\EmmaVideoTranscriber.spec")

$Exe = Join-Path $Dist "EmmaVideoTranscriber\EmmaVideoTranscriber.exe"
if (-not (Test-Path $Exe)) {
    throw "Build did not produce $Exe"
}

& $Exe --self-check
if ($LASTEXITCODE -ne 0) {
    throw "Packaged runtime self-check failed with exit code $LASTEXITCODE"
}

$Zip = Join-Path $Dist "EmmaVideoTranscriber-portable.zip"
if (Test-Path $Zip) { Remove-Item -Force $Zip }
Compress-Archive -Path (Join-Path $Dist "EmmaVideoTranscriber\*") -DestinationPath $Zip -CompressionLevel Optimal

Write-Host "Built: $Exe"
Write-Host "Portable artifact: $Zip"
