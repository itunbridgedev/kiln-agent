import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to load
    await expect(page).toHaveTitle(/Kiln Agent/);
  });

  test("should have navigation elements", async ({ page }) => {
    await page.goto("/");

    // Check for common navigation elements
    // Adjust selectors based on your actual homepage structure
    await expect(page.locator("nav")).toBeVisible();
  });
});
