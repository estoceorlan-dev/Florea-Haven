import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute, ProtectedRoute } from '../components/RouteGuards.jsx';
import { AuthProvider } from '../context/AuthProvider.jsx';
import { RegisterPage } from './RegisterPage.jsx';

const customer = {
  id: '30000000-0000-4000-8000-000000000003',
  name: 'Mara Santos',
  email: 'mara@example.com',
  role: 'customer',
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

  it('registers a customer and continues to the protected account route', async () => {
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
            <Route element={<ProtectedRoute />}>
              <Route path="/account" element={<h1>Account ready</h1>} />
            </Route>
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
      await screen.findByRole('heading', { name: 'Account ready' }),
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
});
