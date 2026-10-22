# Check if .env already exists; if not, generate secure credentials
if (-not (Test-Path ".env")) {
    Write-Host "[+] Generating secure random credentials for first-time setup..." -ForegroundColor Cyan
    
    # Generate 32-character random hex strings for DB Password & JWT Secret
    $dbPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

    # Save to local .env file in UTF8
    $envContent = @"
POSTGRES_USER=family_admin
POSTGRES_PASSWORD=$dbPass
POSTGRES_DB=family_rewards
JWT_SECRET=$jwtSecret
"@
    Set-Content -Path ".env" -Value $envContent -Encoding UTF8

    Write-Host "[OK] .env file created with secure auto-generated credentials!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Existing .env file detected. Using stored credentials." -ForegroundColor Yellow
}

# Launch Docker containers
Write-Host "[+] Launching Family Rewards Kiosk Stack..." -ForegroundColor Cyan
docker compose up -d --build