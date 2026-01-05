# Next.js Migration Guide

The Pottery Studio App has been successfully migrated from React (Vite) to Next.js 16 with the App Router and file-based routing.

## What Changed

### Framework Migration

- **Before**: React 19 + Vite + React Router
- **After**: Next.js 16 + App Router with file-based routing

### Key Benefits

✅ **File-based routing** - No more manual route configuration  
✅ **Server-side rendering** - Better SEO and performance  
✅ **Automatic code splitting** - Faster page loads  
✅ **Built-in API routes** - Can add backend endpoints if needed  
✅ **Image optimization** - Next.js Image component  
✅ **TypeScript support** - Improved with Next.js

## Project Structure

```
web/
├── app/                    # App Router directory (file-based routing)
│   ├── layout.tsx         # Root layout with AuthProvider
│   ├── page.tsx           # Home page (dashboard) - route: /
│   ├── login/
│   │   └── page.tsx       # Login page - route: /login
│   └── globals.css        # Global styles
├── context/
│   └── AuthContext.tsx    # Authentication context (migrated)
├── styles/
│   ├── Login.css          # Login page styles
│   └── Dashboard.css      # Dashboard styles
├── components/            # Reusable components (empty for now)
├── public/                # Static assets
├── next.config.ts         # Next.js configuration
├── package.json
├── tsconfig.json
└── Dockerfile             # Multi-stage Docker build

```

## File-Based Routing

Next.js uses the file system to define routes automatically:

| File Path                | URL Route   | Description               |
| ------------------------ | ----------- | ------------------------- |
| `app/page.tsx`           | `/`         | Dashboard (home page)     |
| `app/login/page.tsx`     | `/login`    | Login/registration page   |
| `app/about/page.tsx`     | `/about`    | Would create /about route |
| `app/blog/[id]/page.tsx` | `/blog/:id` | Dynamic route example     |

### Adding New Pages

To add a new page, simply create a new folder with a `page.tsx` file:

```bash
# Create a new "about" page
mkdir app/about
touch app/about/page.tsx
```

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return <h1>About Us</h1>;
}
```

The route `/about` is automatically available!

## Migration Details

### 1. Routing

**Before** (React Router):

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Router>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/login" element={<Login />} />
  </Routes>
</Router>;
```

**After** (Next.js App Router):

```
app/
  page.tsx          → /
  login/page.tsx    → /login
```

### 2. Navigation

**Before**:

```tsx
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate("/dashboard");
```

**After**:

```tsx
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/dashboard");
```

### 3. Client Components

All interactive components need `"use client"` directive:

```tsx
"use client";

import { useState } from "react";

export default function MyComponent() {
  const [count, setCount] = useState(0);
  // ...
}
```

### 4. Context Providers

The `AuthProvider` is now in the root layout:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

## Configuration

### next.config.ts

Configured with:

- **Standalone output** - Optimized for Docker
- **API rewrites** - Proxies `/api/*` to backend at `http://pottery-api:4000`

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://pottery-api:4000/api/:path*",
      },
    ];
  },
};
```

### Docker Configuration

Multi-stage build for optimal production images:

1. **deps** - Install dependencies
2. **builder** - Build the Next.js app
3. **runner** - Slim production image (~150MB)

## Authentication

All authentication features remain fully functional:

- ✅ Email/password registration
- ✅ Email/password login
- ✅ Google OAuth
- ✅ Session management
- ✅ Protected routes
- ✅ User context

### Protected Routes

In Next.js, protect routes in the page component:

```tsx
"use client";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    router.push("/login");
    return null;
  }

  return <div>Protected content</div>;
}
```

## Development

### Local Development

```bash
cd web
npm run dev
```

Runs on http://localhost:3000

### Docker Development

```bash
docker compose up -d
```

### Production Build

```bash
cd web
npm run build
npm start
```

## Adding Features

### Adding a New Route

**Example**: Create a settings page at `/settings`

1. Create the directory and file:

```bash
mkdir app/settings
touch app/settings/page.tsx
```

2. Add the page content:

```tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div>
      <h1>Settings</h1>
      <p>Welcome, {user.name}</p>
    </div>
  );
}
```

3. Navigate to it:

```tsx
<Link href="/settings">Settings</Link>;
// or
router.push("/settings");
```

### Dynamic Routes

Create dynamic routes using `[param]` folders:

```bash
mkdir -p app/users/[id]
touch app/users/[id]/page.tsx
```

```tsx
// app/users/[id]/page.tsx
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>User {id}</h1>;
}
```

Access at: `/users/1`, `/users/2`, etc.

### Layouts

Create shared layouts for sections:

```bash
touch app/dashboard/layout.tsx
touch app/dashboard/page.tsx
touch app/dashboard/analytics/page.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav>Dashboard Nav</nav>
      {children}
    </div>
  );
}
```

The layout wraps all pages in the `dashboard/` folder.

## Performance Optimizations

### Image Optimization

Use Next.js Image component:

```tsx
import Image from "next/image";

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={200}
  priority // for above-the-fold images
/>;
```

### Font Optimization

Fonts are already optimized in the root layout:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

### Code Splitting

Automatic per-route code splitting - no configuration needed!

## Troubleshooting

### "Hydration error"

- Ensure server and client render the same content
- Check for `useEffect` dependencies
- Add `"use client"` to interactive components

### "Module not found"

- Use `@/` alias for imports from root: `@/context/AuthContext`
- Restart dev server after adding new files

### API calls failing

- Check `next.config.ts` rewrites configuration
- Verify API container is running: `docker ps`
- Check logs: `docker logs pottery-api`

### Styles not loading

- Import CSS files in components: `import "@/styles/Login.css"`
- Global styles go in `app/globals.css`

## Migration Checklist

✅ Installed Next.js 16 with TypeScript  
✅ Migrated AuthContext with `"use client"`  
✅ Created file-based routes (`/` and `/login`)  
✅ Updated navigation to use Next.js router  
✅ Configured API proxy in `next.config.ts`  
✅ Updated Dockerfile for Next.js standalone build  
✅ Migrated all CSS styles  
✅ Tested authentication flows  
✅ Cleaned up old React app

## Next Steps

### Recommended Enhancements

1. **Add Middleware** for auth protection:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Protect routes globally
}
```

2. **Add Loading States**:

```tsx
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}
```

3. **Add Error Boundaries**:

```tsx
// app/error.tsx
"use client";
export default function Error({ error, reset }) {
  return <div>Something went wrong!</div>;
}
```

4. **Use Server Actions** for forms (Next.js 15+):

```tsx
async function submitForm(formData: FormData) {
  "use server";
  // Handle form submission
}
```

5. **Add Metadata for SEO**:

```tsx
export const metadata = {
  title: "Dashboard",
  description: "User dashboard",
};
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Routing Fundamentals](https://nextjs.org/docs/app/building-your-application/routing)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

## Summary

The migration to Next.js is complete! Your app now benefits from:

- 🎯 **Automatic file-based routing** - Just add files, no configuration
- ⚡ **Better performance** - SSR, code splitting, optimizations
- 🔒 **Same authentication** - All auth features work identically
- 🐳 **Docker optimized** - Smaller, faster container images
- 📱 **Production ready** - Modern React framework with great DX

Visit http://localhost:3000 to see your Next.js app in action!
