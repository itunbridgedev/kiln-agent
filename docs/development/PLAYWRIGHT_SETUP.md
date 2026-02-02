# Playwright MCP Setup

Playwright has been successfully set up for end-to-end testing of the Pottery Studio App.

## Installation

Playwright and all browser binaries have been installed:

- ✅ Chromium
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

## Configuration

**Config file:** `playwright.config.ts`

Key settings:

- Tests located in: `tests/e2e/`
- Base URL: `http://localhost:3000`
- Auto-starts dev server before tests
- Parallel execution enabled
- Screenshots on failure
- HTML reporter for results

## Test Scripts

```bash
# Run all tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Show test report
npm run test:e2e:report
```

## Test Files Created

1. **`tests/e2e/homepage.spec.ts`**
   - Homepage loading
   - Navigation elements

2. **`tests/e2e/auth.spec.ts`**
   - Login form display
   - Invalid credentials handling
   - OAuth buttons (Google, Apple)

3. **`tests/e2e/classes.spec.ts`**
   - Class browsing
   - Class details navigation

4. **`tests/e2e/booking.spec.ts`**
   - Authenticated booking flow
   - My Classes page
   - Includes authenticated fixture for logged-in tests

## Running Tests

### Basic Usage

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests matching pattern
npx playwright test auth
```

### Interactive Mode

```bash
# Launch UI mode for debugging
npm run test:e2e:ui
```

### Debug Mode

```bash
# Run with headed browser
npm run test:e2e:headed

# Debug specific test
npx playwright test --debug

# Run with inspector
PWDEBUG=1 npx playwright test
```

## Test Credentials

The tests use these credentials (from your seed data):

- **Customer**: `customer@kilnagent.com` / `Customer123!`
- **Admin**: `admin@kilnagent.com` / `Admin123!`
- **Staff**: `staff@kilnagent.com` / `Staff123!`

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/path");

    // Your test code
    await expect(page.locator("selector")).toBeVisible();
  });
});
```

### Authenticated Tests

```typescript
import { test, expect } from "./booking.spec";

test("authenticated test", async ({ authenticatedPage }) => {
  // Already logged in as customer@kilnagent.com
  await authenticatedPage.goto("/protected-route");
});
```

## Selectors

Tests use these selector strategies:

1. **data-testid** attributes (recommended): `[data-testid="class-card"]`
2. **Text content**: `text=/login|sign in/i`
3. **CSS selectors**: `.class-card, button[type="submit"]`
4. **Role-based**: `role=button[name="Login"]`

## CI/CD Integration

The configuration includes CI settings:

- Retries failed tests 2 times on CI
- Runs tests sequentially on CI
- Fails build if `test.only` is left in code

To run in CI mode:

```bash
CI=true npm run test:e2e
```

## Debugging Failed Tests

When a test fails:

1. Check the HTML report: `npm run test:e2e:report`
2. View screenshots in `test-results/` directory
3. Review traces with: `npx playwright show-trace trace.zip`
4. Run test with `--debug` flag

## Best Practices

1. **Use data-testid attributes** in your components for reliable selectors
2. **Wait for network idle** before assertions: `await page.waitForLoadState('networkidle')`
3. **Use explicit waits**: `await expect(element).toBeVisible({ timeout: 5000 })`
4. **Keep tests independent** - each test should work in isolation
5. **Clean up test data** if tests create records

## Stripe Payment Testing

For testing Stripe payments with Playwright:

1. **Use test cards** in test mode:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 9995`

2. **Mock Stripe in tests** (optional):

```typescript
await page.route("**/api/stripe/**", (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ success: true }),
  });
});
```

## Multi-Tenant Testing

To test different studio subdomains:

```typescript
test("should work on demo subdomain", async ({ page }) => {
  await page.goto("http://demo.localhost:3000/classes");
  // Test subdomain-specific features
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## Troubleshooting

### Tests timing out

- Increase timeout in config or specific test
- Check if dev server is running
- Verify BASE_URL is correct

### Selectors not found

- Use `npx playwright codegen` to generate selectors
- Check if elements are in viewport
- Wait for elements to load

### Authentication issues

- Verify test credentials exist in database
- Check session/cookie handling
- Use `page.context().storageState()` to save auth

## Next Steps

1. Add more test coverage for:
   - Admin panel features
   - Schedule pattern creation
   - Resource allocation
   - Staff calendar
   - Payment flow (with Stripe test mode)

2. Set up visual regression testing with `toHaveScreenshot()`

3. Add API testing alongside E2E tests

4. Configure GitHub Actions for automated testing
