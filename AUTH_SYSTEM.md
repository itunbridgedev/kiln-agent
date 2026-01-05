# Authentication System Documentation

A complete, production-ready authentication system supporting both OAuth (Google) and email/password authentication.

## Features

- **Email/Password Authentication**: Secure registration and login with password hashing
- **Google OAuth**: Single sign-on with Google accounts
- **Session Management**: Secure cookie-based sessions
- **Role-Based Access Control**: Ready for authorization implementation
- **Password Validation**: Enforced password strength requirements
- **Clean UI**: Modern login/registration forms with validation

## Quick Start

1. **Set up Google OAuth** (optional):

   - Follow `GOOGLE_OAUTH_SETUP.md` to get credentials
   - Add to `/api/.env.development`:
     ```env
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     ```

2. **Start the application**:

   ```bash
   docker compose up -d
   ```

3. **Access the app**: http://localhost:3000

## API Endpoints

### Email/Password Authentication

#### Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response** (201 Created):

```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "picture": null,
    "createdAt": "2026-01-05T17:00:00.000Z"
  }
}
```

**Password Requirements**:

- At least 8 characters
- One uppercase letter
- One lowercase letter
- One number

#### Login with Email/Password

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "picture": null
  }
}
```

### Google OAuth

#### Initiate Google Login

```http
GET /api/auth/google
```

Redirects to Google OAuth consent screen.

#### OAuth Callback

```http
GET /api/auth/google/callback
```

Handles Google OAuth callback (automatic).

### Session Management

#### Get Current User

```http
GET /api/auth/me
```

**Response** (200 OK):

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "picture": null,
  "roles": ["admin"]
}
```

#### Logout

```http
POST /api/auth/logout
```

**Response** (200 OK):

```json
{
  "message": "Logged out successfully"
}
```

#### Check Auth Status

```http
GET /api/auth/status
```

**Response** (200 OK):

```json
{
  "authenticated": true
}
```

## Frontend Usage

### AuthContext Hooks

The `useAuth` hook provides all authentication functions:

```tsx
import { useAuth } from "./context/AuthContext";

function MyComponent() {
  const { user, loading, loginWithEmail, register, login, logout } = useAuth();

  // Email/Password login
  const handleEmailLogin = async () => {
    try {
      await loginWithEmail("user@example.com", "password");
    } catch (error) {
      console.error(error.message);
    }
  };

  // Register new user
  const handleRegister = async () => {
    try {
      await register("John Doe", "john@example.com", "SecurePass123");
    } catch (error) {
      console.error(error.message);
    }
  };

  // Google OAuth
  const handleGoogleLogin = () => {
    login(); // Redirects to Google
  };

  // Logout
  const handleLogout = async () => {
    await logout();
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.name}!</div>;
}
```

### Protected Routes

```tsx
import { useAuth } from "./context/AuthContext";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
}
```

## Database Schema

### Customer Model

Stores user information and authentication data.

```prisma
model Customer {
  id           Int              @id @default(autoincrement())
  name         String
  email        String           @unique
  phone        String?
  picture      String?          // Profile picture URL
  passwordHash String?          // For email/password auth
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  roles        CustomerRole[]   // User roles
  accounts     Account[]        // OAuth accounts
  sessions     Session[]        // Active sessions
}
```

### Account Model

Links OAuth providers to users.

```prisma
model Account {
  id                Int       @id @default(autoincrement())
  customer          Customer  @relation(...)
  customerId        Int
  provider          String    // "google", etc.
  providerAccountId String    // Provider's user ID
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  // ... additional OAuth fields
}
```

### Session Model

Manages user sessions.

```prisma
model Session {
  id           Int      @id @default(autoincrement())
  sessionToken String   @unique
  customer     Customer @relation(...)
  customerId   Int
  expires      DateTime
}
```

## Security Features

### Password Security

- **Bcrypt Hashing**: Passwords are hashed with bcrypt (10 rounds)
- **Never Stored Plain**: Raw passwords never touch the database
- **Validation**: Enforced complexity requirements

### Session Security

- **HTTP-Only Cookies**: Prevents XSS attacks
- **SameSite Protection**: CSRF protection
- **Secure Flag**: HTTPS-only in production
- **Session Expiry**: 24-hour sessions

### Input Validation

- Email format validation
- Password strength requirements
- SQL injection protection (Prisma ORM)
- XSS prevention (React escaping)

## Environment Variables

Required in `/api/.env.development`:

```env
# Database
DATABASE_URL=postgresql://pottery_user:1LoveClay!@db:5432/pottery

# Session
SESSION_SECRET=your-random-32-char-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Client
CLIENT_URL=http://localhost:3000
```

## Error Handling

### Common Error Codes

- **400 Bad Request**: Invalid input (missing fields, weak password)
- **401 Unauthorized**: Invalid credentials or not logged in
- **403 Forbidden**: Insufficient permissions
- **409 Conflict**: Email already exists
- **500 Internal Server Error**: Server-side error

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

## Testing Authentication

### 1. Test Email Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123"
  }' \
  -c cookies.txt
```

### 2. Test Email Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }' \
  -c cookies.txt
```

### 3. Test Get Current User

```bash
curl http://localhost:4000/api/auth/me \
  -b cookies.txt
```

### 4. Test Logout

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt
```

## Adding Role-Based Authorization

### 1. Create Roles

```sql
INSERT INTO "Role" (name) VALUES ('admin'), ('user'), ('manager');
```

### 2. Assign Roles to Users

```sql
INSERT INTO "CustomerRole" ("customerId", "roleId")
VALUES (1, 1); -- User 1 gets admin role
```

### 3. Use Middleware

```typescript
import { isAuthenticated, isAdmin } from "./middleware/auth";

// Require authentication
router.get("/protected", isAuthenticated, (req, res) => {
  res.json({ message: "You are authenticated" });
});

// Require admin role
router.post("/admin-only", isAdmin, (req, res) => {
  res.json({ message: "You are an admin" });
});
```

## Migration Guide

If upgrading from the OAuth-only version:

1. **Backup your database**:

   ```bash
   docker exec pottery-db pg_dump -U pottery_user pottery > backup.sql
   ```

2. **Run migration**:

   ```bash
   docker compose stop
   docker compose start db
   cd api
   NODE_ENV=development DATABASE_URL='postgresql://pottery_user:1LoveClay!@localhost:5432/pottery' \
     npx prisma migrate deploy
   ```

3. **Restart services**:
   ```bash
   docker compose up -d
   ```

## Troubleshooting

### Registration shows blank screen

- **Fixed**: Ensure the registration response includes all user fields (id, name, email, picture, roles)
- **Fixed**: Added explicit navigation after successful registration/login
- Check browser console for any JavaScript errors

### "Invalid credentials" error

- Check email is correct
- Verify password meets requirements
- Ensure user exists (register first)

### "Please use OAuth to sign in"

- User registered via Google OAuth
- They don't have a password set
- Must sign in with Google

### Session not persisting

- Check `credentials: true` in fetch requests
- Verify SESSION_SECRET is set
- Check cookies are enabled in browser

### TypeScript errors

- Run `npm install` in both `/api` and `/web`
- Regenerate Prisma client: `npx prisma generate`

## Best Practices

1. **Always use HTTPS in production**
2. **Rotate SESSION_SECRET regularly**
3. **Implement rate limiting** for login attempts
4. **Log authentication events** for security auditing
5. **Use strong passwords** (enforce in UI and API)
6. **Enable 2FA** (future enhancement)
7. **Implement password reset** flow (future enhancement)

## Future Enhancements

- [ ] Email verification
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] Additional OAuth providers (GitHub, Facebook)
- [ ] Remember me functionality
- [ ] Account linking (merge OAuth and email accounts)
- [ ] Audit log for security events
- [ ] Rate limiting on auth endpoints
