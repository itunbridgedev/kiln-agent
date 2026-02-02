import { expect, test } from "@playwright/test";

test.describe("User Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show login form", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in invalid credentials
    await page.fill('input[type="email"]', "invalid@example.com");
    await page.fill('input[type="password"]', "wrongpassword");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator("text=/invalid|error|incorrect/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should allow Google OAuth login button to be visible", async ({
    page,
  }) => {
    await page.goto("/login");

    // Check for Google OAuth button
    const googleButton = page.locator(
      'button:has-text("Google"), a:has-text("Google")'
    );
    await expect(googleButton).toBeVisible();
  });

  test("should allow Apple OAuth login button to be visible", async ({
    page,
  }) => {
    await page.goto("/login");

    // Check for Apple OAuth button
    const appleButton = page.locator(
      'button:has-text("Apple"), a:has-text("Apple")'
    );
    await expect(appleButton).toBeVisible();
  });
});
