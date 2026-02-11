#!/bin/bash
# Only run migrations on API apps, not web apps
case "$HEROKU_APP_NAME" in
  kilnagent-api|kilnagent-dev-api|kilnagent-staging-api)
    echo "Running migrations on API app ($HEROKU_APP_NAME)..."
    npx prisma migrate deploy
    ;;
  *)
    echo "Skipping migrations on non-API app ($HEROKU_APP_NAME)"
    exit 0
    ;;
esac
