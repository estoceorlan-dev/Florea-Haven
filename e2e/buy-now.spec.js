const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('buy now checks out only the selected product and keeps the cart', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Bohol Shopper');
  await page
    .getByLabel('Email address')
    .fill(`buy-${testInfo.project.name}-${Date.now()}@e2e.test`);
  await page.getByLabel('Password', { exact: true }).fill('Garden123');
  await page.getByLabel('Confirm password').fill('Garden123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/products');
  const card = page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name: 'Heirloom Zinnia Seeds' }) });
  await card.getByRole('button', { name: 'Add Heirloom Zinnia Seeds to cart' }).click();
  await expect(
    page.getByRole('link', { name: 'Shopping cart with 1 items' }),
  ).toBeVisible();
  const before = (await (await page.request.get('/api/cart')).json()).data.cart;
  await card.getByRole('button', { name: 'Buy now' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close purchase dialog' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Buy now' })).toBeFocused();
  await card.getByRole('button', { name: 'Buy now' }).click();
  await dialog.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(dialog.getByLabel('Quantity', { exact: true })).toHaveText('2');
  await page.screenshot({ path: testInfo.outputPath('buy-now-review.png') });
  await dialog.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible();
  await dialog.getByLabel('Phone number').fill('09171234567');
  await dialog.getByLabel('Address line 1').fill('12 Garden Street');
  await dialog.getByLabel('City', { exact: true }).fill('Tagbilaran');
  await dialog.getByLabel('Province').fill('Bohol');
  await dialog.getByLabel('Postal code').fill('6300');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    (
      await new AxeBuilder({ page })
        .include('dialog')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('buy-now-checkout.png') });
  await dialog.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+\/confirmation/);
  const orderId = new URL(page.url()).pathname.split('/')[2];
  const order = (await (await page.request.get(`/api/orders/${orderId}`)).json()).data;
  expect(order.items).toHaveLength(1);
  expect(order.items[0].product_name).toBe('Heirloom Zinnia Seeds');
  expect(order.items[0].quantity).toBe(2);
  const after = (await (await page.request.get('/api/cart')).json()).data.cart;
  expect(after.items.map(({ id, quantity }) => ({ id, quantity }))).toEqual(
    before.items.map(({ id, quantity }) => ({ id, quantity })),
  );
  expect(errors).toEqual([]);
});

test('guest buy now resumes the chosen quantity after sign in', async ({
  page,
}, testInfo) => {
  const email = `return-${testInfo.project.name}-${Date.now()}@e2e.test`;
  await page.request.post('/api/auth/register', {
    data: { name: 'Returning Shopper', email, password: 'Garden123' },
  });
  await page.request.post('/api/auth/logout');
  await page.goto('/products');
  await page
    .locator('.product-card')
    .first()
    .getByRole('button', { name: 'Buy now' })
    .click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: 'Sign in to checkout' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Garden123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveText('2');
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(
    page.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible();
});
