import { useEffect, useState } from 'react';

const call = async (path, method = 'GET', body) => {
  const r = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default function App() {
  const [view, setView] = useState('loading');
  const [me, setMe] = useState(null);
  const [qr, setQr] = useState(null);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const loadMe = async () => {
    const r = await call('/auth/me');
    if (r.ok) { setMe(r.data); setView('dash'); } else setView('login');
  }
  useEffect(() => { loadMe(); }, []);

  const login = async (e) => {
    e.preventDefault(); setErr('');
    const r = await call('/auth/login', 'POST', { email, password });
    if (!r.ok) return setErr(r.data.error || 'Login failed');
    setPassword('');
    if (r.data.next === 'mfa_setup') {
      const s = await call('/auth/mfa/setup', 'POST');
      if (!s.ok) return setErr(s.data.error || 'MFA setup failed');
      setQr(s.data.qr);
    }
    setView('mfa');
  }

  async function verify(e) {
    e.preventDefault(); setErr('');
    const r = await call('/auth/mfa/verify', 'POST', { code });
    if (!r.ok) return setErr(r.data.error || 'Invalid code');
    setCode(''); setQr(null); loadMe();
  }

  async function logout() {
    await call('/auth/logout', 'POST');
    setMe(null); setView('login');
  }

  if (view === 'loading') return null;

  if (view === 'dash')
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>Mandates</h2>
          <span>{me.email} ({me.role}) <button onClick={logout}>Logout</button></span>
        </div>
        <p>Dashboard coming soon.</p>
      </div>
    );

  return (
    <div style={{ maxWidth: 320, margin: '80px auto' }}>
      {view === 'login' ? (
        <form onSubmit={login}>
          <h2>Login</h2>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /><br />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /><br />
          <button>Continue</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <h2>Authenticator code</h2>
          {qr && <img src={qr} width="200" alt="Scan with Google Authenticator" />}
          <input placeholder="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /><br />
          <button>Verify</button>
        </form>
      )}
      {err && <p style={{ color: 'red' }}>{err}</p>}
    </div>
  );
}