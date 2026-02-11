import { test, expect } from '@playwright/test';

test.describe('Guest registration flow', () => {
  test('guest can create account with password and be logged in', async ({ page, baseURL, request }) => {
    // Use a registration id that exists in the local DB and is a guest booking
    const registrationId = 10;

    await page.goto(`${baseURL}/registrations/${registrationId}`);

    // Try to use the confirmation page inline Create Account next to the disabled CTA.
    const manageBtn = page.getByRole('button', { name: 'Manage Session Reservations' });
    if (await manageBtn.count() > 0) {
      // Button exists for multi-session registrations — ensure it's disabled for guests
      await expect(manageBtn).toBeDisabled();
      const createInline = page.getByRole('button', { name: 'Create Account' });
      if (await createInline.count() > 0) {
        await createInline.click();
      } else {
        // Fall back to the Get Started flow if inline create isn't present
        const getStarted = page.getByRole('button', { name: 'Get Started' });
        if (await getStarted.count() > 0) await getStarted.click();
      }
    } else {
      // No manage button (single-session) — open the account creation area via Get Started
      const getStarted = page.getByRole('button', { name: 'Get Started' });
      if (await getStarted.count() > 0) await getStarted.click();
    }

    // Choose password flow (inside the account creation component)
    await page.getByRole('button', { name: 'Create with Password' }).click();

    // Fill password fields
    await page.getByPlaceholder('Enter a secure password').fill('Password1');
    await page.getByPlaceholder('Confirm your password').fill('Password1');

    // Submit and wait for the register-guest network response
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().endsWith('/api/auth/register-guest') && resp.request().method() === 'POST', { timeout: 10000 }),
      page.getByRole('button', { name: 'Create Account' }).click(),
    ]);

    if (response.status() === 201) {
      // Verify server-side session is recognized by calling /api/auth/me from the browser
      const me = await page.evaluate(async () => {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        let body = null;
        try { body = await r.json(); } catch (e) { /* ignore */ }
        return { status: r.status, body };
      });

      expect(me.status).toBe(200);
      expect(me.body && (me.body.email || me.body.id)).toBeTruthy();

      // Reload so AuthContext updates UI, then assert greeting appears
      await page.reload();
      await page.waitForSelector('text=Hi,', { timeout: 5000 });
      await expect(page.locator('text=Hi,')).toBeVisible();
    } else if (response.status() === 409) {
      // Account already exists for this guest — fetch guest email and perform login from browser
      const regResp = await request.get(`${baseURL}/api/registrations/${registrationId}`);
      const regJson = await regResp.json();
      const guestEmail = regJson?.guestEmail;
      if (!guestEmail) throw new Error('Could not determine guest email for registration');

      // Perform login via browser fetch so cookie is set in page context
      const loginResult = await page.evaluate(async (email) => {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password: 'Password1' }),
        });
        let body = null;
        try { body = await r.json(); } catch (e) { /* ignore */ }
        return { status: r.status, body };
      }, guestEmail);

      expect(loginResult.status).toBe(200);

      // Confirm session is active
      const me = await page.evaluate(async () => {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        let body = null;
        try { body = await r.json(); } catch (e) { /* ignore */ }
        return { status: r.status, body };
      });
      expect(me.status).toBe(200);

      // Reload and assert UI greeting
      await page.reload();
      await page.waitForSelector('text=Hi,', { timeout: 5000 });
      await expect(page.locator('text=Hi,')).toBeVisible();
    } else {
      throw new Error(`Unexpected register-guest response: ${response.status()}`);
    }
  });
});
