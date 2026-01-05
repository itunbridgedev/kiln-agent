# Google OAuth Setup Guide

Google OAuth has been fully implemented end-to-end in your Pottery Studio App. Follow these steps to complete the setup:

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if you haven't already:
   - Choose **External** user type (or Internal if using Google Workspace)
   - Fill in the required app information
   - Add the following scopes:
     - `userinfo.email`
     - `userinfo.profile`
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Pottery Studio App
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production domain (when deploying)
   - Authorized redirect URIs:
     - `http://localhost:4000/api/auth/google/callback` (for development)
     - Your production API callback URL (when deploying)
7. Copy the **Client ID** and **Client Secret**

## 2. Update Environment Variables

Edit `/api/.env.development` and replace the placeholder values:

```env
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
SESSION_SECRET=generate-a-random-32-character-string
```

To generate a secure session secret, run:

```bash
# Using Node.js (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using openssl (if available)
openssl rand -base64 32
```

## 3. Restart the Containers

After updating the environment variables:

```bash
docker compose down
docker compose up --build -d
```

## 4. Test the OAuth Flow

1. Open your browser and navigate to `http://localhost:3000`
2. You should see the login page with a "Sign in with Google" button
3. Click the button to authenticate
4. After successful authentication, you'll be redirected to the dashboard
5. Your user information from Google (name, email, profile picture) will be displayed

## What Was Implemented

### Backend (API)

- **Database Schema** (`prisma/schema.prisma`):

  - Added `Account` model for OAuth provider accounts
  - Added `Session` model for session management
  - Updated `Customer` model with picture and timestamps

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

- **Pages**:

  - `Login.tsx` - Login page with Google sign-in button
  - `Dashboard.tsx` - Protected dashboard showing user info

- **Routing** (`App.tsx`):
  - Protected routes
  - Automatic redirects based on auth status
  - Loading states

## Security Features

- Session-based authentication with secure cookies
- CSRF protection via sameSite cookie attribute
- HTTP-only cookies to prevent XSS attacks
- Secure cookies in production (HTTPS only)
- Password hash support for future email/password auth

## Production Deployment

Before deploying to production:

1. Update `/api/.env.production` with:

   - Production Google OAuth credentials
   - Strong session secret
   - Production URLs

2. Add your production domain to Google OAuth:

   - Authorized origins: `https://yourdomain.com`
   - Redirect URIs: `https://yourdomain.com/api/auth/google/callback`

3. Ensure HTTPS is enabled (required for OAuth in production)

## Troubleshooting

- **"Can't reach database"**: Make sure all containers are running with `docker compose ps`
- **OAuth redirect mismatch**: Verify redirect URIs in Google Console match your environment
- **Session not persisting**: Check that `credentials: true` is set in CORS and fetch requests
- **Unauthorized errors**: Verify SESSION_SECRET is set and consistent across restarts

## Next Steps

You can now:

- Add role-based access control using the existing Role/CustomerRole models
- Implement additional OAuth providers (GitHub, Facebook, etc.)
- Add email/password authentication alongside OAuth
- Create protected API endpoints using the `isAuthenticated` middleware
