param([Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9][a-z0-9-]+$')][string]$RunId, [string]$Grep, [ValidatePattern('^[a-z0-9-]+$')][string]$Attempt=('attempt-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')))
$ErrorActionPreference='Stop'
$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$workspaceRoot=[IO.Path]::GetFullPath((Join-Path $repoRoot '../..'))
$projectName='adapt-learn-graph-c3-pathway-'+$RunId
$containers=@(& docker ps -a --filter "label=com.docker.compose.project=$projectName" --format '{{.ID}}')
if($LASTEXITCODE -ne 0 -or !$containers){throw 'Owned C3 stack required'}
foreach($id in $containers){
  $container=((& docker inspect $id)-join "`n"|ConvertFrom-Json)[0]
  if($container.Config.Labels.'com.docker.compose.project' -ne $projectName){throw 'Foreign container refused'}
  foreach($mount in $container.Mounts){if($mount.Type -eq 'volume' -and !$mount.Name.StartsWith($projectName+'_')){throw 'Unverified volume refused'}}
}
$seed=((& docker inspect "$projectName-workspace-seed-1")-join "`n"|ConvertFrom-Json)[0]
$env:C3_WORKSPACE_PASSWORD=($seed.Config.Env|Where-Object {$_.StartsWith('WORKSPACE_DEVELOPMENT_FIXTURES_PASSWORD=')}) -replace '^WORKSPACE_DEVELOPMENT_FIXTURES_PASSWORD=',''
if(!$env:C3_WORKSPACE_PASSWORD){throw 'Isolated workspace fixture password not available'}
$env:C3_COMPOSE_PROJECT=$projectName
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:38088'
$env:C3_ARTIFACT_DIR=Join-Path $workspaceRoot ('.tools/cluster3/'+$RunId+'/'+$Attempt)
New-Item -ItemType Directory -Force -Path $env:C3_ARTIFACT_DIR | Out-Null
Write-Output ('C3 artifacts: '+$env:C3_ARTIFACT_DIR)
$env:C3_EXPERT_EMAIL='expert@workspace.dev.invalid'
$env:C3_EMPLOYEE_EMAIL='employee-se@workspace.dev.invalid'
$env:C3_MANAGER_EMAIL='ld@workspace.dev.invalid'
$env:C3_OCCUPATION_ID='OCC-15-1252.00'
# Fixture inputs from published local catalog metadata; expected order/hash are independently asserted.
$env:C3_ROLE_ID='ROLE-CBAF88DF6DE7'
$env:C3_LEVEL_ID='LV-CBAF88DF6DE7-M'
Push-Location (Join-Path $repoRoot 'frontend')
try { if($Grep){ & npx.cmd --no-install playwright test --config=playwright.initial-pathway.config.ts --grep $Grep }else{ & npx.cmd --no-install playwright test --config=playwright.initial-pathway.config.ts }; $result=$LASTEXITCODE }
finally { Pop-Location; Remove-Item Env:C3_WORKSPACE_PASSWORD }
exit $result
