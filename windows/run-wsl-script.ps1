param(
  [Parameter(Mandatory = $true)]
  [string]$Script,

  [switch]$PrintRoot
)

$ErrorActionPreference = 'Stop'

function Convert-ToBashQuoted([string]$Value) {
  return "'" + $Value.Replace("'", "'\''") + "'"
}

$projectPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

if ($projectPath -match '^\\\\wsl(?:\.localhost|\$)\\[^\\]+\\(.+)$') {
  $wslRoot = '/' + ($Matches[1] -replace '\\', '/')
} else {
  $wslRoot = (& wsl.exe wslpath -a $projectPath).Trim()
}

$wslRoot = (& wsl.exe bash -lc "cd $(Convert-ToBashQuoted $wslRoot) && pwd").Trim()

if (-not $wslRoot) {
  throw "Could not resolve this project folder inside WSL: $projectPath"
}

if ($PrintRoot) {
  Write-Output $wslRoot
  exit 0
}

$command = "cd $(Convert-ToBashQuoted $wslRoot) && bash $(Convert-ToBashQuoted $Script)"
& wsl.exe bash -lc $command
exit $LASTEXITCODE
