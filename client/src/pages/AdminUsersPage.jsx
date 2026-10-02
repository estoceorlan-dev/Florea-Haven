import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Plus, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { EmptyState, FeedbackBanner } from '../components/ui/PageState.jsx';
import { AdminListSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { queryKeys } from '../queries/queryKeys.js';
import { useAdminQuery } from '../queries/useAdminQuery.js';
import { adminUserApi } from '../services/api.js';
import { formatDateTime } from '../utils/currency.js';

const initialFilters = { search: '', role: 'all', status: 'all' };
const errorMessage = (error) => error.details?.[0]?.message ?? error.message;

function UserForm({ account, isSelf, onSubmit, onCancel, busy, onBusy }) {
  const [values, setValues] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    role: account?.role ?? 'customer',
    password: '',
  });
  const [error, setError] = useState('');
  const saving = useRef(false);
  const update = ({ target }) =>
    setValues((current) => ({ ...current, [target.name]: target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    onBusy(true);
    setError('');
    try {
      const { password, ...profile } = values;
      await onSubmit(account ? profile : { ...profile, password });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      saving.current = false;
      onBusy(false);
    }
  };

  return (
    <form
      className="rounded-card border border-border bg-surface p-6 shadow-low"
      onSubmit={submit}
      aria-label={account ? 'Edit user' : 'Create user'}
    >
      <p className="eyebrow text-clay">Account details</p>
      <h2 className="mt-2 font-display text-3xl text-evergreen">
        {account ? 'Edit user' : 'Add a user'}
      </h2>
      <fieldset disabled={busy} className="mt-6 grid min-w-0 gap-5">
        <label className="form-field">
          Full name
          <input
            className="form-input"
            name="name"
            value={values.name}
            onChange={update}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label className="form-field">
          Email address
          <input
            className="form-input"
            name="email"
            type="email"
            value={values.email}
            onChange={update}
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        {!account && (
          <label className="form-field">
            Password
            <input
              className="form-input"
              name="password"
              type="password"
              value={values.password}
              onChange={update}
              required
              minLength={8}
              maxLength={72}
              pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,72}"
              autoComplete="new-password"
              aria-label="Password"
              aria-describedby="user-password-hint"
            />
            <span id="user-password-hint" className="form-hint text-text-muted">
              8–72 characters, including a letter and a number.
            </span>
          </label>
        )}
        <label className="form-field">
          Account role
          <select
            className="form-input"
            name="role"
            aria-label="Account role"
            aria-describedby="user-role-hint"
            value={values.role}
            onChange={update}
            disabled={isSelf}
          >
            <option value="customer">Customer</option>
            <option value="admin">Administrator</option>
          </select>
          <span id="user-role-hint" className="form-hint text-text-muted">
            {isSelf
              ? 'You cannot change your own administrator role.'
              : 'Administrators can manage users, products, categories, and orders.'}
          </span>
        </label>
        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        <button className="button-primary w-full" type="submit">
          {busy ? 'Saving…' : account ? 'Save user' : 'Create user'}
        </button>
        <button className="button-secondary w-full" type="button" onClick={onCancel}>
          Cancel
        </button>
      </fieldset>
    </form>
  );
}

export function AdminUsersPage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState({ ...initialFilters, page: 1 });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState('');
  const [mutationError, setMutationError] = useState(null);
  const usersQuery = useAdminQuery('users', { ...filters, limit: 20 });
  const accounts = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const formRef = useRef(null);
  const changingStatus = useRef(false);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.user(user?.id), 'admin', 'users'],
    });
  const openEditor = (account = null) => {
    setEditor({ account });
    setMutationError(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      formRef.current?.querySelector('input')?.focus({ preventScroll: true });
    });
  };
  const save = async (input) => {
    setNotice('');
    const account = editor.account;
    const result = account
      ? await adminUserApi.updateUser(account.id, input)
      : await adminUserApi.createUser(input);
    if (result.data.id === user?.id) updateUser({ ...user, ...result.data });
    setNotice(`${result.data.name} was ${account ? 'updated' : 'created'}.`);
    setEditor(null);
    await refresh();
  };
  const changeStatus = async () => {
    if (!pending || changingStatus.current) return;
    changingStatus.current = true;
    setBusy(true);
    setMutationError(null);
    setNotice('');
    try {
      const result = await adminUserApi.updateUser(pending.id, {
        isActive: !pending.is_active,
      });
      setNotice(
        `${result.data.name} was ${result.data.is_active ? 'reactivated' : 'deactivated'}.`,
      );
      setPending(null);
      await refresh();
    } catch (error) {
      setMutationError(error);
      setPending(null);
    } finally {
      changingStatus.current = false;
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <p className="eyebrow text-clay">Account administration</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
            Users
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Manage customer and administrator accounts. Deactivate access while keeping
            order history.
          </p>
        </div>
        <button className="button-primary" disabled={busy} onClick={() => openEditor()}>
          <Plus size={16} aria-hidden="true" />
          Add user
        </button>
      </div>
      {notice && (
        <FeedbackBanner className="mt-6" onDismiss={() => setNotice('')}>
          {notice}
        </FeedbackBanner>
      )}
      {mutationError && (
        <FeedbackBanner
          className="mt-6"
          tone="error"
          onDismiss={() => setMutationError(null)}
        >
          {errorMessage(mutationError)}
        </FeedbackBanner>
      )}

      <form
        className="mt-7 grid gap-4 rounded-card border border-border bg-surface p-4 shadow-low sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Filter users"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ ...draft, search: draft.search.trim(), page: 1 });
        }}
      >
        <label className="form-field">
          Search users
          <input
            className="form-input"
            type="search"
            placeholder="Name or email"
            maxLength={254}
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
          />
        </label>
        <label className="form-field">
          Filter by role
          <select
            className="form-input"
            value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
          >
            <option value="all">All roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Administrators</option>
          </select>
        </label>
        <label className="form-field">
          Filter by status
          <select
            className="form-input"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="button-primary" type="submit">
            Apply filters
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              setDraft(initialFilters);
              setFilters({ ...initialFilters, page: 1 });
            }}
          >
            Clear
          </button>
        </div>
      </form>

      <div
        className={`mt-6 grid items-start gap-6 ${editor ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}
      >
        <div className="min-w-0">
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
            <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-5 py-4">
              <Users size={18} aria-hidden="true" />
              <h2 className="text-sm font-bold text-evergreen">
                User accounts{pagination ? ` (${pagination.total})` : ''}
              </h2>
            </div>
            {usersQuery.isPending ? (
              <AdminListSkeleton label="Loading users" />
            ) : usersQuery.isError ? (
              <div className="p-5">
                <p role="alert" className="form-alert">
                  {usersQuery.error.message}
                </p>
                <button
                  className="button-secondary mt-4"
                  onClick={() => usersQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <EmptyState
                className="m-4"
                icon={Users}
                eyebrow="User accounts"
                title="No matching users."
                description="Try another name, email, role, or status."
              />
            ) : (
              <ul className="divide-y divide-border">
                {accounts.map((account) => (
                  <li
                    key={account.id}
                    className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words font-display text-2xl text-evergreen">
                        {account.name}
                        {account.id === user?.id && (
                          <span className="ml-2 text-xs font-sans text-text-muted">
                            (You)
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 break-all text-sm text-text-muted">
                        {account.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                          {account.role === 'admin' ? 'Administrator' : 'Customer'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 ${account.is_active ? 'bg-brand-soft text-success' : 'bg-surface-muted text-text-muted'}`}
                        >
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-text-muted">
                        Joined {formatDateTime(account.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="button-secondary"
                        disabled={busy}
                        aria-label={`Edit ${account.name}`}
                        onClick={() => openEditor(account)}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        className="button-secondary"
                        disabled={busy || account.id === user?.id}
                        aria-label={`${account.is_active ? 'Deactivate' : 'Reactivate'} ${account.name}`}
                        title={
                          account.id === user?.id
                            ? 'You cannot deactivate your own account.'
                            : undefined
                        }
                        onClick={() => setPending(account)}
                      >
                        {account.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {pagination && !usersQuery.isError && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-text-muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
                users
              </p>
              <div className="flex gap-2">
                <button
                  className="pagination-button"
                  aria-label="Previous user page"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() =>
                    setFilters((current) => ({ ...current, page: current.page - 1 }))
                  }
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  className="pagination-button"
                  aria-label="Next user page"
                  disabled={!pagination.hasNextPage}
                  onClick={() =>
                    setFilters((current) => ({ ...current, page: current.page + 1 }))
                  }
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
        {editor && (
          <div ref={formRef}>
            <UserForm
              key={editor.account?.id ?? 'new'}
              account={editor.account}
              isSelf={editor.account?.id === user?.id}
              onSubmit={save}
              onCancel={() => setEditor(null)}
              busy={busy}
              onBusy={setBusy}
            />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending
            ? `${pending.is_active ? 'Deactivate' : 'Reactivate'} ${pending.name}?`
            : ''
        }
        description={
          pending?.is_active
            ? 'This user will be signed out and unable to sign in. Their account and order history will be preserved.'
            : 'This user will be able to sign in again with their existing credentials.'
        }
        confirmLabel={pending?.is_active ? 'Deactivate user' : 'Reactivate user'}
        isConfirming={busy}
        onClose={() => setPending(null)}
        onConfirm={changeStatus}
      />
    </section>
  );
}
