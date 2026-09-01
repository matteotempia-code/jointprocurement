[CmdletBinding()]
param(
  [string]$RepositoryRoot
)

$ErrorActionPreference = "Continue"
if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$minimumNode = [version]"20.9.0"
$minimumPostgresMajor = 16
$expectedDatabase = "joint_procurement_os"
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
  $line = Get-Content -LiteralPath $Path | Where-Object {
    $_ -match ("^\s*" + [regex]::Escape($Name) + "\s*=")
  } | Select-Object -First 1
  if (-not $line) { return $null }
  $value = ($line -split "=", 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Find-Psql {
  $command = Get-Command psql -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $root = "C:\Program Files\PostgreSQL"
  if (-not (Test-Path -LiteralPath $root)) { return $null }
  return Get-ChildItem -LiteralPath $root -Filter psql.exe -Recurse -ErrorAction SilentlyContinue |
    Sort-Object { try { [version]$_.Directory.Parent.Name } catch { [version]"0.0" } } -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

function Convert-ToPsqlUrl {
  param([string]$Url)
  # Prisma accepts ?schema=public; libpq/psql does not. Preserve any other query parameters.
  $clean = $Url -replace "([?&])schema=[^&]*&?", '$1'
  $clean = $clean -replace "\?&", "?"
  return $clean.TrimEnd([char[]]"?&")
}

Push-Location -LiteralPath $RepositoryRoot
try {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $nodeText = (& $node.Source --version 2>$null).TrimStart("v")
    $nodeVersion = $null
    $nodeOk = [version]::TryParse($nodeText, [ref]$nodeVersion) -and $nodeVersion -ge $minimumNode
    Set-Result "Node" $nodeOk "versione $nodeText; richiesta >= $minimumNode"
  } else {
    Set-Result "Node" $false "node non trovato"
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    $npmVersion = (& $npm.Source --version 2>$null)
    Set-Result "npm" ($LASTEXITCODE -eq 0) "versione $npmVersion"
  } else {
    Set-Result "npm" $false "npm non trovato"
  }

  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    $gitVersion = (& $git.Source --version 2>$null)
    Set-Result "Git" ($LASTEXITCODE -eq 0) $gitVersion
  } else {
    Set-Result "Git" $false "git non trovato"
  }

  $psqlPath = Find-Psql
  if ($psqlPath) {
    $psqlVersionText = (& $psqlPath --version 2>$null)
    $majorMatch = [regex]::Match($psqlVersionText, "(\d+)(?:\.\d+)?$")
    $postgresOk = $majorMatch.Success -and [int]$majorMatch.Groups[1].Value -ge $minimumPostgresMajor
    Set-Result "PostgreSQL" $postgresOk "$psqlVersionText; richiesto >= $minimumPostgresMajor"
  } else {
    Set-Result "PostgreSQL" $false "client psql non trovato (controllato anche C:\Program Files\PostgreSQL)"
  }

  $dotenvPath = Join-Path $RepositoryRoot ".env"
  $databaseUrl = $env:DATABASE_URL
  if ([string]::IsNullOrWhiteSpace($databaseUrl)) { $databaseUrl = Get-DotEnvValue $dotenvPath "DATABASE_URL" }
  $environmentOk = -not [string]::IsNullOrWhiteSpace($databaseUrl) -and $databaseUrl -notmatch "CHANGE_ME"
  Set-Result "Environment" $environmentOk $(if ($environmentOk) { "DATABASE_URL configurata; valori segreti non mostrati" } else { "creare .env da .env.example e configurare DATABASE_URL" })

  $databaseOk = $false
  $databaseName = $null
  if ($environmentOk -and $psqlPath) {
    $psqlUrl = Convert-ToPsqlUrl $databaseUrl
    $databaseOutput = & $psqlPath --dbname $psqlUrl --tuples-only --no-align --command "select current_database();" 2>$null
    if ($LASTEXITCODE -eq 0) {
      $databaseName = ($databaseOutput | Select-Object -First 1).Trim()
      $databaseOk = $databaseName -eq $expectedDatabase
    }
  }
  Set-Result "Database" $databaseOk $(if ($databaseOk) { "connessione riuscita a $databaseName" } else { "connessione non riuscita o database diverso da $expectedDatabase" })

  $migrationDirectories = @(Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot "prisma\migrations") -Directory -ErrorAction SilentlyContinue | Sort-Object Name)
  $migrationFilesOk = $migrationDirectories.Count -gt 0 -and @($migrationDirectories | Where-Object { -not (Test-Path -LiteralPath (Join-Path $_.FullName "migration.sql")) }).Count -eq 0
  $migrationsOk = $false
  if ($databaseOk -and $migrationFilesOk) {
    $migrationSql = "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null order by migration_name;"
    $migrationUrl = Convert-ToPsqlUrl $databaseUrl
    $applied = @($migrationSql | & $psqlPath --dbname $migrationUrl --tuples-only --no-align 2>$null | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() })
    $expected = @($migrationDirectories | ForEach-Object { $_.Name })
    $missing = @($expected | Where-Object { $_ -notin $applied })
    $unexpected = @($applied | Where-Object { $_ -notin $expected })
    $migrationsOk = $missing.Count -eq 0 -and $unexpected.Count -eq 0
    $migrationDetail = "$($applied.Count)/$($expected.Count) migration applicate"
    if ($missing.Count) { $migrationDetail += "; mancanti: $($missing -join ', ')" }
    if ($unexpected.Count) { $migrationDetail += "; non presenti nel repository: $($unexpected -join ', ')" }
  } else {
    $migrationDetail = "database non disponibile o file migration incompleti"
  }
  Set-Result "Migrations" $migrationsOk $migrationDetail

  $seedFiles = @(
    "prisma\schema.prisma",
    "prisma\seed.ts",
    "prisma\seed-smart-import.ts",
    "scripts\generate-demo-imports.ts",
    "demo-imports\listino-alfa-medical-2027.xlsx",
    "demo-imports\listino-alfa-medical-2028.xlsx",
    "demo-imports\listino-medika-testuale.pdf",
    "demo-imports\offerta-caresupply-sporca.csv",
    "public\documents\scheda-tecnica-demo.pdf",
    "public\documents\scheda-sicurezza-demo.pdf",
    "public\documents\certificazione-demo.pdf",
    "public\documents\dichiarazione-conformita-demo.pdf"
  )
  $missingSeed = @($seedFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $_)) })
  $seedOk = $migrationFilesOk -and $missingSeed.Count -eq 0
  Set-Result "Seed assets" $seedOk $(if ($seedOk) { "schema, seed, fixture import e documenti demo presenti" } else { "mancanti: $($missingSeed -join ', ')" })

  $smartImportFiles = @(
    "src\lib\imports\service.ts",
    "src\lib\imports\parser.ts",
    "src\lib\imports\provider.ts",
    "src\app\imports\page.tsx",
    "docs\SMART_IMPORT.md"
  )
  $missingSmartImport = @($smartImportFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $_)) })
  $smartImportFixtures = @(
    "demo-imports\listino-alfa-medical-2027.xlsx",
    "demo-imports\listino-alfa-medical-2028.xlsx",
    "demo-imports\listino-medika-testuale.pdf",
    "demo-imports\offerta-caresupply-sporca.csv"
  )
  $smartImportFixturesOk = @($smartImportFixtures | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $_)) }).Count -eq 0
  $smartImportOk = $missingSmartImport.Count -eq 0 -and $smartImportFixturesOk
  Set-Result "Smart Import" $smartImportOk $(if ($smartImportOk) { "pipeline, provider locale, documentazione e fixture presenti" } else { "mancanti: $($missingSmartImport -join ', ')" })

  $videoFiles = @(
    "scripts\video-demo\prepare.mjs",
    "scripts\video-demo\check.mjs",
    "scripts\video-demo\run.mjs",
    "scripts\video-demo\assemble.mjs",
    "scripts\video-demo\validate-final.mjs",
    "src\app\demo-roadmap\page.tsx",
    "docs\VIDEO_DEMO.md"
  )
  $missingVideo = @($videoFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $_)) })
  $sceneCount = @(Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot "scripts\video-demo\scenes") -Filter "*.mjs" -File -ErrorAction SilentlyContinue).Count
  $package = $null
  if (Test-Path -LiteralPath (Join-Path $RepositoryRoot "package.json")) {
    $package = Get-Content -LiteralPath (Join-Path $RepositoryRoot "package.json") -Raw | ConvertFrom-Json
  }
  $videoCommandsOk = $package -and $package.scripts.'demo:video:prepare' -and $package.scripts.'demo:video:check' -and $package.scripts.'demo:video'
  $videoOk = $missingVideo.Count -eq 0 -and $sceneCount -eq 9 -and $videoCommandsOk
  Set-Result "Video Demo" $videoOk $(if ($videoOk) { "9 scene e comandi di preparazione, readiness, recording e assembly presenti" } else { "scene=$sceneCount; mancanti: $($missingVideo -join ', ')" })
} finally {
  Pop-Location
}

Write-Output ""
Write-Output "JOINT PROCUREMENT OS - ENVIRONMENT CHECK"
Write-Output ""
$order = @("Node", "npm", "Git", "PostgreSQL", "Environment", "Database", "Migrations", "Seed assets", "Smart Import", "Video Demo")
foreach ($name in $order) {
  Write-Output (($name.PadRight(22, ".")) + " " + $results[$name])
}
$overall = if (@($results.Values | Where-Object { $_ -ne "PASS" }).Count -eq 0) { "READY" } else { "NOT READY" }
Write-Output ""
Write-Output (("OVERALL").PadRight(22, ".") + " " + $overall)
Write-Output ""
Write-Output "Dettagli (nessun segreto viene stampato):"
$details | ForEach-Object { Write-Output ("- " + $_) }

if ($overall -ne "READY") { exit 1 }
