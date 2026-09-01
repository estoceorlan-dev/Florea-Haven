import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeProvider.jsx';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { StorefrontLayout } from './StorefrontLayout.jsx';

const customer = {
  id: '30000000-0000-4000-8000-000000000003',
  name: 'Mara Santos',
  email: 'mara@example.com',
  role: 'customer',
};

const admin = {
  id: '20000000-0000-4000-8000-000000000002',
  name: 'Ana Reyes',
  email: 'ana@example.com',
  role: 'admin',
};

function renderStorefront({ user = customer, authActions } = {}) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <TestAppProviders user={user} authActions={authActions}>
          <Routes>
            <Route element={<StorefrontLayout />}>
              <Route index element={<h1>Home content</h1>} />
              <Route path="products" element={<h1>Catalog content</h1>} />
              <Route path="account" element={<h1>Account content</h1>} />
              <Route path="orders" element={<h1>Orders content</h1>} />
              <Route path="cart" element={<h1>Cart content</h1>} />
            </Route>
          </Routes>
        </TestAppProviders>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function renderAdmin() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <TestAppProviders user={admin}>
          <Routes>
            <Route path="/" element={<h1>Floréa Haven content</h1>} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<h1>Dashboard content</h1>} />
              <Route path="orders" element={<h1>Orders content</h1>} />
              <Route path="products" element={<h1>Products content</h1>} />
              <Route path="categories" element={<h1>Categories content</h1>} />
            </Route>
          </Routes>
        </TestAppProviders>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('responsive navigation layouts', () => {
  it('shows the customer first name and full identity in the mobile drawer', () => {
    renderStorefront();

    expect(screen.getByText('Hi, Mara')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open account for Mara Santos' }),
    ).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(trigger);

    const drawer = screen.getByRole('dialog', { name: 'Mobile navigation' });
    expect(within(drawer).getByText('Mara Santos')).toBeInTheDocument();
    expect(within(drawer).getByText('mara@example.com')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'My account' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(within(drawer).getByRole('link', { name: 'My orders' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Cart' })).toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: 'Close Mobile navigation' }),
    ).toHaveFocus();
  });

  it('closes the customer drawer on Escape and returns focus to its trigger', () => {
    renderStorefront();
    const trigger = screen.getByRole('button', { name: 'Open navigation' });

    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(
      screen.queryByRole('dialog', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes the customer drawer when its backdrop is selected', () => {
    renderStorefront();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    const drawer = screen.getByRole('dialog', { name: 'Mobile navigation' });
    const backdrop = screen
      .getAllByRole('button', { name: 'Close Mobile navigation' })
      .find((button) => !drawer.contains(button));
    fireEvent.click(backdrop);

    expect(
      screen.queryByRole('dialog', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
  });

  it('closes the customer drawer after route selection', () => {
    renderStorefront();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    const drawer = screen.getByRole('dialog', { name: 'Mobile navigation' });
    fireEvent.click(within(drawer).getByRole('link', { name: 'Shop all' }));

    expect(
      screen.getByRole('heading', { name: 'Catalog content' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
  });

  it('provides a signed-out identity action without reserving a blank name', () => {
    renderStorefront({ user: null });

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveTextContent('Sign in');
    expect(screen.queryByText(/^Hi,/)).not.toBeInTheDocument();
  });

  it('uses a desktop admin sidebar and a complete mobile administrator drawer', () => {
    renderAdmin();

    const sidebar = screen.getByRole('complementary');
    const desktopNavigation = within(sidebar).getByRole('navigation', {
      name: 'Administrator',
    });
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Floréa Haven' }),
    ).toHaveAttribute('href', '/');
    expect(within(sidebar).getByText('Ana Reyes')).toBeInTheDocument();
    expect(within(sidebar).getByText('ana@example.com')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Open administrator navigation' }),
    );
    const drawer = screen.getByRole('dialog', {
      name: 'Administrator navigation',
    });
    expect(within(drawer).getByText('Ana Reyes')).toBeInTheDocument();
    expect(within(drawer).getByText('ana@example.com')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('link', { name: 'Orders' }));

    expect(screen.getByRole('heading', { name: 'Orders content' })).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Administrator navigation' }),
    ).not.toBeInTheDocument();
  });

  it('invokes customer sign-out from the mobile account section', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderStorefront({ authActions: { logout } });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Mobile navigation' })).getByRole(
        'button',
        { name: 'Sign out' },
      ),
    );

    expect(logout).toHaveBeenCalledOnce();
  });
});
