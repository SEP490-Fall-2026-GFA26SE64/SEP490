param([Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9][a-z0-9-]+$')][string]$RunId, [switch]$Start)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot '../..'))
$projectName = 'adapt-learn-graph-c3-pathway-' + $RunId
$env:C3_COMPOSE_PROJECT = $projectName
$env:C3_BACKEND_IMAGE = 'adapt-learn-graph-c3-backend:' + $RunId
$env:C3_FRONTEND_IMAGE = 'adapt-learn-graph-c3-frontend:' + $RunId
$env:DB_PASSWORD = 'C3-db-' + [guid]::NewGuid().ToString('N')
$env:NEO4J_PASSWORD = 'C3-graph-' + [guid]::NewGuid().ToString('N')
$env:WORKSPACE_DEVELOPMENT_PASSWORD = 'C3-workspace-' + [guid]::NewGuid().ToString('N')
$env:C3_WORKSPACE_PASSWORD = $env:WORKSPACE_DEVELOPMENT_PASSWORD
$env:C3_EXPERT_EMAIL = 'expert@workspace.dev.invalid'
$env:C3_EMPLOYEE_EMAIL = 'employee-se@workspace.dev.invalid'
$env:C3_MANAGER_EMAIL = 'ld@workspace.dev.invalid'
$env:SYSTEM_TEST_BASE_URL = 'http://127.0.0.1:38088'
$env:C3_ARTIFACT_DIR = Join-Path $workspaceRoot ('.tools/cluster3/' + $RunId)
$composeArgs = @('--env-file','NUL','--project-directory',$repoRoot,'-p',$projectName,'-f',(Join-Path $repoRoot 'compose.dev.yml'),'-f',(Join-Path $PSScriptRoot 'initial-pathway.compose.yml'))
$resolvedText = & docker compose @composeArgs config --format json
if ($LASTEXITCODE -ne 0) { throw 'Blocked: Compose configuration could not be resolved' }
$resolved = ($resolvedText -join "`n") | ConvertFrom-Json
if ($resolved.name -ne $projectName) { throw 'Unsafe Compose project name' }
foreach ($volume in $resolved.volumes.PSObject.Properties) {
  if ($volume.Value.external -or !$volume.Value.name.StartsWith($projectName + '_')) { throw 'Unsafe volume identity' }
}
$backendServices = @('migrate','seed','workspace-seed','se-seed','api')
foreach ($serviceName in $backendServices) {
  if ($resolved.services.$serviceName.image -ne $env:C3_BACKEND_IMAGE) { throw "Unsafe backend image refused for $serviceName" }
}
if ($resolved.services.'platform-seed' -and $resolved.services.'platform-seed'.image -ne $env:C3_BACKEND_IMAGE) { throw 'Unsafe optional tools image refused' }
$allowedPorts = @(35432,38474,38687,38080,38088)
foreach ($service in $resolved.services.PSObject.Properties) {
  foreach ($port in $service.Value.ports) {
    if ($port.host_ip -ne '127.0.0.1' -or [int]$port.published -notin $allowedPorts) { throw 'Unsafe published port' }
  }
  foreach ($mount in $service.Value.volumes) {
    if ($mount.type -eq 'bind') {
      $mountPath = [IO.Path]::GetFullPath($mount.source)
      if (!$mountPath.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'External host mount refused' }
    }
  }
}
Write-Output "Validated isolated configuration: $projectName; ports $($allowedPorts -join ','); unique images/volumes. No service started."
if (!$Start) { return }
& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Blocked: Docker engine unavailable; no stack started' }
$existing = & docker ps -a --filter "label=com.docker.compose.project=$projectName" --format '{{.ID}}'
if ($LASTEXITCODE -ne 0 -or $existing) { throw 'Fresh run required: existing project resources refused' }
foreach ($volume in $resolved.volumes.PSObject.Properties) {
  $foundVolume = & docker volume ls --filter "name=^$($volume.Value.name)$" --format '{{.Name}}'
  if ($LASTEXITCODE -ne 0) { throw 'Cannot verify volume inventory' }
  if ($foundVolume) { throw 'Fresh run required: existing volume refused' }
}
foreach ($port in $allowedPorts) {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$port)
  try { $listener.Start() } finally { $listener.Stop() }
}
New-Item -ItemType Directory -Force -Path $env:C3_ARTIFACT_DIR | Out-Null
& docker compose @composeArgs build api web
if ($LASTEXITCODE -ne 0) { throw 'Test image build failed' }
& docker compose @composeArgs up -d
if ($LASTEXITCODE -ne 0) { throw 'Isolated startup failed; retain only this project for diagnosis' }
$ownedIds = & docker ps -a --filter "label=com.docker.compose.project=$projectName" --format '{{.ID}}'
if ($LASTEXITCODE -ne 0 -or !$ownedIds) { throw 'Cannot verify created project containers' }
foreach ($containerId in $ownedIds) {
  $container = ((& docker inspect $containerId) -join "`n" | ConvertFrom-Json)[0]
  if ($LASTEXITCODE -ne 0 -or $container.Config.Labels.'com.docker.compose.project' -ne $projectName) { throw 'Created container ownership mismatch' }
  foreach ($mount in $container.Mounts) {
    if ($mount.Type -eq 'volume' -and !$mount.Name.StartsWith($projectName + '_')) { throw 'Created volume ownership mismatch' }
  }
}
Write-Output "Created container labels and generated-volume mounts verified for $projectName."
# Never invoke down/reset, mutate existing resources or persist credentials/cookies.
# After inspecting health, set C3_ROLE_ID/C3_LEVEL_ID from this isolated catalog before Playwright.
