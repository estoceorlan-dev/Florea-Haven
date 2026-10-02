const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('admin manages users and revoked sessions remain revoked', async ({
  page,
  browser,
}, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@e2e.test');
  await page.getByLabel('Password', { exact: true }).fill('E2eGarden123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await page.getByRole('link', { name: /User management/ }).click();
  await expect(page).toHaveURL('/admin/users');
  await expect(
    page.getByRole('button', { name: 'Deactivate Test Administrator' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Add user' }).click();
  const name = `Managed ${testInfo.project.name}`;
  const email = `managed-${testInfo.project.name}-${Date.now()}@e2e.test`;
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Garden123');
  await page.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(page.getByText(`${name} was created.`)).toBeVisible();

  const customer = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  try {
    expect(
      (
        await customer.request.post('/api/auth/login', {
          data: { email, password: 'Garden123' },
        })
      ).status(),
    ).toBe(200);
    await page.getByLabel('Search users').fill(email);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
    await page.getByLabel('Account role').selectOption('admin');
    await page.getByRole('button', { name: 'Save user' }).click();
    await expect(page.getByText(`${name} was updated.`)).toBeVisible();
    expect((await customer.request.get('/api/admin/users')).status()).toBe(200);
    await page.getByRole('button', { name: `Deactivate ${name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Deactivate user', exact: true }).click();
    await expect(page.getByText(`${name} was deactivated.`)).toBeVisible();
    expect((await customer.request.get('/api/auth/me')).status()).toBe(401);
    await page.getByRole('button', { name: `Reactivate ${name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Reactivate user', exact: true }).click();
    await expect(page.getByText(`${name} was reactivated.`)).toBeVisible();
    expect((await customer.request.get('/api/auth/me')).status()).toBe(401);
    expect(
      (
        await customer.request.post('/api/auth/login', {
          data: { email, password: 'Garden123' },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
    await page.getByLabel('Email address').fill('admin@e2e.test');
    await page.getByRole('button', { name: 'Save user' }).click();
    await expect(page.getByRole('alert')).toContainText('email already exists');
    await expect(page.getByLabel('Email address')).toHaveValue('admin@e2e.test');
    await page.screenshot({
      path: testInfo.outputPath('admin-users.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally {
    await customer.close();
  }
});
