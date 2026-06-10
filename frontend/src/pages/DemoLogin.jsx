import { useEffect, useState } from "react";
import { setUserContext, captureError } from "../config/sentry.js";
import { API_URL } from "../config/api.js";

export default function DemoLogin(props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem('nian.demo.email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter an email address');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, demoMode: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Demo sign-in failed');
      }

      if (!data.session?.access_token) {
        throw new Error('No demo session was created');
      }

      localStorage.setItem('nian.demo.email', normalizedEmail);
      setUserContext({
        id: data.user.id,
        email: data.user.email,
        username: data.user.name,
        demoMode: true,
      });

      props.onLogin(data.user, data.session.access_token);
    } catch (err) {
      captureError(err, {
        operation: 'demo_login',
        email: normalizedEmail,
      });
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', fontFamily: "'DM Sans', sans-serif", background: '#E8EDE0', color: '#1C2416' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        .demo-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #C4D4B0;
          background: #DDE8D2;
          color: #1C2416;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }
        .demo-input:focus {
          border-color: #4A7C3F;
          box-shadow: 0 0 0 3px rgba(74,124,63,0.12);
          background: #E4EDD9;
        }
        .demo-button {
          width: 100%;
          padding: 14px 16px;
          border: 0;
          border-radius: 12px;
          background: #2E3D22;
          color: #E8EDE0;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .demo-button:hover { background: #1C2416; transform: translateY(-1px); }
        .demo-button:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .demo-card {
          width: min(440px, calc(100% - 40px));
          margin: auto;
          padding: 28px;
          border-radius: 24px;
          background: rgba(255,255,255,0.42);
          border: 1px solid rgba(255,255,255,0.55);
          backdrop-filter: blur(10px);
          box-shadow: 0 30px 80px rgba(28,36,22,0.12);
        }
      `}</style>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1C2416 0%, #2E3D22 55%, #4A7C3F 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(123,160,91,0.35), transparent 34%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.10), transparent 25%), radial-gradient(circle at 70% 80%, rgba(224,122,47,0.22), transparent 30%)' }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px 40px' }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#E8EDE0', letterSpacing: '-0.04em' }}>
              nian<span style={{ color: '#E07A2F' }}>.</span>
            </div>
            <div style={{ marginTop: 16, maxWidth: 420, color: 'rgba(232,237,224,0.82)' }}>
              <h1 style={{ margin: '18px 0 14px', fontFamily: "'Syne', sans-serif", fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.06em' }}>
                Sign in
                <br />
                to continue.
              </h1>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, maxWidth: 360 }}>
                Enter your email to access your storage.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, maxWidth: 540, color: 'rgba(232,237,224,0.88)' }}>
            {[
              ['Private', 'Your files stay secure'],
              ['Fast', 'Cloud-backed access'],
              ['Simple', 'One clean sign-in flow'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(232,237,224,0.68)' }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: 'min(520px, 100%)', display: 'flex', background: '#D4DEC8' }}>
        <div className="demo-card">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: '#8BA370', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Demo session</div>
            <h2 style={{ margin: '10px 0 8px', fontFamily: "'Syne', sans-serif", fontSize: 30, letterSpacing: '-0.04em' }}>Launch the demo</h2>
            <p style={{ margin: 0, color: '#6B7D5A', lineHeight: 1.7 }}>
              Type any dummy email and continue. No real user info is needed, and the address is used only for display in demo mode.
            </p>
            
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#2E3D22' }}>EMAIL</label>
              <input
                className="demo-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            <button className="demo-button" type="submit" disabled={loading || !email.trim()}>
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
