const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const photo = {
  name: 'garden.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=',
    'base64',
  ),
};

test('customer purchase, profile image, admin inventory and fulfillment', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://res.cloudinary.com/florea-e2e/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: photo.buffer }),
  );
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Garden Customer');
  const email = `garden-${testInfo.project.name}-${Date.now()}@e2e.test`;
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Garden123');
  await page.getByLabel('Confirm password').fill('Garden123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/account');
  await page.getByLabel('Choose profile picture').setInputFiles(photo);
  await page.getByRole('button', { name: 'Upload image' }).click();
  await expect(page.getByText('Image saved.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove image' }).click();
  await expect(page.getByText('Image removed.', { exact: true })).toBeVisible();

  await page.goto('/products');
  await page
    .getByRole('link', { name: /Blush Garden Bouquet/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Add to cart/i }).click();
  await page.goto('/cart');
  await expect(page.getByText('Blush Garden Bouquet').first()).toBeVisible();
  await page.getByRole('link', { name: /checkout/i }).click();
  await page.getByLabel('Phone number').fill('09171234567');
  await page.getByLabel('Address line 1').fill('12 Garden Street');
  await page.getByLabel('City', { exact: true }).fill('Quezon City');
  await page.getByLabel('Province').fill('Metro Manila');
  await page.getByLabel('Postal code').fill('1100');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+\/confirmation/);
  const orderId = new URL(page.url()).pathname.split('/')[2];
  await page.screenshot({
    path: testInfo.outputPath('order-confirmation.png'),
    fullPage: true,
  });
  await page.goto('/admin');
  await expect(page).toHaveURL('/account');
  expect((await page.request.get('/api/admin/orders')).status()).toBe(403);
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL('/');

  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@e2e.test');
  await page.getByLabel('Password', { exact: true }).fill('E2eGarden123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Edit Blush Garden Bouquet' }).click();
  await page.getByLabel(/^Stock quantity/).fill('25');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Blush Garden Bouquet was updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Blush Garden Bouquet' }).click();
  await page.getByLabel('Choose product image').setInputFiles(photo);
  await page.getByRole('button', { name: 'Upload image' }).click();
  await expect(page.getByText('Image saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove image' }).click();
  await expect(page.getByText('Image removed.', { exact: true })).toBeVisible();
  await page.goto(`/admin/orders/${orderId}`);
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByText('Order status updated to confirmed.')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('admin-order.png'),
    fullPage: true,
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL('/');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Garden123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('responsive layout and accessible catalog in both themes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  for (const theme of ['light', 'dark']) {
    await page.addInitScript(
      (value) => localStorage.setItem('florea-theme-preference', value),
      theme,
    );
    await page.goto('/products');
    await expect(
      page.getByRole('link', { name: /Blush Garden Bouquet/ }).first(),
    ).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${theme} at ${width}px`,
      ).toBe(true);
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(
      results.violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ html: n.html, reason: n.failureSummary })),
        })),
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('catalog remains usable in dark theme without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem('florea-theme-preference', 'dark'),
  );
  await page.goto('/products');
  await expect(
    page.getByRole('link', { name: /Blush Garden Bouquet/ }).first(),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('catalog-dark.png'),
    fullPage: true,
  });
});
