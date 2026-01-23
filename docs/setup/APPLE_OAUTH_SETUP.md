# Apple Sign In Setup Guide

Apple Sign In (OAuth) has been fully implemented in the Pottery Studio App. This guide covers setup across multiple environments (DEV, STAGING, PROD).

## Overview

Apple Sign In setup is more complex than Google OAuth and requires:

- An Apple Developer account ($99/year)
- A Service ID for each environment
- Proper domain verification
- Private key generation and management

We use **separate Apple Service IDs** for each environment to maintain proper isolation.

Unlike Google OAuth which uses OAuth 2.0 with traditional secrets, Apple requires JWT-based authentication with:

- Service ID (Client ID)
- Team ID
- Key ID
- Private Key (.p8 file)

## Prerequisites

- Active Apple Developer Program membership
- Access to Apple Developer Console
- Admin access to Heroku apps
- Verified domain ownership

## Environment URLs

- **DEV**: https://www.kilnagent-dev.com
- **STAGING**: https://www.kilnagent-stage.com
- **PROD**: https://www.kilnagent.com

## Important: HTTPS Requirements

**Apple Sign In requires HTTPS for all domains except `localhost`.**

- ✅ Production domains with HTTPS certificates work perfectly
- ✅ `localhost` can use HTTP for local development
- ❌ Custom domains (like `kilnagentdev.com`) **cannot use HTTP** - Apple rejects them
- ❌ Self-signed certificates may cause issues

### Local Development Options

**Option 1: Test on Production (Recommended)**

- Configure only production domain in Apple Services ID
- Deploy and test on your live server with HTTPS
- Most reliable approach

**Option 2: Use localhost**

- Domain field: Leave empty or use production domain
- Return URL: `http://localhost:4000/api/auth/apple/callback`
- Access app at `http://localhost:3000`
- Limited testing, but works for basic flow

**Option 3: Set up Local HTTPS (Advanced)**

1. Use [mkcert](https://github.com/FiloSottile/mkcert) to create local SSL certificates
2. Configure development server to use HTTPS
3. Add `https://kilnagentdev.com:4000/api/auth/apple/callback` to Apple
4. Add `127.0.0.1 kilnagentdev.com` to `/etc/hosts`
5. Access at `https://kilnagentdev.com:3000`

## Step 1: Create an App ID

You only need to create **one App ID** that will be used across all environments.

### Create App ID

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** in the sidebar
4. Click the **+** button to create a new identifier
5. Select **App IDs** and click **Continue**
6. Configure the App ID:
   - **Description**: Pottery Studio App
   - **Bundle ID**: Choose **Explicit** and enter: `com.kilnagent.pottery-studio`
   - **Capabilities**: Check **Sign in with Apple**
7. Click **Continue** and then **Register**

## Step 2: Create Service IDs (One per Environment)

Create a separate Service ID for each environment (DEV, STAGING, PROD).

### Create Service ID

Repeat these steps **for each environment**:

1. In **Certificates, Identifiers & Profiles**, click **Identifiers**
2. Click the **+** button
3. Select **Services IDs** and click **Continue**
4. Configure the Service ID:

#### For DEV:

- **Description**: Pottery Studio - DEV
- **Identifier**: `com.kilnagent.pottery-studio.dev`

#### For STAGING:

- **Description**: Pottery Studio - STAGING
- **Identifier**: `com.kilnagent.pottery-studio.staging`

#### For PROD:

- **Description**: Pottery Studio - PROD
- **Identifier**: `com.kilnagent.pottery-studio.prod`

#### For Local Development (Optional):

- **Description**: Pottery Studio - Local
- **Identifier**: `com.kilnagent.pottery-studio.local`

5. Check **Sign in with Apple**
6. Click **Configure** next to Sign in with Apple

### Configure Sign in with Apple

For each Service ID:

1. **Primary App ID**: Select the App ID you created (`com.kilnagent.pottery-studio`)
2. **Domains and Subdomains**: Add your environment's domain

**Important for Domains Field:**

- ❌ Do NOT add `localhost` - Apple web authentication rejects it
- ❌ Do NOT include ports (e.g., `:4000`)
- ❌ Do NOT include `www` subdomain
- ✅ For localhost testing, leave this field **empty**
- ✅ For production, use root domain only (e.g., `kilnagent.com`)

**For Local Development:**

```
(Leave empty - Apple will allow localhost callback URLs without domain verification)
```

**For DEV:**

```
kilnagent-dev.com
```

**For STAGING:**

```
kilnagent-stage.com
```

**For PROD:**

```
kilnagent.com
```

3. **Return URLs**: Add the callback URL for this environment

**For Local Development:**

```
http://localhost:4000/api/auth/apple/callback
```

**For DEV:**

```
https://api.kilnagent-dev.com/api/auth/apple/callback
```

**For STAGING:**

```
https://api.kilnagent-stage.com/api/auth/apple/callback
```

**For PROD:**

```
https://api.kilnagent.com/api/auth/apple/callback
```

4. Click **Next**, **Done**, **Continue**, and **Register**

**Important Notes on Return URLs:**

- Apple may show validation warnings when you click Save/Done - this is normal
- Click through the warnings if testing with localhost
- For production domains, ensure HTTPS is configured before adding

## Step 3: Verify Domain Ownership

Apple requires you to verify that you own each domain.

### Download Verification File

1. In the Service ID configuration, you'll see a **Download** button next to each domain
2. Download the verification file (`apple-developer-domain-association.txt`)

### Upload Verification File

The verification file must be accessible at:

```
https://[your-domain]/.well-known/apple-developer-domain-association.txt
```

For our setup, we need to add this file to the web app:

1. Create the directory structure in your web app:

```bash
mkdir -p web/public/.well-known
```

2. Copy the verification file:

```bash
cp apple-developer-domain-association.txt web/public/.well-known/
```

3. Commit and push the changes:

```bash
git add web/public/.well-known/apple-developer-domain-association.txt
git commit -m "Add Apple domain verification file"
git push origin develop
```

4. Deploy to each environment (or wait for CI/CD to deploy automatically)

### Verify the File is Accessible

Test that Apple can access your verification file:

```bash
# DEV
curl https://www.kilnagent-dev.com/.well-known/apple-developer-domain-association.txt

# STAGING
curl https://www.kilnagent-stage.com/.well-known/apple-developer-domain-association.txt

# PROD
curl https://www.kilnagent.com/.well-known/apple-developer-domain-association.txt
```

You should see the content of the verification file.

### Complete Verification in Apple Console

1. Go back to your Service ID configuration in Apple Developer Console
2. Click **Verify** next to each domain
3. Apple will check that the file is accessible
4. Once verified, you'll see a checkmark

## Step 4: Create a Private Key

You need **one private key** that will be used across all environments.

### Generate Key

1. In Apple Developer Console, go to **Certificates, Identifiers & Profiles**
2. Click **Keys** in the sidebar
3. Click the **+** button
4. Configure the key:
   - **Key Name**: Pottery Studio Sign in with Apple Key
   - Check **Sign in with Apple**
   - Click **Configure**
   - Select the Primary App ID: `com.kilnagent.pottery-studio`
   - Click **Save**
5. Click **Continue** and then **Register**
6. **Download the key** - you can only download it once!
   - File will be named something like `AuthKey_ABCDEFGH12.p8`
   - **Save this file securely** - you cannot re-download it

### Note Your Key Details

After creating the key, note:

- **Key ID**: A 10-character string (e.g., `ABCDEFGH12`)
- **Team ID**: Found at the top right of the Apple Developer Console (or in Membership section)

## Step 5: Configure Environment Variables

### Local Development Configuration

For local development, add these to your `/api/.env.development` file:

```bash
# Apple OAuth Configuration
APPLE_CLIENT_ID=com.kilnagent.pottery-studio.local
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(paste your entire .p8 key content here)
...
-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:4000/api/auth/apple/callback

# Other existing variables
CLIENT_URL=http://localhost:3000
SESSION_SECRET=your-session-secret
```

**Important Notes on Private Key Format:**

**Option 1: Multi-line (Using quotes)**

```bash
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
```

**Option 2: Single Line (Using \n)**

```bash
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...\n-----END PRIVATE KEY-----"
```

To convert .p8 to single line:

```bash
# On macOS/Linux
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' AuthKey_ABC123DEF4.p8
```

After updating environment variables, restart your Docker containers:

```bash
docker compose down
docker compose up --build -d
```

### Configure Heroku Environment Variables

Configure each Heroku app with its Apple credentials.

### Prepare the Private Key Content for Heroku

The private key needs to be stored as a single-line string in Heroku:

```bash
# Read the key file and format it
cat AuthKey_ABCDEFGH12.p8 | tr '\n' '|'
```

This converts newlines to `|` characters. You'll convert them back in your code.

### DEV Environment

```bash
heroku config:set \
  APPLE_CLIENT_ID="com.kilnagent.pottery-studio.dev" \
  APPLE_TEAM_ID="YOUR_TEAM_ID" \
  APPLE_KEY_ID="YOUR_KEY_ID" \
  APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----|YOUR_KEY_CONTENT|-----END PRIVATE KEY-----" \
  APPLE_CALLBACK_URL="https://api.kilnagent-dev.com/api/auth/apple/callback" \
  --app kilnagent-dev-api
```

### STAGING Environment

```bash
heroku config:set \
  APPLE_CLIENT_ID="com.kilnagent.pottery-studio.staging" \
  APPLE_TEAM_ID="YOUR_TEAM_ID" \
  APPLE_KEY_ID="YOUR_KEY_ID" \
  APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----|YOUR_KEY_CONTENT|-----END PRIVATE KEY-----" \
  APPLE_CALLBACK_URL="https://api.kilnagent-stage.com/api/auth/apple/callback" \
  --app kilnagent-staging-api
```

### PROD Environment

```bash
heroku config:set \
  APPLE_CLIENT_ID="com.kilnagent.pottery-studio.prod" \
  APPLE_TEAM_ID="YOUR_TEAM_ID" \
  APPLE_KEY_ID="YOUR_KEY_ID" \
  APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----|YOUR_KEY_CONTENT|-----END PRIVATE KEY-----" \
  APPLE_CALLBACK_URL="https://api.kilnagent.com/api/auth/apple/callback" \
  --app kilnagent-api
```

### Update Code to Handle Private Key Format

In your Passport Apple strategy configuration, convert the `|` back to newlines:

```typescript
const applePrivateKey =
  process.env.APPLE_PRIVATE_KEY?.replace(/\|/g, "\n") || "";
```

## Testing Apple Sign In

### Local Development Testing

1. Visit http://localhost:3000/login
2. Click **Continue with Apple**
3. You'll be redirected to Apple's login page
4. Sign in with your Apple ID
5. On first sign-in, you'll be asked to:
   - Share your email
   - Optionally share your name
   - Choose to hide or share your real email
6. After authorization, you'll be redirected back to your app

### Verify in Database

```bash
# Connect to Prisma Studio (for local development)
cd api
npm run studio
```

Check:

- **Customer** table has new user
- **Account** table has provider = "apple"
- User's email and name (if shared) are stored

### Test Login Flow (DEV/STAGING/PROD)

1. Navigate to your environment's URL (e.g., https://www.kilnagent-dev.com)
2. Click **Sign in with Apple** or **Continue with Apple**
3. Enter your Apple ID credentials
4. Complete two-factor authentication if prompted
5. Choose whether to share or hide your email
6. You should be redirected back to the app and logged in

### Apple Sign In Behavior

**First-Time Sign In:**

- User sees Apple login screen
- Can choose to hide email (Apple provides relay email)
- Name is shared only on first sign-in
- App receives: email, name (if shared), Apple ID

**Subsequent Sign Ins:**

- User sees consent screen again
- Name is **not** provided (already shared on first login)
- Only email and Apple ID returned

**Email Privacy:**
If user chooses "Hide My Email":

- Apple provides a relay email: `abc123@privaterelay.appleid.com`
- Emails sent to this address forward to user's real email
- This relay email is unique per app

### Verify Configuration

Check that the Apple environment variables are set correctly:

```bash
# For DEV
heroku config:get APPLE_CLIENT_ID --app kilnagent-dev-api
heroku config:get APPLE_CALLBACK_URL --app kilnagent-dev-api

# For STAGING
heroku config:get APPLE_CLIENT_ID --app kilnagent-staging-api
heroku config:get APPLE_CALLBACK_URL --app kilnagent-staging-api

# For PROD
heroku config:get APPLE_CLIENT_ID --app kilnagent-api
heroku config:get APPLE_CALLBACK_URL --app kilnagent-api
```

## Troubleshooting

### "invalid_client" Error

This usually means:

- The Service ID (Client ID) is incorrect
- The Team ID is incorrect
- The Key ID is incorrect
- The private key is malformed

**Solution:**

1. Double-check all credentials in Apple Developer Console
2. Verify the private key format (ensure newlines are properly converted)
3. Ensure the Service ID matches the environment
4. Restart the Heroku app after updating config

### "Domain Verification Failed"

This means Apple cannot access your verification file:

**Solution:**

1. Verify the file is accessible via curl
2. Check that the file is at exactly `/.well-known/apple-developer-domain-association.txt`
3. Ensure HTTPS is working correctly
4. Check that there are no redirects that prevent Apple from accessing the file
5. Verify file permissions allow public access

### "Redirect URI Mismatch"

This means the callback URL doesn't match what's configured:

**Solution:**

1. Check the callback URL in Apple Developer Console
2. Verify the `APPLE_CALLBACK_URL` environment variable
3. Ensure the URL matches exactly (including https://)
4. Check that you're using the correct Service ID for the environment

**Common Issues with localhost:**

- ❌ Domain: `localhost` in Domains field → Apple rejects this
- ❌ Domain: `localhost:4000` → Never include ports
- ✅ Domain: (empty) → Works for localhost testing
- ✅ Return URL: `http://localhost:4000/api/auth/apple/callback` → This is fine
- Alternative: Use hosts file entry like `127.0.0.1 local.kilnagent.dev` in `/etc/hosts`

### "Email Not Provided"

Apple allows users to hide their email. Your app needs to handle this:

**Solution:**

1. Apple provides a relay email (e.g., `abc123@privaterelay.appleid.com`)
2. Store this relay email as the user's email
3. You can send emails to this relay address, and Apple will forward them to the user
4. Handle the case where email is null or empty

### Private Key Issues

If you're getting JWT signing errors:

**Solution:**

1. Verify the private key is the complete key including BEGIN/END markers
2. Check that newlines are properly handled (converted from `|` back to `\n`)
3. Ensure there are no extra spaces or characters
4. Try generating a new key if the current one seems corrupted

## Multi-Tenant Considerations

Our app supports multi-tenancy via subdomains (e.g., `demo.kilnagent.com`).

### Important Notes:

1. **Domain Verification**: Each root domain must be verified, but subdomains inherit verification
2. **Cookie Domain**: Set to `.kilnagent.com` (with leading dot) to work across all subdomains
3. **Return URLs**: Can use wildcard patterns in some cases, or add specific tenant subdomains
4. **Service ID**: One Service ID per environment handles all subdomains of that environment

## Security Best Practices

1. **Protect your private key**: Never commit it to version control
   - Add `.p8` files and `.env` to `.gitignore`
   - Use environment variables for all secrets
2. **Rotate keys regularly**: Generate a new key and update all environments
3. **Use environment-specific Service IDs**: Don't share Service IDs between DEV/STAGING/PROD
4. **Monitor usage**: Check Apple Developer Console for unusual activity
5. **Handle email privacy**: Support users who choose to hide their email
6. **Use HTTPS only**: Apple Sign In requires HTTPS for all callback URLs (except localhost)
7. **Store keys securely**: Use environment variables, never hardcode
8. **Backup your private key**: Store it securely (password manager, encrypted storage)
9. **Key rotation**: Apple allows multiple active keys for zero-downtime rotation

## What Was Implemented

### Backend (API)

- **Database Schema** (`prisma/schema.prisma`):
  - `Account` model for OAuth provider accounts (supports Apple)
  - `Session` model for session management
  - `Customer` model with picture and timestamps

- **Authentication Routes** (`src/routes/auth.ts`):
  - `POST /api/auth/apple` - Initiates Apple OAuth flow
  - `POST /api/auth/apple/callback` - Handles Apple's response
  - `GET /api/auth/me` - Returns current user info
  - `POST /api/auth/logout` - Logs out the user
  - `GET /api/auth/status` - Check authentication status

- **Passport Configuration** (`src/config/passport.ts`):
  - Apple Sign In strategy with JWT-based authentication
  - User serialization/deserialization
  - Database integration for user management
  - Handles email privacy (relay emails)

### Frontend (Web)

- **Authentication Context** (`src/context/AuthContext.tsx`):
  - Manages user state
  - Provides login/logout functions
  - Works with both Google and Apple OAuth

- **Components**:
  - Login page with Apple sign-in button
  - Protected dashboard
  - Next.js OAuth callback proxies

### Database Schema

```prisma
model Account {
  id                String    @id @default(cuid())
  customerId        Int
  provider          String    // "apple"
  providerAccountId String    // Apple user ID
  accessToken       String?
  refreshToken      String?
  idToken           String?   // JWT from Apple
  expiresAt         DateTime?
  tokenType         String?   // "Bearer"
  scope             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  customer          Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}
```

## Testing Checklist

- [ ] Apple button appears on login page
- [ ] Clicking button redirects to Apple login
- [ ] Can sign in with Apple ID
- [ ] User is created in database
- [ ] Account record created with provider="apple"
- [ ] User redirected back to app after sign-in
- [ ] User session persists (check /api/auth/me)
- [ ] Can logout and sign in again
- [ ] Existing user with same email can sign in with Apple
- [ ] Hidden email (relay) works correctly
- [ ] Name is captured on first sign-in
- [ ] Subsequent sign-ins work without requiring name again

## Updating Apple Configuration

### Adding New Domains or Callback URLs

1. Go to Apple Developer Console
2. Edit the appropriate Service ID
3. Add new domains or return URLs
4. Download and deploy new verification files if adding domains
5. Click **Verify** for new domains
6. Changes take effect immediately

### Rotating the Private Key

If your private key is compromised:

1. Generate a new key in Apple Developer Console
2. Update the `APPLE_PRIVATE_KEY` and `APPLE_KEY_ID` environment variables in all environments:
   ```bash
   heroku config:set APPLE_KEY_ID="NEW_KEY_ID" --app kilnagent-dev-api
   heroku config:set APPLE_PRIVATE_KEY="NEW_KEY_CONTENT" --app kilnagent-dev-api
   heroku restart --app kilnagent-dev-api
   ```
3. Restart all Heroku apps
4. Test Sign in with Apple on all environments
5. Revoke the old key in Apple Developer Console

## Current Configuration

### Service IDs

- **DEV**: `com.kilnagent.pottery-studio.dev`
- **STAGING**: `com.kilnagent.pottery-studio.staging`
- **PROD**: `com.kilnagent.pottery-studio.prod`

### Callback URLs

- **DEV**: `https://api.kilnagent-dev.com/api/auth/apple/callback`
- **STAGING**: `https://api.kilnagent-stage.com/api/auth/apple/callback`
- **PROD**: `https://api.kilnagent.com/api/auth/apple/callback`

### Verified Domains

- **DEV**: `kilnagent-dev.com`
- **STAGING**: `kilnagent-stage.com`
- **PROD**: `kilnagent.com`

## Useful Resources

- [Apple Developer Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple Sign In REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [passport-apple Documentation](https://github.com/ananay/passport-apple)
- [Generating Tokens for Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)

## Summary

Apple Sign In is now fully configured! Users can:

- ✅ Sign in with Apple ID
- ✅ Choose to hide their email (with relay email forwarding)
- ✅ Share or withhold their name
- ✅ Use the same Apple ID across devices
- ✅ Link Apple account to existing email account

The integration works alongside Google OAuth and email/password authentication, giving users maximum flexibility.

## Related Documentation

- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)
- [CI/CD Documentation](../development/CI_CD.md)
- [Multi-Tenancy Summary](../architecture/MULTI_TENANCY_SUMMARY.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)

## Additional Resources

- [Apple Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple Developer Console](https://developer.apple.com/account/)
- [Generating Tokens for Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)
