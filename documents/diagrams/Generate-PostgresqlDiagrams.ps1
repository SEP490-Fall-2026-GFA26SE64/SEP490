param([string]$Snapshot)
$ErrorActionPreference = 'Stop'
$generator = Join-Path $PSScriptRoot 'Generate-PostgresqlDiagrams.py'
if ($Snapshot) { python $generator --snapshot $Snapshot }
else { python $generator }
if ($LASTEXITCODE -ne 0) { throw 'Read-only PostgreSQL diagram generation failed.' }
