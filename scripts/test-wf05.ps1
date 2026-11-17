param(
    [Parameter(Mandatory=$true)][string]$FixtureContainer,
    [string]$Maven,
    [string]$EvidenceDirectory
)
$ErrorActionPreference='Stop'
$productRoot=Split-Path -Parent $PSScriptRoot
$workspaceRoot=Split-Path -Parent (Split-Path -Parent $productRoot)
if (!$EvidenceDirectory) { $EvidenceDirectory=Join-Path $workspaceRoot ('.tools/wf05-test-plan-20261116/run-'+(Get-Date -Format 'yyyyMMdd-HHmmss')) }
if (!$Maven) {
    $cached=Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/wrapper/dists/apache-maven-3.9.11') -Filter mvn.cmd -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$cached) { throw 'Cached Maven 3.9.11 required; this runner never installs/downloads tools.' }
    $Maven=$cached.FullName
}
if (!(Test-Path -LiteralPath $Maven)) { throw 'Maven executable not found.' }
if ($FixtureContainer -notmatch '^wf05-p1-[a-z0-9-]+$') { throw 'Only an explicitly named wf05-p1 fixture is permitted.' }
$inspection=& docker inspect $FixtureContainer
if ($LASTEXITCODE -ne 0) { throw 'Fixture container unavailable.' }
$fixture=($inspection | ConvertFrom-Json)[0]
if ($fixture.Config.Labels.'codex.scope' -ne 'wf05-p1') { throw 'WF05 ownership label missing.' }
$binding=$fixture.NetworkSettings.Ports.'5432/tcp'
if ($binding.Count -ne 1 -or $binding[0].HostIp -ne '127.0.0.1' -or $binding[0].HostPort -ne '35432') { throw 'Fixture must bind only 127.0.0.1:35432; dev ports forbidden.' }
if ($fixture.Config.Env -notcontains 'POSTGRES_DB=wf05_p1' -or $fixture.Config.Env -notcontains 'POSTGRES_USER=wf05') { throw 'Unexpected fixture DB identity.' }
New-Item -ItemType Directory -Path $EvidenceDirectory -ErrorAction Stop | Out-Null
$runStarted=[DateTimeOffset]::Now.ToString('o')
$sourceDirectory=Join-Path $EvidenceDirectory 'sources'
New-Item -ItemType Directory -Path $sourceDirectory | Out-Null
$sources=@(Get-ChildItem -LiteralPath (Join-Path $productRoot 'backend/src/test/java/com/adaptlearngraph/services') -Filter 'WF05*Test.java')
$sources+=Get-Item -LiteralPath (Join-Path $productRoot 'frontend/src/features/employee/baseline-assessment/WF05AssessmentStates.test.tsx'),(Join-Path $productRoot 'frontend/src/features/employee/target-roles/WF05ServerRoleFlow.test.ts'),(Join-Path $productRoot 'frontend/src/features/employee/target-roles/currentRoleFlowApi.ts'),(Join-Path $productRoot 'frontend/src/features/manager/ontology/WF05ProvisionForm.test.ts'),$PSCommandPath
$sources | Copy-Item -Destination $sourceDirectory
$sources | Get-FileHash -Algorithm SHA256 | Select-Object Path,Hash | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $EvidenceDirectory 'source-hashes.json')
$env:WF05_JDBC_URL='jdbc:postgresql://127.0.0.1:35432/wf05_p1'
Push-Location $productRoot
try {
    & git rev-parse HEAD | Set-Content -Encoding UTF8 (Join-Path $EvidenceDirectory 'head.txt')
    & git diff -- backend/pom.xml backend/src/main/java/com/adaptlearngraph/repository/RequirementPathwayRevisions.java backend/src/main/java/com/adaptlearngraph/services/CertificateSubmissionService.java backend/src/main/java/com/adaptlearngraph/services/CertificateReviewService.java frontend/src/features/employee/target-roles/currentRoleFlowApi.ts | Set-Content -Encoding UTF8 (Join-Path $EvidenceDirectory 'product-fix.diff')
    Push-Location backend
    try {
        $ErrorActionPreference='Continue'
        & $Maven -o -Pwf05 test *> (Join-Path $EvidenceDirectory 'backend.log')
        $backendExit=$LASTEXITCODE
        $ErrorActionPreference='Stop'
        New-Item -ItemType Directory -Path (Join-Path $EvidenceDirectory 'junit') | Out-Null
        Get-ChildItem -LiteralPath 'target/surefire-reports' -Filter 'TEST-*WF05*.xml' | Copy-Item -Destination (Join-Path $EvidenceDirectory 'junit')
    } finally { Pop-Location }
    Push-Location frontend
    try {
        $ErrorActionPreference='Continue'
        & node node_modules/vitest/vitest.mjs run src/features/employee/baseline-assessment/WF05AssessmentStates.test.tsx src/features/employee/target-roles/WF05ServerRoleFlow.test.ts src/features/manager/ontology/WF05ProvisionForm.test.ts --reporter=verbose *> (Join-Path $EvidenceDirectory 'frontend.log')
        $frontendExit=$LASTEXITCODE
        $ErrorActionPreference='Stop'
    } finally { Pop-Location }
    @{ backendExit=$backendExit; frontendExit=$frontendExit; fixture=$FixtureContainer; startedAt=$runStarted; finishedAt=[DateTimeOffset]::Now.ToString('o'); scope='Layered partial P1 coverage; no E01/N01/remote CI claim' } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $EvidenceDirectory 'result.json')
    Write-Output "Evidence: $EvidenceDirectory"
    if ($backendExit -ne 0 -or $frontendExit -ne 0) { exit 1 }
} finally { Pop-Location }
