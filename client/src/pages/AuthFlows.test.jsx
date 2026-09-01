import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute, ProtectedRoute } from '../components/RouteGuards.jsx';
import { AuthProvider } from '../context/AuthProvider.jsx';
import { LoginPage } from './LoginPage.jsx';
import { RegisterPage } from './RegisterPage.jsx';

const customer = {
  id: '30000000-0000-4000-8000-000000000003',
  name: 'Mara Santos',
  email: 'mara@example.com',
  role: 'customer',
  created_at: '2026-08-30T00:00:00.000Z',
};

const admin = {
  id: '20000000-0000-4000-8000-000000000002',
  name: 'Ana Reyes',
  email: 'ana@example.com',
  role: 'admin',
  created_at: '2026-08-30T00:00:00.000Z',
};

const jsonResponse = (payload, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authentication flows', () => {
  it('redirects a signed-out visitor from a protected customer route', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required.',
          },
        },
        401,
      ),
    );

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<h1>Sign in required</h1>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/account" element={<h1>Customer account</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Sign in required' }),
    ).toBeInTheDocument();
  });

  it('redirects a customer away from an administrator route', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({ data: { user: customer } }),
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/account" element={<h1>Customer account</h1>} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<h1>Administrator area</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Customer account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Administrator area' }),
    ).not.toBeInTheDocument();
  });

  it('registers a customer and continues to Home by default', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith('/api/auth/me')) {
        return jsonResponse(
          {
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication is required.',
            },
          },
          401,
        );
      }

      if (url.endsWith('/api/auth/register')) {
        return jsonResponse({ data: { user: customer } }, 201);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<h1>Home after registration</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Create your Haven.' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Mara Santos' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'Garden123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Garden123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'Home after registration' }),
    ).toBeInTheDocument();

    const registerCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/api/auth/register'),
    );
    expect(JSON.parse(registerCall[1].body)).toEqual({
      name: 'Mara Santos',
      email: 'mara@example.com',
      password: 'Garden123',
    });
  });

  it('sends a direct customer login to Home', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith('/api/auth/me')) {
        return jsonResponse({ error: { message: 'Authentication required.' } }, 401);
      }

      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ data: { user: customer } });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<h1>Customer Home</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Return to your Haven.' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: customer.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Garden123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Customer Home' }),
    ).toBeInTheDocument();
  });

  it('returns a customer to a safe protected destination after login', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith('/api/auth/me')) {
        return jsonResponse({ error: { message: 'Authentication required.' } }, 401);
      }

      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ data: { user: customer } });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/checkout?step=delivery']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<h1>Protected checkout</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Return to your Haven.' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: customer.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Garden123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Protected checkout' }),
    ).toBeInTheDocument();
  });

  it('sends a direct administrator login to Admin', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith('/api/auth/me')) {
        return jsonResponse({ error: { message: 'Authentication required.' } }, 401);
      }

      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ data: { user: admin } });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<h1>Administrator dashboard</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Return to your Haven.' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: admin.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Garden123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Administrator dashboard' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['customer', '/login', customer, '/', 'Customer Home'],
    ['customer', '/register', customer, '/', 'Customer Home'],
    ['administrator', '/login', admin, '/admin', 'Administrator dashboard'],
    ['administrator', '/register', admin, '/admin', 'Administrator dashboard'],
  ])(
    'redirects an authenticated %s away from %s',
    async (_role, authPath, authenticatedUser, destination, destinationHeading) => {
      vi.spyOn(globalThis, 'fetch').mockReturnValue(
        jsonResponse({ data: { user: authenticatedUser } }),
      );

      render(
        <MemoryRouter initialEntries={[authPath]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path={destination} element={<h1>{destinationHeading}</h1>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(
        await screen.findByRole('heading', { name: destinationHeading }),
      ).toBeInTheDocument();
    },
  );
});
