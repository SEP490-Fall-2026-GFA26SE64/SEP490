[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$PostgresPort
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$environmentFile = Join-Path $projectRoot '.env'

if (-not (Test-Path $environmentFile)) {
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $databaseBytes = New-Object byte[] 32
        $graphBytes = New-Object byte[] 32
        $generator.GetBytes($databaseBytes)
        $generator.GetBytes($graphBytes)
        $databasePassword = [BitConverter]::ToString($databaseBytes).Replace('-', '').ToLowerInvariant()
        $graphPassword = [BitConverter]::ToString($graphBytes).Replace('-', '').ToLowerInvariant()
        $content = "DB_PASSWORD=$databasePassword`nNEO4J_PASSWORD=$graphPassword`nPOSTGRES_PORT=5432`nNEO4J_HTTP_PORT=7474`nNEO4J_BOLT_PORT=7687`nWEB_PORT=8088`n"
        $stream = [System.IO.File]::Open($environmentFile, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
        try {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
            $stream.Write($bytes, 0, $bytes.Length)
        } finally {
            $stream.Dispose()
        }
        Write-Output 'Generated local-only database credentials in the ignored .env file. Credentials are not displayed.'
    } finally {
        $generator.Dispose()
        $databasePassword = $null
        $graphPassword = $null
        $content = $null
    }
}

if ($PSBoundParameters.ContainsKey('PostgresPort')) {
    $settings = [System.IO.File]::ReadAllLines($environmentFile)
    $settings = @($settings | Where-Object { $_ -notmatch '^\s*POSTGRES_PORT\s*=' }) + "POSTGRES_PORT=$PostgresPort"
    [System.IO.File]::WriteAllLines($environmentFile, $settings, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "Configured PostgreSQL host port $PostgresPort in the local environment file."
}

Push-Location $projectRoot
try {
    docker compose --profile tools config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration. Check your local environment settings.' }
    docker compose up -d --wait --wait-timeout 180 postgres neo4j
    if ($LASTEXITCODE -ne 0) { throw 'Database startup failed. Existing volumes and credentials were left unchanged.' }
    docker compose --profile tools run --build --rm migrate
    if ($LASTEXITCODE -ne 0) { throw 'Database migrations failed. The catalog remains uninitialized; inspect the migration error before retrying.' }
    docker compose ps postgres neo4j
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect database services.' }
    Write-Output 'Database schemas initialized. No learner accounts or catalog release data were seeded.'
} finally {
    Pop-Location
}