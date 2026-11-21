param(
    [ValidateRange(1024,65535)][int]$Port = 8001,
    [string]$LanAddress
)

# Fictional records only. Does not change firewall rules or expose public hosting.
$phoneDatabase = Join-Path $PSScriptRoot 'databases\fitnessos-demo-month.sqlite3'
if (-not (Test-Path -LiteralPath $phoneDatabase -PathType Leaf)) {
    throw 'Create the fictional database first: python -m backend.create_demo_database'
}
$phoneArguments = @('-m','backend.app','--database',$phoneDatabase,'--port',"$Port")
if ($LanAddress) {
    $phoneArguments += @('--lan-address',$LanAddress)
    Write-Host "Phone browser testing: http://${LanAddress}:$Port (same trusted network; HTTP is not installable)."
} else {
    Write-Host "Laptop / Chrome USB forwarding: http://localhost:$Port"
    Write-Host "In desktop Chrome open chrome://inspect/#devices and forward device port $Port to localhost:$Port."
}
Write-Host 'Fictional account: Demo Athlete / DemoPass123!'
Push-Location $PSScriptRoot
try { python @phoneArguments } finally { Pop-Location }
