import { expect, test } from "@playwright/test";

test.describe("Class Browsing", () => {
  test("should display available classes", async ({ page }) => {
    await page.goto("/classes");

    // Wait for classes to load
    await page.waitForLoadState("networkidle");

    // Check if classes are displayed or empty state message
    const hasClasses = await page
      .locator('[data-testid="class-card"], .class-card')
      .count();
    const hasEmptyMessage = await page
      .locator("text=/no classes|coming soon/i")
      .isVisible()
      .catch(() => false);

    expect(hasClasses > 0 || hasEmptyMessage).toBeTruthy();
  });

  test("should navigate to class details", async ({ page }) => {
    await page.goto("/classes");
    await page.waitForLoadState("networkidle");

    // Find and click on first class card (if exists)
    const firstClass = page
      .locator('[data-testid="class-card"], .class-card')
      .first();
    const classExists = await firstClass.isVisible().catch(() => false);

    if (classExists) {
      await firstClass.click();

      // Verify we're on the class details page
      await expect(page).toHaveURL(/\/classes\/\d+/);
    }
  });
});
