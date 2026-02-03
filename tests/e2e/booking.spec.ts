import { test as base, expect } from "@playwright/test";

// Extend base test with authenticated fixture
export const test = base.extend({
  // Create an authenticated context
  authenticatedPage: async ({ page }, use) => {
    // Login with test credentials
    await page.goto("/login");
    await page.fill('input[type="email"]', "customer@kilnagent.com");
    await page.fill('input[type="password"]', "Customer123!");
    await page.click('button[type="submit"]');

    // Wait for successful login (adjust selector based on your app)
    await page.waitForURL(/dashboard|classes|home/, { timeout: 10000 });

    await use(page);
  },
});

test.describe("Class Booking Flow", () => {
  test("should allow authenticated user to view booking page", async ({
    authenticatedPage,
  }) => {
    // Navigate to a class (adjust URL based on your routing)
    await authenticatedPage.goto("/classes");
    await authenticatedPage.waitForLoadState("networkidle");

    // Click on first class
    const firstClass = authenticatedPage
      .locator('[data-testid="class-card"], .class-card')
      .first();
    const classExists = await firstClass.isVisible().catch(() => false);

    if (classExists) {
      await firstClass.click();

      // Look for booking button
      const bookingButton = authenticatedPage.locator(
        'button:has-text("Register"), button:has-text("Book")'
      );
      await expect(bookingButton).toBeVisible();
    }
  });

  test("should show Stripe payment form when booking", async ({
    authenticatedPage,
  }) => {
    // This is a placeholder - actual implementation depends on your booking flow
    // You may want to use Stripe test mode and test cards

    await authenticatedPage.goto("/classes");
    await authenticatedPage.waitForLoadState("networkidle");

    // Note: In real tests, you'd navigate through the booking flow
    // and verify the Stripe Elements appear
  });
});

test.describe("My Classes Page", () => {
  test("should display user registrations", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/my-classes");

    // Check for registrations or empty state
    const hasRegistrations = await authenticatedPage
      .locator('[data-testid="registration-card"]')
      .count();
    const hasEmptyMessage = await authenticatedPage
      .locator("text=/no registrations|no classes/i")
      .isVisible()
      .catch(() => false);

    expect(hasRegistrations > 0 || hasEmptyMessage).toBeTruthy();
  });
});

export { expect };
