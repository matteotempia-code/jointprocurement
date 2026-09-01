[CmdletBinding()]
param([string]$RepositoryRoot)

$ErrorActionPreference = "Continue"
if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$minimumNode = [version]"20.9.0"
$results = [ordered]@{}
$details = New-Object System.Collections.Generic.List[string]

function Set-Result {
  param([string]$Name, [bool]$Passed, [string]$Detail)
  $script:results[$Name] = if ($Passed) { "PASS" } else { "FAIL" }
  if ($Detail) { $script:details.Add("$Name - $Detail") }
}

function Get-DotEnvValue {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ("^\s*" + [regex]::Escape($Name) + "\s*=") } | Select-Object -First 1
  if (-not $line) { return $null }
  $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  return $value
}

Push-Location -LiteralPath $RepositoryRoot
try {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $nodeText = (& $node.Source --version 2>$null).TrimStart("v")
    $nodeVersion = $null
    Set-Result "Node" ([version]::TryParse($nodeText, [ref]$nodeVersion) -and $nodeVersion -ge $minimumNode) "versione $nodeText; richiesta >= $minimumNode"
  } else { Set-Result "Node" $false "node non trovato" }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  Set-Result "npm" ($null -ne $npm) $(if ($npm) { "versione $(& $npm.Source --version 2>$null)" } else { "npm non trovato" })
  $git = Get-Command git -ErrorAction SilentlyContinue
  Set-Result "Git" ($null -ne $git) $(if ($git) { & $git.Source --version 2>$null } else { "git non trovato" })

  $dotenvPath = Join-Path $RepositoryRoot ".env"
  $requiredEnvironment = @("DATABASE_URL", "DIRECT_URL", "DOCUMENT_STORAGE_PROVIDER", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET")
  $missingEnvironment = @($requiredEnvironment | Where-Object {
    $value = [Environment]::GetEnvironmentVariable($_)
    if ([string]::IsNullOrWhiteSpace($value)) { $value = Get-DotEnvValue $dotenvPath $_ }
    [string]::IsNullOrWhiteSpace($value) -or $value -match "CHANGE_ME|PROJECT_REF|POOLER_HOST"
  })
  $provider = [Environment]::GetEnvironmentVariable("DOCUMENT_STORAGE_PROVIDER")
  if ([string]::IsNullOrWhiteSpace($provider)) { $provider = Get-DotEnvValue $dotenvPath "DOCUMENT_STORAGE_PROVIDER" }
  $environmentOk = $missingEnvironment.Count -eq 0 -and $provider -eq "supabase"
  Set-Result "Environment" $environmentOk $(if ($environmentOk) { "Supabase database e storage configurati; valori segreti non mostrati" } else { "variabili mancanti/non valide: $($missingEnvironment -join ', ')" })

  $migrationOutput = & npx prisma migrate status 2>&1
  $migrationsOk = $LASTEXITCODE -eq 0 -and ($migrationOutput -join " ") -match "Database schema is up to date"
  Set-Result "Migrations" $migrationsOk $(if ($migrationsOk) { "Supabase schema aggiornato" } else { "prisma migrate status non riuscito" })

  $storageOutput = & npm run storage:check 2>&1
  $storageOk = $LASTEXITCODE -eq 0 -and ($storageOutput -join " ") -match "OVERALL\.+ READY"
  Set-Result "Storage" $storageOk $(if ($storageOk) { "bucket privato e round-trip probe verificati" } else { "storage:check non pronto" })

  $requiredFiles = @(
    "prisma\schema.prisma", "prisma\seed.ts", "scripts\generate-demo-imports.ts",
    "demo-imports\listino-alfa-medical-2027.xlsx", "demo-imports\listino-alfa-medical-2028.xlsx",
    "demo-imports\listino-medika-testuale.pdf", "demo-imports\offerta-caresupply-sporca.csv",
    "src\lib\storage\index.ts", "src\lib\storage\supabase.ts", "src\lib\storage\local.ts",
    "docs\SMART_IMPORT.md", "docs\STORAGE_STRATEGY.md", "docs\HOME_OFFICE_WORKFLOW.md"
  )
  $missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $_)) })
  Set-Result "Source assets" ($missingFiles.Count -eq 0) $(if ($missingFiles.Count) { "mancanti: $($missingFiles -join ', ')" } else { "schema, fixture, adapter e documentazione presenti" })

  $sceneCount = @(Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot "scripts\video-demo\scenes") -Filter "*.mjs" -File -ErrorAction SilentlyContinue).Count
  Set-Result "Video Demo" ($sceneCount -eq 9) "$sceneCount/9 scene presenti"
} finally { Pop-Location }

Write-Output ""
Write-Output "JOINT PROCUREMENT OS - ENVIRONMENT CHECK"
Write-Output ""
$order = @("Node", "npm", "Git", "Environment", "Migrations", "Storage", "Source assets", "Video Demo")
foreach ($name in $order) { Write-Output (($name.PadRight(22, ".")) + " " + $results[$name]) }
$overall = if (@($results.Values | Where-Object { $_ -ne "PASS" }).Count -eq 0) { "READY" } else { "NOT READY" }
Write-Output ""
Write-Output (("OVERALL").PadRight(22, ".") + " " + $overall)
Write-Output ""
Write-Output "Dettagli (nessun segreto viene stampato):"
$details | ForEach-Object { Write-Output ("- " + $_) }
if ($overall -ne "READY") { exit 1 }
