import { useState, useEffect } from "react";
import { supabase } from './config/supabase.js';
import NianLogin from './pages/NianLogin';
import NianStorage from './pages/NianStorage';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Listen for auth state changes (session restoration, login, logout)
  useEffect(() => {
    console.log('[AUTH] Setting up auth state listener');
    
    // ✅ CRITICAL: onAuthStateChange fires when:
    // - Component mounts (checks persisted session)
    // - URL hash tokens are detected and processed
    // - User logs in/out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH STATE CHANGE]', {
        event,
        hasSession: !!session,
        user: session?.user?.email || 'null',
        timestamp: new Date().toISOString()
      });

      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION fires after app load, session restoration complete
        console.log('[AUTH] ✅ Initial session check complete');
        setSessionRestored(true);

        if (session?.access_token) {
          console.log('[AUTH] ✅ Session restored from persistence or URL hash');
          setUser(session.user);
          setToken(session.access_token);
          setLoggedIn(true);
        } else {
          console.log('[AUTH] ⚠️ No session found');
          setLoggedIn(false);
        }
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        console.log('[AUTH] ✅ User signed in');
        setUser(session.user);
        setToken(session.access_token);
        setLoggedIn(true);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] ⚠️ User signed out');
        setUser(null);
        setToken(null);
        setLoggedIn(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AUTH] 🔄 Token refreshed');
        if (session?.access_token) {
          setToken(session.access_token);
        }
      }
    });

    return () => {
      console.log('[AUTH] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (userData, accessToken) => {
    console.log('[LOGIN] User logged in:', userData.email);
    setUser(userData);
    setToken(accessToken);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    console.log('[LOGOUT] User logged out');
    setUser(null);
    setToken(null);
    setLoggedIn(false);
    supabase.auth.signOut();
  };

  // Show loading state while checking auth
  if (loading || !sessionRestored) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#E8EDE0',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 800, 
            fontSize: 32, 
            color: '#1C2416',
            marginBottom: 16 
          }}>
            nian<span style={{ color: '#E07A2F' }}>.</span>
          </div>
          <div style={{ fontSize: 14, color: '#6B7D5A' }}>
            {loading || !sessionRestored ? 'Checking session...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (loggedIn) return <NianStorage user={user} token={token} onLogout={handleLogout} />;
  return <NianLogin onLogin={handleLogin} />;
}

export default App;
