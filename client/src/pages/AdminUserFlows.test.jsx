import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { AdminUsersPage } from './AdminUsersPage.jsx';

const admin = {
  id: 'admin',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};
const customer = {
  ...admin,
  id: 'customer',
  name: 'Ana Reyes',
  email: 'ana@example.com',
  role: 'customer',
};
const pagination = {
  page: 1,
  total: 2,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};
const response = (payload, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => payload });
const show = (authActions = {}) =>
  render(
    <MemoryRouter>
      <TestAppProviders
        user={admin}
        authActions={authActions}
        queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AdminUsersPage />
      </TestAppProviders>
    </MemoryRouter>,
  );
afterEach(() => vi.restoreAllMocks());

it('creates users, edits roles, confirms deactivation, and refreshes results', async () => {
  let users = [admin, customer];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'POST') {
      const { password: _password, ...input } = JSON.parse(options.body);
      const created = { ...customer, ...input, id: 'new' };
      users.push(created);
      return response({ data: created }, 201);
    }
    if (options?.method === 'PUT') {
      const input = JSON.parse(options.body);
      users = users.map((account) =>
        account.id === 'customer'
          ? { ...account, ...input, is_active: input.isActive ?? account.is_active }
          : account,
      );
      return response({ data: users[1] });
    }
    return response({ data: users, pagination });
  });
  show();
  await screen.findByText('Ana Reyes');
  expect(screen.getByRole('button', { name: 'Deactivate Admin User' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'New User' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'new@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Garden123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
  await screen.findByText('New User was created.');
  await screen.findByText('New User');
  fireEvent.click(screen.getByRole('button', { name: 'Edit Ana Reyes' }));
  fireEvent.change(screen.getByLabelText('Account role'), {
    target: { value: 'admin' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save user' }));
  await screen.findByText('Ana Reyes was updated.');
  expect(
    fetchMock.mock.calls.some(
      ([, options]) =>
        options?.method === 'PUT' && JSON.parse(options.body).role === 'admin',
    ),
  ).toBe(true);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Deactivate Ana Reyes' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate Ana Reyes' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent(
    'order history will be preserved',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));
  await screen.findByText('Ana Reyes was deactivated.');
  await screen.findByRole('button', { name: 'Reactivate Ana Reyes' });
});

it('retains form input after conflicts and updates the signed-in profile', async () => {
  const updateUser = vi.fn();
  let fail = true;
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'PUT') {
      return fail
        ? response(
            { error: { message: 'An account with this email already exists.' } },
            409,
          )
        : response({ data: { ...admin, name: 'Updated Admin' } });
    }
    return response({ data: [admin], pagination });
  });
  show({ updateUser });
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Admin User' }));
  expect(screen.getByLabelText('Account role')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Updated Admin' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save user' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('email already exists');
  expect(screen.getByLabelText('Full name')).toHaveValue('Updated Admin');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Save user' }));
  await screen.findByText('Updated Admin was updated.');
  expect(updateUser).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Updated Admin' }),
  );
});

it('applies filters and pagination, and offers retry on a failed list', async () => {
  let fail = true;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    fail
      ? response({ error: { message: 'Unable to load users.' } }, 500)
      : response({
          data: [customer],
          pagination: { ...pagination, totalPages: 2, hasNextPage: true },
        }),
  );
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load users');
  expect(screen.queryByText('No matching users.')).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Ana Reyes');
  fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Filter by role'), {
    target: { value: 'customer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.at(-1)[0]).toContain('search=Ana&role=customer'),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Next user page' }));
  await waitFor(() => expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=2'));
});
