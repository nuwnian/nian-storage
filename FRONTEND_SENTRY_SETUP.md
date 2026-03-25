# Frontend Sentry Configuration

## Environment Variables

Create `.env.local` (development) and `.env.production` files with:

```env
# Development (.env.local)
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_APP_VERSION=1.0.0-dev

# Production (.env.production)
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_APP_VERSION=1.0.0
```

## Integration with main.jsx

Update your `src/main.jsx`:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSentry } from './config/sentry.js'

// Initialize Sentry BEFORE rendering the app
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## Usage Examples

### Capture User Context

In your login/auth component:

```javascript
import { setUserContext } from '../config/sentry.js'

// After successful login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username,
})

// On logout
setUserContext(null)
```

### Manual Error Capture

```javascript
import { captureError, addBreadcrumb } from '../config/sentry.js'

try {
  // Some operation
  await uploadFile(file)
  addBreadcrumb('File uploaded successfully', 'file-operation')
} catch (error) {
  captureError(error, {
    file_name: file.name,
    file_size: file.size,
    operation: 'upload'
  })
}
```

### Capture Custom Messages

```javascript
import { captureMessage } from '../config/sentry.js'

captureMessage('User navigated to dashboard', 'info')
captureMessage('Unusual file size detected', 'warning')
```

## Configuration Options

- **tracesSampleRate**: Set to 1.0 (100%) in development for full performance tracking, 0.1 (10%) in production
- **replaysSessionSampleRate**: Records 50% of sessions in development, 10% in production
- **replaysOnErrorSampleRate**: Always records replays when errors occur (1.0)
- **beforeSend**: Filter out errors before sending to Sentry

## Performance Monitoring

Automatically tracks:
- Page load timing
- Route changes
- API requests to configured origins
- React component mounting/unmounting

## Common Issues

### DSN not working
- Ensure DSN is correctly set in environment variables
- Check that you're in the correct Sentry organization/project

### Too many errors in production
- Increase filtering in `beforeSend` function
- Reduce `tracesSampleRate` to 0.05 (5%)

### Session replays not recording
- Ensure `replaysSessionSampleRate` is set to > 0
- Check browser console for any Sentry errors
