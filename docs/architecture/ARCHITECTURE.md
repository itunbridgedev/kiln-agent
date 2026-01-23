# Architecture Documentation

## Overview

Kiln Agent is a multi-tenant pottery studio management platform built with a modern web stack. The application uses subdomain-based tenant isolation to serve multiple studios from a single deployment.

## Tech Stack

### Frontend

- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS v4
- **Port**: 3000

### Backend

- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js
- **Port**: 4000

### Database

- **DBMS**: PostgreSQL
- **ORM**: Prisma 6.19.1
- **Migration Strategy**: Prisma Migrate

### Authentication

- Passport.js with local and Google OAuth strategies
- Session-based authentication
- bcrypt for password hashing

## Architecture Patterns

### Multi-Tenancy

The application implements **subdomain-based multi-tenancy** with row-level isolation:

```
demo.kilnagent.com → Studio ID: 1
pottery-place.kilnagent.com → Studio ID: 2
```

**Implementation:**

- `TenantMiddleware` extracts studio subdomain from request headers
- `AsyncLocalStorage` maintains tenant context throughout request lifecycle
- All database queries automatically filtered by `studioId`
- Tenant context available via `getTenantContext()` utility

**Key Files:**

- `src/middleware/tenant.ts` - Tenant detection and context storage
- `src/prisma.ts` - Prisma client with tenant filtering
- `web/middleware.ts` - Next.js middleware for tenant routing

### Database Schema Design

#### Category Hierarchy

```
ProductCategory (id, name, parentCategoryId, featureModule, studioId)
├── Classes (featureModule: CLASSES)
│   ├── Wheel Throwing
│   ├── Handbuilding
│   └── Glazing Techniques
├── Firings (featureModule: FIRINGS)
├── Memberships (featureModule: MEMBERSHIPS)
└── Retail (featureModule: RETAIL)
```

- Top-level categories identified by `featureModule` enum
- Subcategories have `parentCategoryId` pointing to parent
- Unlimited nesting depth supported

#### Classes Module

**Class Types:**

1. **Single Session** - One-time workshops (e.g., "Date Night Pottery")
2. **Multi-Session** - Fixed number of sessions (e.g., "6-Week Wheel Throwing")
3. **Series** - Recurring with no fixed end (e.g., "Monthly Member Workshop")

**Schema:**

```prisma
Class {
  id: Int
  name: String
  description: String
  classType: ClassType (SINGLE_SESSION | MULTI_SESSION | SERIES)
  categoryId: Int → ProductCategory
  duration: Float (hours)
  numberOfSessions: Int?
  price: Decimal
  instructor: String
  skillLevel: SkillLevel
  maxParticipants: Int
  studioId: Int

  sessions: ClassSession[]
}

ClassSession {
  id: Int
  classId: Int
  sessionNumber: Int?
  startDateTime: DateTime
  endDateTime: DateTime
  location: String?
  notes: String?
}
```

### Removed Architecture: Product Model

**Previous Design (Deprecated):**

- Generic `Product` table served as intermediary
- Classes linked to Products via `productId`
- Products linked to Categories via `categoryId`

**Current Design (As of Migration 20260120193838):**

- Feature-specific models (Class, Firing, Membership, RetailItem) link directly to categories
- Each model has required `categoryId` field
- No generic product abstraction - each feature type is self-sufficient
- Classes can be organized into subcategories via `categoryId`

**Rationale:**

- Eliminates unnecessary indirection
- Each feature module has specific fields (e.g., `instructor`, `skillLevel` for classes)
- Simplifies admin UI (no product creation step)
- Better type safety and validation

## API Structure

### Backend Routes

```
/api/auth/*           - Authentication endpoints (login, logout, OAuth)
/api/admin/*          - Admin CRUD for categories and classes
/api/products/*       - Public product catalog (transformed from classes)
/api/classes/*        - Class-specific endpoints
/api/studio/*         - Studio information
```

### Frontend Routes

```
/                     - Public home page with product catalog
/login                - Authentication page
/complete-registration - Post-OAuth profile completion
/admin                - Admin dashboard (protected)
```

## Data Flow

### Product Catalog Display

1. Frontend requests `/api/products/categories`
2. Backend fetches all categories for studio
3. For each category, queries Class records by `categoryId`
4. Transforms Class records into product format:
   ```typescript
   {
     (id,
       name,
       description,
       price,
       imageUrl,
       categoryId,
       instructor,
       duration,
       skillLevel); // Class-specific fields
   }
   ```
5. Frontend renders categories with associated products

### Admin Class Creation

1. User fills ClassForm with category selection
2. Form submits to `/api/admin/classes` with `categoryId`
3. Backend validates category belongs to studio
4. Creates Class record with tenant context
5. Returns created class to frontend
6. UI updates class table

## Security Model

### Authentication

- Session-based with express-session
- Sessions stored in PostgreSQL
- Secure cookies with httpOnly flag

### Authorization

- Role-based access control (Admin, Manager, Staff, Customer)
- Middleware checks user roles before protected routes
- Studio isolation enforced at database level

### Multi-Tenant Security

- All queries scoped to `studioId` via AsyncLocalStorage
- Subdomain validation in middleware
- No cross-studio data leakage

## Deployment

### Development

```bash
# Backend
npm run dev  # Port 4000

# Frontend
cd web && npm run dev  # Port 3000
```

### Production

- Docker containers defined in `Dockerfile` and `web/Dockerfile`
- `docker-compose.yml` orchestrates services
- Heroku `Procfile` for PaaS deployment
- Environment variables via `.env.production`

## Migration Strategy

### Database Migrations

- Prisma Migrate for schema changes
- Migration files in `prisma/migrations/`
- `pre-migration.sql` for complex data transformations
- Always test migrations on copy of production data

### Recent Major Migration

**20260120193838_remove_product_table_add_class_category**

- Dropped `Product` table entirely
- Removed `Class.productId` column
- Added `Class.categoryId` column (required)
- Updated all foreign keys and indexes

## Future Feature Modules

Following the Classes pattern, upcoming modules will:

1. **Firings** - Kiln firing scheduling and tracking
2. **Memberships** - Studio membership tiers and billing
3. **Retail** - Pottery supplies and merchandise

Each will:

- Have dedicated table with `categoryId` and `studioId`
- Link to subcategories for organization
- Expose admin UI for CRUD operations
- Transform into product format for catalog display

## Technical Debt

- [ ] Middleware deprecation warning (Next.js proxy vs middleware)
- [ ] Multiple lockfiles causing workspace root ambiguity
- [ ] Legacy util.\_extend usage (migrate to Object.assign)
- [ ] Session store optimization for high traffic
- [ ] Image upload and storage strategy (currently placeholder URLs)
