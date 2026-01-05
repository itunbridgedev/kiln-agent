# Code Quality Standards

This project uses ESLint and Prettier to maintain consistent code quality and formatting across both the Next.js frontend and Express API backend.

## Tools

- **ESLint** - Code linting and quality rules
- **Prettier** - Code formatting and style consistency
- **TypeScript ESLint** - TypeScript-specific linting rules

## Quick Start

### Format All Code
```bash
# Format frontend
cd web && npm run format

# Format backend
cd api && npm run format

# Check formatting without changes
cd web && npm run format:check
cd api && npm run format:check
```

### Lint Code
```bash
# Lint frontend
cd web && npm run lint

# Lint backend
cd api && npm run lint

# Auto-fix issues
cd web && npm run lint:fix
cd api && npm run lint:fix
```

## Configuration Files

### Frontend (Next.js)
- `web/eslint.config.mjs` - ESLint configuration with Next.js and TypeScript rules
- `web/.prettierrc` - Prettier formatting rules
- `web/.prettierignore` - Files to exclude from formatting

### Backend (Express API)
- `api/eslint.config.mjs` - ESLint configuration for Node.js/Express
- `api/.prettierrc` - Prettier formatting rules
- `api/.prettierignore` - Files to exclude from formatting

### Root
- `.prettierrc` - Shared Prettier config for root-level files
- `.prettierignore` - Root-level ignore patterns

## VS Code Integration

### Automatic Formatting
Files are automatically formatted on save if you have the Prettier extension installed.

### Recommended Extensions
The workspace recommends:
- **ESLint** (`dbaeumer.vscode-eslint`) - Real-time linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting

### Settings
See `.vscode/settings.json` for workspace configuration:
- Format on save enabled
- Auto-fix ESLint issues on save
- Organize imports on save
- Prettier as default formatter

## Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true
}
```

### Style Rules
- ✅ Semicolons required
- ✅ Double quotes (not single)
- ✅ 80 character line width
- ✅ 2-space indentation
- ✅ Trailing commas (ES5)
- ✅ Arrow function parens always
- ✅ LF line endings

## ESLint Rules

### Frontend (Next.js)
- **Next.js Core Web Vitals** - Performance and best practices
- **TypeScript Recommended** - Type safety rules
- **React Hooks** - Proper hook usage
- **No console** - Warn on console.log (allows warn/error)
- **Unused vars** - Warn on unused variables (allows `_` prefix)

### Backend (Express/Node.js)
- **TypeScript Recommended** - Type safety
- **No explicit any** - Warn on `any` usage
- **Unused vars** - Warn on unused variables
- **Console allowed** - Console statements permitted in backend
- **Prefer const** - Use const over let when possible

## NPM Scripts

### Frontend (`web/package.json`)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\""
  }
}
```

### Backend (`api/package.json`)
```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development ts-node-dev src/index.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.{ts,js,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,js,json}\""
  }
}
```

## Common Workflows

### Before Committing
```bash
# Check and fix formatting
cd web && npm run format && cd ../api && npm run format

# Check for linting issues
cd web && npm run lint
cd api && npm run lint

# Auto-fix what's possible
cd web && npm run lint:fix
cd api && npm run lint:fix
```

### Pre-commit Hook (Optional)
Consider adding `husky` and `lint-staged` for automatic checks:

```bash
# Install husky and lint-staged
npm install -D husky lint-staged

# Add to package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

## Ignoring Files

### Prettier Ignore Patterns
- `node_modules/`
- `.next/`, `dist/`, `build/`
- `prisma/migrations/`
- Lock files (`package-lock.json`, etc.)

### ESLint Ignore Patterns
- Generated files (`.next/`, `dist/`)
- Config files (`*.config.js`, `*.config.mjs`)
- Migrations (`prisma/migrations/`)

## Common Issues

### 1. "Parsing error" in ESLint
**Solution**: Ensure `tsconfig.json` exists and is properly configured.

### 2. Prettier and ESLint conflict
**Solution**: We use `eslint-config-prettier` to disable conflicting rules.

### 3. VS Code not formatting
**Solution**: 
- Install Prettier extension
- Check `.vscode/settings.json` is present
- Verify "Format on Save" is enabled

### 4. ESLint warnings on `any` types
**Recommendation**: Use specific types instead of `any`:
```typescript
// ❌ Avoid
function handler(req: any, res: any) {}

// ✅ Better
import { Request, Response } from 'express';
function handler(req: Request, res: Response) {}
```

### 5. Unused variable warnings
**Solution**: Prefix with underscore to indicate intentionally unused:
```typescript
// ❌ Warning
const [user, setUser] = useState();

// ✅ No warning
const [_user, setUser] = useState();
```

## Customization

### Adding ESLint Rules
Edit `eslint.config.mjs`:

```javascript
export default [
  // ... existing config
  {
    rules: {
      // Add your custom rules
      "no-console": "error", // Make console an error instead of warning
      "@typescript-eslint/no-explicit-any": "error", // Error on any
    }
  }
];
```

### Changing Prettier Settings
Edit `.prettierrc`:

```json
{
  "semi": false,        // Remove semicolons
  "singleQuote": true,  // Use single quotes
  "printWidth": 100     // Wider lines
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Lint and Format

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      # Frontend
      - name: Install web dependencies
        run: cd web && npm ci
      - name: Lint web
        run: cd web && npm run lint
      - name: Check web formatting
        run: cd web && npm run format:check
      
      # Backend
      - name: Install api dependencies
        run: cd api && npm ci
      - name: Lint api
        run: cd api && npm run lint
      - name: Check api formatting
        run: cd api && npm run format:check
```

## Current Linting Status

### Frontend (web/)
✅ All files formatted with Prettier  
✅ ESLint configured with Next.js rules  
✅ TypeScript strict mode enabled  

### Backend (api/)
✅ All files formatted with Prettier  
⚠️ 11 ESLint warnings (mostly `any` type usage - non-blocking)  
✅ TypeScript strict mode enabled  

### Warnings to Address
The backend has some warnings about:
- `any` types in passport configuration
- `any` types in middleware functions
- Non-null assertions in OAuth setup

These are warnings, not errors, and don't block development.

## Best Practices

### 1. Format Before Committing
Always run `npm run format` before committing changes.

### 2. Fix Linting Issues
Address ESLint warnings when possible - they indicate potential issues.

### 3. Use Type Safety
Avoid `any` types - use specific types or `unknown` with type guards.

### 4. Consistent Style
Let Prettier handle formatting - don't fight it with manual formatting.

### 5. VS Code Integration
Install recommended extensions for the best experience.

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

## Summary

Your project now has:
- ✅ ESLint configured for both frontend and backend
- ✅ Prettier configured with consistent rules
- ✅ VS Code integration with format-on-save
- ✅ NPM scripts for linting and formatting
- ✅ TypeScript-aware linting rules
- ✅ Next.js-specific rules for the frontend
- ✅ Node.js/Express rules for the backend

Run `npm run format && npm run lint` in both `web/` and `api/` directories to ensure your code meets quality standards!
