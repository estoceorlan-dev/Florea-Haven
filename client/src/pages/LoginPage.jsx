import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { SessionLoading } from '../components/RouteGuards.jsx';
import { useAuth } from '../hooks/useAuth.js';

const safeReturnPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null;

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnPath = safeReturnPath(location.state?.from);

  if (isLoading) return <SessionLoading />;
  if (user) {
    return (
      <Navigate
        to={returnPath ?? (user.role === 'admin' ? '/admin' : '/')}
        replace
      />
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const signedInUser = await login(form);
      navigate(returnPath ?? (signedInUser.role === 'admin' ? '/admin' : '/'), {
        replace: true,
      });
    } catch (submissionError) {
      setError(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Return to your Haven."
      introduction="Sign in to continue to your saved cart, orders, and garden-inspired finds."
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {error && (
          <div className="form-alert" role="alert">
            {error.message}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="form-input"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
        </div>

        <button className="button-primary w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Opening the gate…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-ink/55">
        New to Floréa?{' '}
        <Link
          className="font-semibold text-evergreen underline decoration-evergreen/25 underline-offset-4"
          to="/register"
          state={returnPath ? { from: returnPath } : undefined}
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
