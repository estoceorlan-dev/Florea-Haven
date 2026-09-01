import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { SessionLoading } from '../components/RouteGuards.jsx';
import { useAuth } from '../hooks/useAuth.js';

const initialForm = { name: '', email: '', password: '', confirmPassword: '' };

const safeReturnPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null;

export function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
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

  const fieldError = (field) =>
    error?.details?.find((detail) => detail.field === field)?.message;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError({
        message: 'Please correct the highlighted field.',
        details: [{ field: 'confirmPassword', message: 'Passwords do not match.' }],
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate(returnPath ?? '/', { replace: true });
    } catch (submissionError) {
      setError(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Make yourself at home"
      title="Create your Haven."
      introduction="Keep your future cart and orders close, and make every return to the garden feel familiar."
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        {error && (
          <div className="form-alert" role="alert">
            {error.message}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            className="form-input"
            type="text"
            autoComplete="name"
            required
            minLength="2"
            maxLength="80"
            aria-invalid={Boolean(fieldError('name'))}
            aria-describedby={fieldError('name') ? 'name-error' : undefined}
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
          {fieldError('name') && (
            <span className="form-field-error" id="name-error">
              {fieldError('name')}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            className="form-input"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldError('email'))}
            aria-describedby={fieldError('email') ? 'email-error' : undefined}
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
          {fieldError('email') && (
            <span className="form-field-error" id="email-error">
              {fieldError('email')}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            className="form-input"
            type="password"
            autoComplete="new-password"
            required
            minLength="8"
            maxLength="72"
            aria-invalid={Boolean(fieldError('password'))}
            aria-describedby={
              fieldError('password') ? 'password-hint password-error' : 'password-hint'
            }
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
          />
          <span className="form-hint" id="password-hint">
            Use 8–72 characters with at least one letter and number.
          </span>
          {fieldError('password') && (
            <span className="form-field-error" id="password-error">
              {fieldError('password')}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="register-password-confirmation">Confirm password</label>
          <input
            id="register-password-confirmation"
            className="form-input"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(fieldError('confirmPassword'))}
            aria-describedby={
              fieldError('confirmPassword') ? 'confirm-password-error' : undefined
            }
            value={form.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
          />
          {fieldError('confirmPassword') && (
            <span className="form-field-error" id="confirm-password-error">
              {fieldError('confirmPassword')}
            </span>
          )}
        </div>

        <button className="button-primary w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Planting your account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-ink/55">
        Already have an account?{' '}
        <Link
          className="font-semibold text-evergreen underline decoration-evergreen/25 underline-offset-4"
          to="/login"
          state={returnPath ? { from: returnPath } : undefined}
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
