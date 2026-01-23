# CI/CD Pipeline Configuration

## ✅ Production-Ready Setup Complete

Your three-tier CI/CD pipeline is fully configured with proper custom domains!

## Custom Domain Configuration

All environments use proper domain names that mirror production's subdomain architecture:

**DEV Environment**: `kilnagent-dev.com`
- API: `api.kilnagent-dev.com`
- Web: `www.kilnagent-dev.com`
- Tenants: `*.kilnagent-dev.com` (wildcard for demo, studio1, etc.)
- Cookie Domain: `.kilnagent-dev.com`

**STAGING Environment**: `kilnagent-staging.com`
- API: `api.kilnagent-staging.com`
- Web: `www.kilnagent-staging.com`
- Tenants: `*.kilnagent-staging.com` (wildcard for demo, studio1, etc.)
- Cookie Domain: `.kilnagent-staging.com`

**PROD Environment**: `kilnagent.com`
- API: `api.kilnagent.com`
- Web: `www.kilnagent.com`
- Tenants: `*.kilnagent.com` (wildcard for all studio subdomains)
- Cookie Domain: `.kilnagent.com`

### Benefits of Custom Domains

✅ Session cookies work properly across API/Web apps (shared domain)
✅ OAuth callbacks use real domains (professional setup)
✅ Tenant middleware works identically across all environments
✅ No special-case logic needed for staging/dev
✅ Professional URLs for client demos
✅ SSL/TLS certificates managed by Heroku ACM

## Overview

This project uses GitHub Actions for automated deployments to three environments:

- **DEV**: Automatic deployment on push to `develop` branch (resettable data)
- **STAGING**: Automatic deployment on push to `staging` branch (stable demo data)
- **PROD**: Manual approval required via GitHub Actions UI (protected customer data)

## Environments

### DEV Environment ✅

- **API**: https://api.kilnagent-dev.com
- **Web**: https://www.kilnagent-dev.com
- **Demo**: https://demo.kilnagent-dev.com
- **Purpose**: Testing new features with fresh seed data
- **Database**: Can be reset anytime using `npm run db:reset:dev`
- **Branch**: `develop`
- **Deploy**: Automatic on push
- **Status**: Deployed and operational

### STAGING Environment ✅

- **API**: https://api.kilnagent-staging.com
- **Web**: https://www.kilnagent-staging.com
- **Demo**: https://demo.kilnagent-staging.com
- **Purpose**: Validate migrations and features before production
- **Database**: Never reset - stable demo data
- **Branch**: `staging`
- **Deploy**: Automatic on push
- **Status**: Deployed and operational

### PROD Environment

- **API**: https://api.kilnagent.com
- **Web**: https://www.kilnagent.com
- **Purpose**: Live customer data
- **Database**: Protected - automatic backup before deployment
- **Branch**: `main`
- **Deploy**: Manual approval required

## Workflow

### Feature Development

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to trigger DEV deployment
git push origin feature/my-new-feature

# Create PR to develop
# Once merged, DEV will auto-deploy
```

### Staging Release

```bash
# Merge develop into staging
git checkout staging
git pull origin staging
git merge develop
git push origin staging

# Automatic deployment to STAGING
# Test migrations and features
```

### Production Release

```bash
# Merge staging into main
git checkout main
git pull origin main
git merge staging
git push origin main

# Go to GitHub Actions
# Run "Deploy to PRODUCTION" workflow
# Type "DEPLOY TO PRODUCTION" to confirm
# Automatic backup created before deployment
```

## Database Management

### Seed Data

```bash
# Seed DEV environment
npm run db:seed:dev

# Seed STAGING environment
npm run db:seed:staging

# Reset DEV database (destructive!)
npm run db:reset:dev
```

### Backups

```bash
# Create manual backup of PROD
npm run db:backup:prod

# List all backups
heroku pg:backups --app kilnagent-api

# Restore from backup
heroku pg:backups:restore --app kilnagent-api
```

## GitHub Secrets Required

Add these secrets in GitHub repository settings:

- `HEROKU_API_KEY`: Your Heroku API key
- `HEROKU_EMAIL`: Your Heroku account email

To get your Heroku API key:

```bash
heroku auth:token
```

## Safety Features

### Production Protection

- ✅ Manual approval required for PROD deployments
- ✅ Automatic database backup before deployment
- ✅ TypeScript compilation check before deployment
- ✅ Separate staging environment for migration testing

### Data Safety

- ✅ DEV database can be reset without affecting other environments
- ✅ STAGING database never resets - stable for demos
- ✅ PROD database automatically backed up before changes

## Troubleshooting

### STAGING Environment Status

**✅ FULLY OPERATIONAL**

- API URL: https://kilnagent-staging-api-7fb238fcf409.herokuapp.com
- Web URL: https://kilnagent-staging-web-c7550aee2620.herokuapp.com
- Demo Subdomain: `demo`
- Database: Seeded with demo data

**Test Accounts:**

- Admin: `admin@kilnagent.com` / `Admin123!`
- Manager: `manager@kilnagent.com` / `Manager123!`
- Staff: `staff@kilnagent.com` / `Staff123!`
- Customer: `customer@kilnagent.com` / `Customer123!`

**Seeded Data:**

- 1 Studio (Kiln Agent Studio)
- 4 Product Categories (Classes, Firings, Memberships, Retail)
- 3 Sample Classes (Beginner Wheel Throwing, Advanced Handbuilding, Date Night Pottery)
- 1 Teaching Role (Instructor) assigned to Staff user

### Common Issues

### Deployment Failed

1. Check GitHub Actions logs for errors
2. Verify Heroku secrets are correct
3. Ensure TypeScript compiles locally: `npm run build`

### Database Migration Issues

1. Test migration in DEV first
2. Validate in STAGING before PROD
3. If PROD fails, restore from backup

### Rollback Deployment

```bash
# Rollback to previous release
heroku releases:rollback --app kilnagent-api
heroku releases:rollback --app kilnagent-web
```
