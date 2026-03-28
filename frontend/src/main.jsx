import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Initialize Sentry FIRST (before rendering React)
import { initSentry } from './config/sentry.js'
initSentry()

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unknown frontend error',
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[APP ERROR BOUNDARY]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E8EDE0',
          fontFamily: 'sans-serif',
          color: '#1C2416',
          padding: '24px',
        }}>
          <div style={{ maxWidth: 720, width: '100%', background: '#fff', border: '1px solid #D4DEC8', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 12px 0' }}>Frontend crashed</h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              The app hit a runtime error. Open DevTools Console to see details.
            </p>
            <pre style={{
              marginTop: 12,
              background: '#F6F8F2',
              padding: 12,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.message}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
