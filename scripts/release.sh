#!/bin/bash
# Only run migrations on API app, not web app
if [ "$HEROKU_APP_NAME" = "kilnagent-api" ]; then
  echo "Running migrations on API app..."
  npx prisma migrate deploy
else
  echo "Skipping migrations on non-API app ($HEROKU_APP_NAME)"
  exit 0
fi
