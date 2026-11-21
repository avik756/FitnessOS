# Run from anywhere: . C:\FitnessOS\demo.ps1 (dot-source to retain $testDb afterwards).
$testDb = Join-Path $PSScriptRoot 'databases\fitnessos-demo-month.sqlite3'
if (-not (Test-Path -LiteralPath $testDb -PathType Leaf)) {
    throw 'Demo database missing. Run: python -m backend.create_demo_database from C:\FitnessOS'
}
Push-Location $PSScriptRoot
try {
    python -m backend.app --database $testDb --port 8001
} finally {
    Pop-Location
}
