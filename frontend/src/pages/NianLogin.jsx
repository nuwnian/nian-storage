import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default function NianLogin(props) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle OAuth callback on mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          setLoading(true);
          try {
            const response = await fetch(`${API_URL}/api/auth/oauth/callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ access_token, refresh_token }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'OAuth authentication failed');
            }

            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);

            // Call onLogin with user data and token
            props.onLogin(data.user, data.session.access_token);
          } catch (err) {
            console.error('OAuth callback error:', err);
            setError(err.message || 'OAuth authentication failed');
            setLoading(false);
          }
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleOAuth = async (provider) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/oauth/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('OAuth failed. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Call onLogin with user data and token
      props.onLogin(data.user, data.session.access_token);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#E8EDE0", minHeight: "100vh", color: "#1C2416", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .input-field {
          width: 100%; padding: 12px 16px;
          background: #DDE8D2; border: 1.5px solid #C4D4B0;
          border-radius: 12px; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1C2416; outline: none;
          transition: all 0.2s;
        }
        .input-field::placeholder { color: #8BA370; }
        .input-field:focus { border-color: #4A7C3F; background: #E4EDD9; box-shadow: 0 0 0 3px rgba(74,124,63,0.12); }

        .submit-btn {
          width: 100%; padding: 13px;
          background: #2E3D22; color: #E8EDE0;
          border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
        }
        .submit-btn:hover { background: #1C2416; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(30,40,22,0.2); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .social-btn {
          flex: 1; padding: 11px;
          background: #DDE8D2; border: 1.5px solid #C4D4B0;
          border-radius: 12px; font-size: 13px; font-weight: 500;
          font-family: 'DM Sans', sans-serif; color: #2E3D22;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .social-btn:hover { background: #D4DEC8; border-color: #8BA370; }
        .social-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .show-pass {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: #8BA370; cursor: pointer;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .show-pass:hover { color: #4A7C3F; }

        .divider { display: flex; align-items: center; gap: 12px; color: #8BA370; font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #C4D4B0; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(232,237,224,0.3); border-top-color: #E8EDE0; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .float { animation: float 4s ease-in-out infinite; }
        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-slower { animation: float 8s ease-in-out infinite 1s; }

        @media (max-width: 768px) {
          .hero-panel { display: none !important; }
          .login-panel { width: 100% !important; }
        }
      `}</style>

      {/* ── LEFT HERO PANEL ── */}
      <div className="hero-panel" style={{
        width: "55%", background: "#2E3D22", position: "relative",
        display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0
      }}>
        {/* Soft gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, #4A7C3F44, transparent 60%), radial-gradient(ellipse at 80% 80%, #1C2416aa, transparent 50%)" }} />

        {/* Decorative circles */}
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", top: -100, right: -100 }} />
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", bottom: 60, left: -60 }} />
        <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", bottom: 180, right: 40 }} />

        {/* Logo top left */}
        <div style={{ position: "relative", zIndex: 2, padding: "32px 40px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#E8EDE0", letterSpacing: "-0.5px" }}>
            nian<span style={{ color: "#E07A2F" }}>.</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,237,224,0.4)", marginTop: 2 }}>personal storage</div>
        </div>

        {/* Center content */}
        <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 48px 40px" }}>

          {/* Floating file cards mockup */}
          <div style={{ position: "relative", width: 280, height: 220, marginBottom: 48 }}>
            {/* Back card */}
            <div className="float-slower" style={{ position: "absolute", top: 20, left: 10, width: 200, height: 130, background: "rgba(255,255,255,0.05)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(4px)", transform: "rotate(-6deg)" }}>
              <div style={{ padding: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#E05A5A22", border: "1px solid #E05A5A33", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#E05A5A" strokeWidth="1.8" style={{width:18,height:18}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)", width: "70%", marginBottom: 6 }} />
                <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", width: "45%" }} />
              </div>
            </div>

            {/* Middle card - video */}
            <div className="float-slow" style={{ position: "absolute", top: 10, right: 0, width: 180, height: 120, background: "rgba(255,255,255,0.06)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(4px)", transform: "rotate(4deg)", overflow: "hidden" }}>
              <div style={{ width: "100%", height: 70, background: "rgba(74,124,63,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="white" style={{width:10,height:10,marginLeft:1}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div style={{ padding: "8px 12px" }}>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.1)", width: "80%", marginBottom: 5 }} />
                <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)", width: "50%" }} />
              </div>
            </div>

            {/* Front card - image */}
            <div className="float" style={{ position: "absolute", bottom: 0, left: 30, width: 210, height: 130, background: "rgba(255,255,255,0.07)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
              <div style={{ width: "100%", height: 80, background: "linear-gradient(135deg, #4A7C3F55, #7BA05B44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" style={{width:32,height:32}}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.15)", width: 100, marginBottom: 5 }} />
                  <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.08)", width: 60 }} />
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{width:11,height:11}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
              </div>
            </div>

            {/* Storage pill */}
            <div className="float-slow" style={{ position: "absolute", top: 0, right: 20, background: "rgba(232,237,224,0.08)", borderRadius: 20, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,237,224,0.7)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                ☁️ 4.2 / 10 GB
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 36, color: "#E8EDE0", textAlign: "center", lineHeight: 1.2, letterSpacing: "-1px", marginBottom: 16 }}>
            Your files,<br />
            <span style={{ color: "#7BA05B" }}>always with you.</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(232,237,224,0.5)", textAlign: "center", lineHeight: 1.7, maxWidth: 320 }}>
            Store your photos, videos, and documents securely in one calm, beautiful place.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
            {[["10 GB", "Free storage"], ["Fast", "Cloudflare R2"], ["Private", "Your data only"]].map(([val, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#E8EDE0" }}>{val}</div>
                <div style={{ fontSize: 11, color: "rgba(232,237,224,0.4)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{ position: "relative", zIndex: 2, padding: "20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 12, color: "rgba(232,237,224,0.3)", textAlign: "center" }}>
            Built with Supabase · Cloudflare R2 · React
          </p>
        </div>
      </div>

      {/* ── RIGHT LOGIN PANEL ── */}
      <div className="login-panel" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#D4DEC8", overflowY: "auto" }}>

        {/* Top nav */}
        <div style={{ padding: "32px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Mobile only logo */}
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#1C2416", letterSpacing: "-0.5px" }}>
            nian<span style={{ color: "#E07A2F" }}>.</span>
          </div>
          <div style={{ fontSize: 14, color: "#8BA370" }}>
            {mode === "login" ? "No account yet? " : "Already have one? "}
            <span onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{ color: "#4A7C3F", fontWeight: 600, cursor: "pointer" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </span>
          </div>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 40px" }}>
          <div className="fade-up" style={{ width: "100%", maxWidth: 380 }}>

            {/* Greeting */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 28, color: "#1C2416", letterSpacing: "-0.5px", marginBottom: 8 }}>
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p style={{ fontSize: 14, color: "#6B7D5A" }}>
                {mode === "login" ? "Sign in to access your storage" : "Start storing your files for free"}
              </p>
            </div>

            {/* Social buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <button className="social-btn" onClick={() => handleOAuth('google')} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button className="social-btn" onClick={() => handleOAuth('github')} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1C2416">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                GitHub
              </button>
            </div>

            <div className="divider" style={{ marginBottom: 24 }}>or continue with email</div>

            {/* Error message */}
            {error && (
              <div style={{ background: '#FEE2E2', border: '1.5px solid #FCA5A5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#991B1B' }}>
                {error}
              </div>
            )}

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mode === "register" && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#2E3D22", display: "block", marginBottom: 8 }}>FULL NAME</label>
                  <input className="input-field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#2E3D22", display: "block", marginBottom: 8 }}>EMAIL</label>
                <input className="input-field" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#2E3D22" }}>PASSWORD</label>
                  {mode === "login" && <span style={{ fontSize: 13, color: "#4A7C3F", cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>}
                </div>
                <div style={{ position: "relative" }}>
                  <input className="input-field" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 42 }} />
                  <button className="show-pass" onClick={() => setShowPass(!showPass)}>
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input type="checkbox" id="terms" style={{ marginTop: 2, accentColor: "#4A7C3F", width: 14, height: 14, cursor: "pointer" }} />
                  <label htmlFor="terms" style={{ fontSize: 12, color: "#6B7D5A", lineHeight: 1.5, cursor: "pointer" }}>
                    I agree to the <span style={{ color: "#4A7C3F", fontWeight: 500 }}>Terms of Service</span> and <span style={{ color: "#4A7C3F", fontWeight: 500 }}>Privacy Policy</span>
                  </label>
                </div>
              )}

              <button className="submit-btn" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
                {loading ? <span className="spinner" /> : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 32px", borderTop: "1px solid #C4D4B0", display: "flex", justifyContent: "center", gap: 24 }}>
          {["Privacy", "Terms", "Help"].map(link => (
            <span key={link} style={{ fontSize: 12, color: "#6B7D5A", cursor: "pointer" }}
              onMouseEnter={e => e.target.style.color = "#2E3D22"}
              onMouseLeave={e => e.target.style.color = "#6B7D5A"}
            >{link}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
