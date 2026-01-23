#!/bin/bash

# Database Backup Script for Production
# Creates a manual backup before risky operations

set -e

APP_NAME="kilnagent-api"
BACKUP_NAME="pre-migration-$(date +%Y%m%d-%H%M%S)"

echo "🔒 Creating backup for $APP_NAME..."
heroku pg:backups:capture --app $APP_NAME

echo "✅ Backup created successfully!"
echo ""
echo "To list all backups:"
echo "  heroku pg:backups --app $APP_NAME"
echo ""
echo "To restore from this backup:"
echo "  heroku pg:backups:restore --app $APP_NAME"
