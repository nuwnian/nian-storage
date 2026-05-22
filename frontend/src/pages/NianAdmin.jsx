import { useState, useEffect } from "react";
import { captureError } from "../config/sentry.js";
import { API_URL } from "../config/api.js";

export default function NianAdmin(props) {
  const { user, token, onLogout, onBackToStorage } = props;
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch pending users and all users on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch pending users
      const pendingResponse = await fetch(`${API_URL}/api/auth/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!pendingResponse.ok) {
        throw new Error('Failed to fetch pending users');
      }

      const pendingData = await pendingResponse.json();
      setPendingUsers(pendingData.users || []);

      // Fetch all users
      const allResponse = await fetch(`${API_URL}/api/auth/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!allResponse.ok) {
        throw new Error('Failed to fetch all users');
      }

      const allData = await allResponse.json();
      setAllUsers(allData.users || []);
    } catch (err) {
      captureError(err, { operation: 'fetch_users' });
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (actionInProgress === userId) return;
    
    setActionInProgress(userId);
    try {
      const response = await fetch(`${API_URL}/api/auth/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: true, role: 'user' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve user');
      }

      // Refresh data
      fetchData();
    } catch (err) {
      captureError(err, { operation: 'approve_user', userId });
      setError(err.message || 'Failed to approve user');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (userId) => {
    if (actionInProgress === userId) return;
    
    if (!window.confirm('Are you sure you want to reject this user?')) {
      return;
    }

    setActionInProgress(userId);
    try {
      const response = await fetch(`${API_URL}/api/auth/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: false, role: 'pending' })
      });

      if (!response.ok) {
        throw new Error('Failed to reject user');
      }

      // Refresh data
      fetchData();
    } catch (err) {
      captureError(err, { operation: 'reject_user', userId });
      setError(err.message || 'Failed to reject user');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#E8EDE0", minHeight: "100vh", color: "#1C2416" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-header {
          background: #2E3D22;
          color: #E8EDE0;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(30,40,22,0.15);
        }

        .admin-header h1 {
          font-family: "'Syne', sans-serif";
          font-size: 28px;
          font-weight: 700;
        }

        .admin-header .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logout-btn {
          padding: 10px 24px;
          background: #7BA05B;
          color: #E8EDE0;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #6B9047;
          transform: translateY(-2px);
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .section-title {
          font-family: "'Syne', sans-serif";
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1C2416;
        }

        .section-subtitle {
          font-size: 14px;
          color: #6B7D5A;
          margin-bottom: 24px;
        }

        .user-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #F5F7F2;
          border-left: 4px solid #7BA05B;
          border-radius: 8px;
          margin-bottom: 12px;
          transition: all 0.2s;
        }

        .user-card:hover {
          background: #EFF3EB;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .user-info-box {
          flex: 1;
        }

        .user-email {
          font-weight: 600;
          color: #1C2416;
          margin-bottom: 4px;
        }

        .user-details {
          font-size: 13px;
          color: #8BA370;
          display: flex;
          gap: 16px;
        }

        .user-actions {
          display: flex;
          gap: 8px;
        }

        .btn-approve, .btn-reject {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: "'DM Sans', sans-serif";
        }

        .btn-approve {
          background: #7BA05B;
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background: #6B9047;
          transform: translateY(-1px);
        }

        .btn-reject {
          background: #DDE8D2;
          color: #8B3F3F;
          border: 1px solid #C4D4B0;
        }

        .btn-reject:hover:not(:disabled) {
          background: #D0DFC0;
          border-color: #8BA370;
        }

        .btn-approve:disabled, .btn-reject:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .toggle-btn {
          padding: 10px 20px;
          background: #DDE8D2;
          border: 1.5px solid #C4D4B0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #2E3D22;
          cursor: pointer;
          transition: all 0.2s;
          font-family: "'DM Sans', sans-serif";
        }

        .toggle-btn:hover {
          background: #D0DFC0;
          border-color: #8BA370;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #6B7D5A;
        }

        .spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid #DDE8D2;
          border-top-color: #7BA05B;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: #FEE2E2;
          border: 1.5px solid #FCA5A5;
          border-radius: 8px;
          padding: 12px 16px;
          color: #991B1B;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6B7D5A;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #DDE8D2;
          color: #2E3D22;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 12px;
        }

        .badge.approved {
          background: #C6E9C5;
          color: #1B5E20;
        }
      `}</style>

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>nian<span style={{ color: '#E07A2F' }}>.</span> Admin</h1>
          <p style={{ fontSize: 14, color: '#B8C9A6', marginTop: 4 }}>User management & approvals</p>
        </div>
        <div className="user-info">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{user?.name || user?.email}</div>
            <div style={{ fontSize: 12, color: '#B8C9A6' }}>Admin</div>
          </div>
          <button 
            className="logout-btn" 
            onClick={() => onBackToStorage && onBackToStorage()}
            style={{ marginRight: 8 }}
          >
            ← Back
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-container">
        {/* Error Message */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: 16 }}>Loading users...</p>
          </div>
        ) : (
          <>
            {/* Pending Users Section */}
            <div className="section">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div className="section-title">
                    📋 Pending Approvals
                  </div>
                  <div className="section-subtitle">
                    {pendingUsers.length === 0 
                      ? 'No pending users' 
                      : `${pendingUsers.length} user${pendingUsers.length === 1 ? '' : 's'} waiting approval`}
                  </div>
                </div>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✨</div>
                  <p>All caught up! No pending users.</p>
                </div>
              ) : (
                pendingUsers.map(usr => (
                  <div key={usr.id} className="user-card">
                    <div className="user-info-box">
                      <div className="user-email">{usr.email}</div>
                      <div className="user-details">
                        <span>📝 {usr.name}</span>
                        <span>⏰ {formatDate(usr.created_at)}</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApprove(usr.id)}
                        disabled={actionInProgress === usr.id}
                      >
                        {actionInProgress === usr.id ? '...' : '✅ Approve'}
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleReject(usr.id)}
                        disabled={actionInProgress === usr.id}
                      >
                        {actionInProgress === usr.id ? '...' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* All Users Section */}
            <div className="section">
              <button 
                className="toggle-btn"
                onClick={() => setShowAllUsers(!showAllUsers)}
              >
                {showAllUsers ? '▼' : '▶'} All Users ({allUsers.length})
              </button>

              {showAllUsers && (
                <div style={{ marginTop: 24 }}>
                  {allUsers.length === 0 ? (
                    <div className="empty-state">
                      <p>No users yet</p>
                    </div>
                  ) : (
                    allUsers.map(usr => (
                      <div key={usr.id} className="user-card" style={{ borderLeftColor: usr.approved ? '#7BA05B' : '#C4D4B0' }}>
                        <div className="user-info-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="user-email">{usr.email}</div>
                            {usr.approved && <span className="badge approved">✓ Approved</span>}
                            {usr.role === 'admin' && <span className="badge" style={{ background: '#FFE8CC', color: '#E65100' }}>👑 Admin</span>}
                          </div>
                          <div className="user-details">
                            <span>📝 {usr.name}</span>
                            <span>📅 {formatDate(usr.created_at)}</span>
                            {usr.last_login_at && <span>🕐 Last: {formatDate(usr.last_login_at)}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="section">
              <div className="section-title">📊 Quick Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, background: '#F5F7F2', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#7BA05B' }}>
                    {pendingUsers.length}
                  </div>
                  <div style={{ fontSize: 14, color: '#6B7D5A', marginTop: 8 }}>Pending Approval</div>
                </div>
                <div style={{ padding: 16, background: '#F5F7F2', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#7BA05B' }}>
                    {allUsers.filter(u => u.approved).length}
                  </div>
                  <div style={{ fontSize: 14, color: '#6B7D5A', marginTop: 8 }}>Approved Users</div>
                </div>
                <div style={{ padding: 16, background: '#F5F7F2', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#7BA05B' }}>
                    {allUsers.length}
                  </div>
                  <div style={{ fontSize: 14, color: '#6B7D5A', marginTop: 8 }}>Total Users</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
