# =============================================================
# Azure Deployment Script for OrderFlow Management Platform
# =============================================================
# Prerequisites: Azure CLI installed and logged in (az login)
# Run from the project root: d:\Dhiraj\OrderFlowMgmt
# =============================================================

$ErrorActionPreference = "Stop"

# ---------- CONFIGURATION (edit these) ----------
$RESOURCE_GROUP  = "orderflow-rg"
$LOCATION        = "centralindia"              # Change to nearest Azure region
$APP_NAME        = "orderflow-demo"            # Must be globally unique
$MYSQL_SERVER    = "orderflow-db"              # Must be globally unique
$MYSQL_ADMIN     = "orderadmin"
$MYSQL_PASS      = "OrderFlow@2026!"           # Min 8 chars, uppercase+lowercase+number+special
$MYSQL_DB        = "ordermgmt"
$SKU             = "B1"                        # App Service (Basic tier)
$MYSQL_SKU       = "Standard_B1ms"             # MySQL (Burstable)
# -------------------------------------------------

Write-Host "`n=== Step 1: Creating Resource Group ===" -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

Write-Host "`n=== Step 2: Creating Azure MySQL Flexible Server ===" -ForegroundColor Cyan
az mysql flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $MYSQL_SERVER `
  --location $LOCATION `
  --admin-user $MYSQL_ADMIN `
  --admin-password $MYSQL_PASS `
  --sku-name $MYSQL_SKU `
  --tier Burstable `
  --storage-size 20 `
  --version 8.0.21 `
  --public-access 0.0.0.0 `
  --yes

Write-Host "`n=== Step 3: Creating MySQL Database ===" -ForegroundColor Cyan
az mysql flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $MYSQL_SERVER `
  --database-name $MYSQL_DB

Write-Host "`n=== Step 4: Disabling SSL enforcement for demo ===" -ForegroundColor Cyan
az mysql flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $MYSQL_SERVER `
  --name require_secure_transport `
  --value OFF

Write-Host "`n=== Step 5: Creating App Service Plan ===" -ForegroundColor Cyan
az appservice plan create `
  --name "$APP_NAME-plan" `
  --resource-group $RESOURCE_GROUP `
  --sku $SKU `
  --is-linux

Write-Host "`n=== Step 6: Creating Web App ===" -ForegroundColor Cyan
az webapp create `
  --resource-group $RESOURCE_GROUP `
  --plan "$APP_NAME-plan" `
  --name $APP_NAME `
  --runtime "PYTHON:3.11"

Write-Host "`n=== Step 7: Configuring Environment Variables ===" -ForegroundColor Cyan
$MYSQL_HOST = "$MYSQL_SERVER.mysql.database.azure.com"
$DATABASE_URL = "mysql+pymysql://${MYSQL_ADMIN}:${MYSQL_PASS}@${MYSQL_HOST}:3306/${MYSQL_DB}"
$JWT_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --settings `
    DATABASE_URL="$DATABASE_URL" `
    JWT_SECRET="$JWT_SECRET" `
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    WEBSITES_PORT="8000"

Write-Host "`n=== Step 8: Setting Startup Command ===" -ForegroundColor Cyan
az webapp config set `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --startup-file "startup.sh"

Write-Host "`n=== Step 9: Building React Frontend ===" -ForegroundColor Cyan
Push-Location frontend
npm install
npm run build
Pop-Location

Write-Host "`n=== Step 10: Creating deployment package ===" -ForegroundColor Cyan
# Create a zip excluding unnecessary files
$excludeDirs = @("node_modules", ".venv", "venv", ".git", "__pycache__", "frontend\node_modules", "frontend\src", "frontend\public")
$zipPath = "$env:TEMP\orderflow-deploy.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath }

# Use Compress-Archive with selected folders
$itemsToZip = @("backend", "frontend\build", "startup.sh")
$tempDir = "$env:TEMP\orderflow-stage"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy backend
Copy-Item -Path "backend" -Destination "$tempDir\backend" -Recurse
# Remove __pycache__
Get-ChildItem -Path "$tempDir\backend" -Directory -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force

# Copy frontend build only
New-Item -ItemType Directory -Path "$tempDir\frontend" | Out-Null
Copy-Item -Path "frontend\build" -Destination "$tempDir\frontend\build" -Recurse

# Copy startup script
Copy-Item -Path "startup.sh" -Destination "$tempDir\startup.sh"

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
Remove-Item $tempDir -Recurse -Force

Write-Host "`n=== Step 11: Deploying to Azure ===" -ForegroundColor Cyan
az webapp deploy `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --src-path $zipPath `
  --type zip

# Cleanup
Remove-Item $zipPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  App URL:  https://$APP_NAME.azurewebsites.net" -ForegroundColor Yellow
Write-Host "  MySQL:    $MYSQL_HOST" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To view logs:  az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
Write-Host "  To delete all: az group delete --name $RESOURCE_GROUP --yes"
Write-Host "============================================" -ForegroundColor Green
