import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

function validate(form, isLogin) {
  const errors = {};
  if (!isLogin && (!form.name || form.name.trim().length < 2)) {
    errors.name = 'Name must be at least 2 characters.';
  }
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!form.password || form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  return errors;
}

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAppContext();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const getRedirect = (user) => {
    if (from) return from;
    const roleMap = { ADMIN: '/dashboard/admin', OWNER: '/dashboard/studio', CLIENT: '/dashboard/client' };
    return roleMap[user.role] || '/';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const errors = validate(form, isLogin);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const user = isLogin
        ? await login(form.email.trim(), form.password)
        : await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      navigate(getRedirect(user), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eyf-page">
      <section className="eyf-section eyf-auth-wrap">
        <form className="eyf-card eyf-auth-card eyf-stack" onSubmit={handleSubmit} noValidate>
          <div>
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="eyf-muted">
              {isLogin
                ? 'Sign in to manage your bookings and saved studios.'
                : 'Join Efyia Book to discover and book recording studios.'}
            </p>
          </div>

          {serverError ? (
            <div className="eyf-error-box" role="alert">{serverError}</div>
          ) : null}

          {!isLogin ? (
            <div>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={update('name')}
                  autoComplete="name"
                  required
                />
              </label>
              {fieldErrors.name ? <p className="eyf-field-error">{fieldErrors.name}</p> : null}
            </div>
          ) : null}

          <div>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </label>
            {fieldErrors.email ? <p className="eyf-field-error">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </label>
            {fieldErrors.password ? <p className="eyf-field-error">{fieldErrors.password}</p> : null}
            {!isLogin ? <p className="eyf-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Minimum 8 characters.</p> : null}
          </div>

          {!isLogin ? (
            <label>
              Account type
              <select value={form.role} onChange={update('role')}>
                <option value="CLIENT">Artist / Client</option>
                <option value="OWNER">Studio Owner</option>
              </select>
            </label>
          ) : null}

          <button type="submit" className="eyf-button" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="eyf-muted" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            {isLogin ? (
              <>Don't have an account? <Link to="/signup" style={{ color: 'var(--mint)' }}>Sign up</Link></>
            ) : (
              <>Already have an account? <Link to="/login" style={{ color: 'var(--mint)' }}>Sign in</Link></>
            )}
          </p>
        </form>
      </section>
    </div>
  );
}
