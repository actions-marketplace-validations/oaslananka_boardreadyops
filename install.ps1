param(
  [string]$Version = $env:BOARDREADYOPS_VERSION,
  [string]$InstallDir = $env:BOARDREADYOPS_INSTALL_DIR
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-BoardReadyOpsDownload {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [Parameter(Mandatory = $true)]
    [string]$OutFile
  )

  $parameters = @{
    Uri = $Uri
    OutFile = $OutFile
  }

  if ($PSVersionTable.PSVersion.Major -lt 6) {
    $parameters.UseBasicParsing = $true
  }

  Invoke-WebRequest @parameters
}

if (-not $Version) {
  $Version = "latest"
}

if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne "X64") {
  throw "BoardReadyOps Windows binaries currently support x64 only."
}

$repo = if ($env:BOARDREADYOPS_REPO) { $env:BOARDREADYOPS_REPO } else { "oaslananka/boardreadyops" }
$asset = "boardreadyops-win-x64.exe"
$downloadRoot = if ($Version -eq "latest") {
  "https://github.com/$repo/releases/latest/download"
} else {
  "https://github.com/$repo/releases/download/v$($Version.TrimStart('v'))"
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "boardreadyops-$([System.Guid]::NewGuid())"
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  $binaryPath = Join-Path $tempDir $asset
  $checksumsPath = Join-Path $tempDir "SHA256SUMS"
  Invoke-BoardReadyOpsDownload -Uri "$downloadRoot/$asset" -OutFile $binaryPath
  Invoke-BoardReadyOpsDownload -Uri "$downloadRoot/SHA256SUMS" -OutFile $checksumsPath

  $checksumLine = Get-Content $checksumsPath | Where-Object { $_ -match "\s$([regex]::Escape($asset))$" } | Select-Object -First 1
  if (-not $checksumLine) {
    throw "SHA256SUMS does not include $asset."
  }

  $expected = ($checksumLine -split "\s+")[0].ToLowerInvariant()
  $actual = (Get-FileHash -Path $binaryPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($expected -ne $actual) {
    throw "Checksum verification failed for $asset."
  }

  if (-not $InstallDir) {
    $InstallDir = Join-Path $env:LOCALAPPDATA "BoardReadyOps\bin"
  }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

  $installedBinary = Join-Path $InstallDir "boardreadyops.exe"
  Copy-Item -Path $binaryPath -Destination $installedBinary -Force

  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $userPathEntries = if ($userPath) { $userPath.Split(";") } else { @() }
  if ($userPathEntries -notcontains $InstallDir) {
    $nextPath = if ($userPath) { "$userPath;$InstallDir" } else { $InstallDir }
    [Environment]::SetEnvironmentVariable("Path", $nextPath, "User")
  }

  $sessionPathEntries = if ($env:Path) { $env:Path.Split(";") } else { @() }
  if ($sessionPathEntries -notcontains $InstallDir) {
    $env:Path = if ($env:Path) { "$env:Path;$InstallDir" } else { $InstallDir }
  }

  Write-Host "Installed boardreadyops to $installedBinary"
} finally {
  Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
