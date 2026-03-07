import { useState, useEffect } from "react";
import NianLogin from './pages/NianLogin';
import NianStorage from './pages/NianStorage';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = localStorage.getItem('supabase.auth.token');
      
      if (!session) {
        setLoading(false);
        return;
      }

      // Verify session with backend
      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(session);
        setLoggedIn(true);
      } else {
        // Invalid session, clear it
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('supabase.auth.token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, accessToken) => {
    localStorage.setItem('supabase.auth.token', accessToken);
    setUser(userData);
    setToken(accessToken);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('supabase.auth.token');
    setUser(null);
    setToken(null);
    setLoggedIn(false);
  };

  // Show loading state while checking auth
  if (loading) {
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
          <div style={{ fontSize: 14, color: '#6B7D5A' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (loggedIn) return <NianStorage user={user} token={token} onLogout={handleLogout} />;
  return <NianLogin onLogin={handleLogin} />;
}

export default App;
