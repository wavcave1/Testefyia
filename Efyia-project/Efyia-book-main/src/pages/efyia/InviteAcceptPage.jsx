import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { inviteApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser, login } = useAppContext();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    inviteApi.getInvite(token)
      .then((data) => { setInvite(data); setLoading(false); })
      .catch((err) => { setLoadError(err.message || 'Invalid or expired invite link.'); setLoading(false); });
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {};
      if (!currentUser) {
        body.name = name.trim();
        body.password = password;
      }
      const result = await inviteApi.accept(token, body);
      if (result?.token) {
        // New account created — log them in
        localStorage.setItem('efyia_token', result.token);
        await login(invite.email, password).catch(() => {});
      }
      navigate('/dashboard/studio', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Could not accept invite.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem' }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Invite invalid or expired</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{loadError}</p>
          <Link to="/signup" className="eyf-button" style={{ display: 'inline-block' }}>Create an account</Link>
          <span style={{ margin: '0 0.75rem', color: 'var(--muted)' }}>or</span>
          <Link to="/login" style={{ color: 'var(--mint, #62f3d4)' }}>Sign in</Link>
        </div>
      </div>
    );
  }

  const isEmailMatch = currentUser && currentUser.email === invite?.email;
  const isLoggedIn = !!currentUser;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 440, width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>You're invited</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Join <strong>{invite?.studioName || 'a studio'}</strong> on Efyia Book as{' '}
          <strong>{invite?.role === 'MANAGER' ? 'a Manager' : invite?.role === 'ENGINEER' ? 'an Engineer' : invite?.role}</strong>.
        </p>

        {isLoggedIn && !isEmailMatch ? (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ color: '#f87171', fontSize: '0.875rem', margin: 0 }}>
              This invite was sent to <strong>{invite?.email}</strong>, but you're signed in as <strong>{currentUser.email}</strong>.{' '}
              Please sign out and try again, or use the correct account.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleAccept}>
          {!isLoggedIn ? (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                Create an account to accept this invite. Your email will be set to{' '}
                <strong>{invite?.email}</strong>.
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  Create a password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
            </>
          ) : null}

          {submitError ? (
            <p style={{ color: 'var(--error, #f87171)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{submitError}</p>
          ) : null}

          <button
            type="submit"
            className="eyf-button"
            disabled={submitting || (isLoggedIn && !isEmailMatch)}
            style={{ width: '100%' }}
          >
            {submitting ? 'Accepting...' : `Accept and join ${invite?.studioName || 'the studio'}`}
          </button>
        </form>

        {!isLoggedIn ? (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to={`/login?redirect=/accept-invite/${token}`} style={{ color: 'var(--mint, #62f3d4)' }}>
              Sign in instead
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
