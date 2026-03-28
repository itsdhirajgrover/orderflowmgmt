#!/bin/bash
# =============================================================
# Azure Deployment Script for OrderFlow Management Platform
# =============================================================
# Prerequisites: Azure CLI installed and logged in (az login)
#
# This script creates:
#   1. Resource Group
#   2. Azure Database for MySQL Flexible Server
#   3. Azure App Service (Python 3.11)
#   4. Configures everything and deploys the app
# =============================================================

set -e

# ---------- CONFIGURATION (edit these) ----------
RESOURCE_GROUP="orderflow-rg"
LOCATION="centralindia"           # Change to nearest Azure region
APP_NAME="orderflow-demo"         # Must be globally unique — your URL will be https://<APP_NAME>.azurewebsites.net
MYSQL_SERVER_NAME="orderflow-db"  # Must be globally unique
MYSQL_ADMIN_USER="orderadmin"
MYSQL_ADMIN_PASS="OrderFlow@2026!"  # Change this! Min 8 chars, needs uppercase+lowercase+number+special
MYSQL_DB_NAME="ordermgmt"
SKU="B1"                          # App Service SKU (B1 = Basic, cheapest paid tier)
MYSQL_SKU="Standard_B1ms"        # MySQL SKU (cheapest)
# -------------------------------------------------

echo "=== Step 1: Creating Resource Group ==="
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "=== Step 2: Creating Azure MySQL Flexible Server ==="
az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER_NAME \
  --location $LOCATION \
  --admin-user $MYSQL_ADMIN_USER \
  --admin-password "$MYSQL_ADMIN_PASS" \
  --sku-name $MYSQL_SKU \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0.21 \
  --public-access 0.0.0.0 \
  --yes

echo "=== Step 3: Creating MySQL Database ==="
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER_NAME \
  --database-name $MYSQL_DB_NAME

echo "=== Step 4: Disabling SSL enforcement for demo (optional) ==="
az mysql flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER_NAME \
  --name require_secure_transport \
  --value OFF

echo "=== Step 5: Creating App Service Plan ==="
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku $SKU \
  --is-linux

echo "=== Step 6: Creating Web App ==="
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --name $APP_NAME \
  --runtime "PYTHON:3.11"

echo "=== Step 7: Configuring Environment Variables ==="
MYSQL_HOST="${MYSQL_SERVER_NAME}.mysql.database.azure.com"
DATABASE_URL="mysql+pymysql://${MYSQL_ADMIN_USER}:${MYSQL_ADMIN_PASS}@${MYSQL_HOST}:3306/${MYSQL_DB_NAME}"

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$(openssl rand -hex 32)" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITES_PORT="8000"

echo "=== Step 8: Setting Startup Command ==="
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "startup.sh"

echo "=== Step 9: Deploying Application ==="
echo "Building React frontend..."
cd frontend && npm install && npm run build && cd ..

echo "Deploying to Azure..."
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path . \
  --type zip

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "  App URL:  https://${APP_NAME}.azurewebsites.net"
echo "  MySQL:    ${MYSQL_HOST}"
echo ""
echo "  Default login: Create your first user via the API or"
echo "  check your seed data."
echo ""
echo "  To view logs:  az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
echo "  To delete all: az group delete --name $RESOURCE_GROUP --yes"
echo "============================================"
