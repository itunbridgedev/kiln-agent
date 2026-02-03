# Google OAuth Setup Guide

Google OAuth has been fully implemented end-to-end in the Pottery Studio App. This guide covers setup across multiple environments (DEV, STAGING, PROD).

## Overview

We use **separate Google OAuth applications** for each environment to maintain proper isolation and security. Each environment has its own Client ID and Client Secret.

Google OAuth uses OAuth 2.0 with traditional client ID and secret pairs, making it simpler to set up than Apple Sign In.

## Prerequisites

- Google Cloud Console account
- Access to the project's Google Cloud Console
- Admin access to Heroku apps

## Environment URLs

- **DEV**: https://www.kilnagent-dev.com
- **STAGING**: https://www.kilnagent-stage.com
- **PROD**: https://www.kilnagent.com

## Local Development

For local development testing:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Callback**: http://localhost:4000/api/auth/google/callback

## Creating a Google OAuth Application

Follow these steps **for each environment** (DEV, STAGING, PROD):

### 1. Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**

### 2. Configure OAuth Consent Screen

If this is your first OAuth app for the project:

1. Click **OAuth consent screen** in the left sidebar
2. Select **External** user type (or **Internal** if using Google Workspace)
3. Fill in the required fields:
   - **App name**: Pottery Studio App - [ENVIRONMENT]
   - **User support email**: Your support email
   - **Developer contact email**: Your developer email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. Add test users if needed (for development environments)
6. Save and continue

### 3. Create OAuth 2.0 Client ID

1. Go to **Credentials** tab
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application**
4. Configure the application:

#### Application Name

Use a descriptive name:

- Local Development: `Pottery Studio - Local`
- DEV: `Pottery Studio - DEV`
- STAGING: `Pottery Studio - STAGING`
- PROD: `Pottery Studio - PROD`

#### Authorized JavaScript Origins

Add all domains for the environment:

**For Local Development:**

```
http://localhost:3000
http://localhost:4000
```

**For DEV:**

```
https://www.kilnagent-dev.com
https://api.kilnagent-dev.com
https://kilnagent-dev.com
```

**For STAGING:**

```
https://www.kilnagent-stage.com
https://api.kilnagent-stage.com
https://kilnagent-stage.com
```

**For PROD:**

```
https://www.kilnagent.com
https://api.kilnagent.com
https://kilnagent.com
```

#### Authorized Redirect URIs

Add the OAuth callback URL for the environment:

**For Local Development:**

```
http://localhost:4000/api/auth/google/callback
```

**For DEV:**

```
https://api.kilnagent-dev.com/api/auth/google/callback
```

**For STAGING:**

```
https://api.kilnagent-stage.com/api/auth/google/callback
```

**For PROD:**

```
https://api.kilnagent.com/api/auth/google/callback
```

5. Click **CREATE**
6. **Copy the Client ID and Client Secret** - you'll need these for configuration

## Local Development Configuration

For local development, add these to your `/api/.env.development` file:

```env
GOOGLE_CLIENT_ID=your-local-dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-local-dev-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=generate-a-random-32-character-string
CLIENT_URL=http://localhost:3000
```

To generate a secure session secret:

```bash
# Using Node.js (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using openssl (if available)
openssl rand -base64 32
```

After updating environment variables, restart your Docker containers:

```bash
docker compose down
docker compose up --build -d
```

## Configuring Heroku Environment Variables

After creating each OAuth application, configure the corresponding Heroku app with the credentials.

### DEV Environment

```bash
heroku config:set \
  GOOGLE_CLIENT_ID="your-dev-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="your-dev-client-secret" \
  GOOGLE_CALLBACK_URL="https://api.kilnagent-dev.com/api/auth/google/callback" \
  --app kilnagent-dev-api
```

### STAGING Environment

```bash
heroku config:set \
  GOOGLE_CLIENT_ID="your-staging-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="your-staging-client-secret" \
  GOOGLE_CALLBACK_URL="https://api.kilnagent-stage.com/api/auth/google/callback" \
  --app kilnagent-staging-api
```

### PROD Environment

```bash
heroku config:set \
  GOOGLE_CLIENT_ID="your-prod-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="your-prod-client-secret" \
  GOOGLE_CALLBACK_URL="https://api.kilnagent.com/api/auth/google/callback" \
  --app kilnagent-api
```

## Current Configuration

### DEV

- **Client ID**: `1058057651898-9m5d7qmhmb887svhl6794k136stj1mpb.apps.googleusercontent.com`
- **Callback URL**: `https://api.kilnagent-dev.com/api/auth/google/callback`

### STAGING

- **Client ID**: `1058057651898-mqejbu11gpa8se6c554bdol53dkv9s80.apps.googleusercontent.com`
- **Callback URL**: `https://api.kilnagent-stage.com/api/auth/google/callback`

### PROD

- **Client ID**: `1058057651898-ppc809jo0c0gul4npbifndr84q215shb.apps.googleusercontent.com`
- **Callback URL**: `https://api.kilnagent.com/api/auth/google/callback`

## Testing Google OAuth

### Local Development Testing

1. Navigate to http://localhost:3000
2. You should see the login page with a "Sign in with Google" button
3. Click the button to authenticate
4. After successful authentication, you'll be redirected to the dashboard
5. Your user information from Google (name, email, profile picture) will be displayed

### Test Login Flow (DEV/STAGING/PROD)

1. Navigate to your environment's URL (e.g., https://www.kilnagent-dev.com)
2. Click **Login with Google** or **Sign in with Google**
3. Select a Google account
4. Grant permissions if prompted
5. You should be redirected back to the app and logged in

### Verify in Database

You can check the database to confirm user creation:

```bash
# Connect to Prisma Studio (for local development)
cd api
npm run studio
```

Check:

- **Customer** table has the new user
- **Account** table has provider = "google"
- User's email, name, and picture are stored

### Verify Configuration

Check that the OAuth environment variables are set correctly:

```bash
# For DEV
heroku config:get GOOGLE_CLIENT_ID --app kilnagent-dev-api
heroku config:get GOOGLE_CALLBACK_URL --app kilnagent-dev-api

# For STAGING
heroku config:get GOOGLE_CLIENT_ID --app kilnagent-staging-api
heroku config:get GOOGLE_CALLBACK_URL --app kilnagent-staging-api

# For PROD
heroku config:get GOOGLE_CLIENT_ID --app kilnagent-api
heroku config:get GOOGLE_CALLBACK_URL --app kilnagent-api
```

## Troubleshooting

### "Redirect URI mismatch" Error

This means the callback URL in your Google OAuth app doesn't match the URL being used:

1. Check the error message for the actual redirect URI being used
2. Go to Google Cloud Console > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add the exact redirect URI shown in the error
5. Save and try again

### "Invalid Client" Error

This usually means:

- The Client ID or Client Secret is incorrect
- The credentials haven't been properly set in Heroku
- The wrong OAuth app is being used for the environment

**Solution:**

1. Verify the Client ID and Secret in Google Cloud Console
2. Update Heroku config vars with the correct values
3. Restart the Heroku app: `heroku restart --app kilnagent-[env]-api`

### Users Can't Sign In

1. Check OAuth consent screen configuration
2. Verify test users are added (for development environments)
3. Ensure the app is published (for production)
4. Check that the user's email domain is allowed

### Cookie/Session Issues

If users are logged in but sessions aren't persisting:

1. Verify `COOKIE_DOMAIN` is set correctly:
   - DEV: `.kilnagent-dev.com`
   - STAGING: `.kilnagent-stage.com`
   - PROD: `.kilnagent.com`
2. Check that cookies are being set with `SameSite=none` and `Secure=true` in production
3. Verify SSL certificates are valid for your domain
4. For local development, check that `credentials: true` is set in CORS and fetch requests

### "Can't reach database" Error

For local development:

- Make sure all Docker containers are running: `docker compose ps`
- Restart containers if needed: `docker compose down && docker compose up -d`

### Session Not Persisting

- Verify `SESSION_SECRET` is set and consistent across restarts
- Check that PostgreSQL session store is configured (production uses `connect-pg-simple`)
- Ensure cookies aren't being blocked by browser settings

## Multi-Tenant Considerations

Our app supports multi-tenancy via subdomains (e.g., `demo.kilnagent.com`).

### Important Notes:

1. **Cookie Domain**: Set to `.kilnagent.com` (with leading dot) to work across all subdomains
2. **Authorized JavaScript Origins**: Include the wildcard domain pattern if supported, or add specific tenant subdomains
3. **Session Storage**: Uses PostgreSQL with proper tenant isolation

## Security Best Practices

1. **Never commit** OAuth credentials to version control
   - Add `.env` files to `.gitignore`
   - Use environment variables for all secrets
2. **Use environment-specific apps** - don't share OAuth apps between DEV/STAGING/PROD
3. **Rotate secrets regularly** - especially if they may have been exposed
4. **Limit scopes** - only request the permissions you need (email, profile, openid)
5. **Monitor usage** - Check Google Cloud Console for unusual OAuth activity
6. **Use HTTPS only** - Never use OAuth over HTTP connections (except localhost for dev)
7. **Session security**:
   - Use strong session secrets (32+ random bytes)
   - Set HTTP-only cookies to prevent XSS attacks
   - Use secure cookies in production
   - Implement CSRF protection

## What Was Implemented

### Backend (API)

- **Database Schema** (`prisma/schema.prisma`):
  - `Account` model for OAuth provider accounts
  - `Session` model for session management (PostgreSQL session store in production)
  - `Customer` model with picture and timestamps

- **Authentication Routes** (`src/routes/auth.ts`):
  - `GET /api/auth/google` - Initiates Google OAuth flow
  - `GET /api/auth/google/callback` - Handles OAuth callback
  - `GET /api/auth/me` - Returns current user info
  - `POST /api/auth/logout` - Logs out the user
  - `GET /api/auth/status` - Check authentication status

- **Passport Configuration** (`src/config/passport.ts`):
  - Google OAuth strategy setup
  - User serialization/deserialization
  - Database integration for user management

- **Middleware** (`src/middleware/auth.ts`):
  - `isAuthenticated` - Protects routes requiring authentication
  - `isAdmin` - Protects routes requiring admin role

### Frontend (Web)

- **Authentication Context** (`src/context/AuthContext.tsx`):
  - Manages user state
  - Provides login/logout functions
  - Auto-checks authentication on app load

- **Components**:
  - Login page with Google sign-in button
  - Protected dashboard showing user info
  - OAuth callback proxy handlers (Next.js API routes)

- **Routing**:
  - Protected routes with automatic redirects
  - Loading states during authentication
  - Session persistence across page refreshes

## Updating OAuth Configuration

If you need to update the OAuth configuration:

1. Make changes in Google Cloud Console (add/remove URIs, etc.)
2. Changes take effect immediately - no need to update Heroku unless changing credentials
3. If changing Client ID/Secret, update Heroku config vars and restart the app:
   ```bash
   heroku config:set GOOGLE_CLIENT_ID="new-id" --app kilnagent-dev-api
   heroku restart --app kilnagent-dev-api
   ```

## Next Steps

After setting up Google OAuth, you can:

- Add role-based access control using the existing Role/CustomerRole models
- Implement additional OAuth providers (Apple, GitHub, Facebook, etc.)
- Add email/password authentication alongside OAuth
- Create protected API endpoints using the `isAuthenticated` middleware
- Enable multi-factor authentication (MFA)
- Implement OAuth token refresh for long-lived sessions

## Related Documentation

- [Apple OAuth Setup](./APPLE_OAUTH_SETUP.md)
- [CI/CD Documentation](../development/CI_CD.md)
- [Multi-Tenancy Summary](../architecture/MULTI_TENANCY_SUMMARY.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)
