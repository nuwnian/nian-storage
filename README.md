# Nian Storage 

A full-stack personal cloud storage application with a beautiful green aesthetic and smooth user experience.

##Features

- **Clean UI** - Modern interface with calming green color palette
- **Authentication** - Secure login and registration with Supabase Auth
- **File Management** - Upload, organize, filter, and search files
- **Responsive Design** - Works seamlessly on all devices

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express.js |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Cloudflare R2 |
| **Authentication** | Supabase Auth |

## Quick Start

### Prerequisites
- Node.js v18+
- Supabase account
- Cloudflare R2 account (for file storage)

### Setup

```bash
# Install dependencies
npm run install-all

# Configure environment variables
# Copy backend/.env.example to backend/.env and add:
# - Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# - Cloudflare R2: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
```

### Development

Run both servers with one command:
```bash
npm run dev
```

Or run separately:
```bash
npm run dev:backend  # http://localhost:5000
npm run dev:frontend # http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── NianLogin.jsx       # Auth page
│   │   │   └── NianStorage.jsx     # Main dashboard
│   │   └── config/                 # API & service configs
│   └── tests/e2e/                  # Playwright tests
│
├── backend/
│   ├── routes/                     # API endpoints
│   ├── services/                   # Business logic
│   ├── config/                     # Service configurations
│   └── server.js                   # Express server
│
└── api/                            # Vercel serverless API
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Files (requires Bearer token)
- `GET /api/files` - List files
- `GET /api/files/:id` - Get file details
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/:id` - Delete file

## Storage Architecture

- **Metadata**: Stored in Supabase PostgreSQL (filename, type, size, upload date)
- **File Data**: Stored in Cloudflare R2 for reliable, scalable object storage
- **Access**: Files are proxied through `/api/files/:id/serve` endpoint for secure access

## Testing

```bash
# Backend unit tests (Jest)
npm test --prefix backend
npm run test:watch --prefix backend
npm run test:coverage --prefix backend

# Frontend E2E tests (Playwright)
npm test --prefix frontend
npm run test:ui --prefix frontend
npm run test:debug --prefix frontend
```

## Design System

**Colors:**
- Background: `#E8EDE0`
- Card: `#DDE8D2`
- Text: `#1C2416`
- Accent: `#E07A2F`

**Fonts:**
- Headings: Syne
- Body: DM Sans

## License

MIT - Feel free to use for learning or personal projects.

## Additional Resources

- [Supabase Setup Guide](SUPABASE_SETUP.md)
- [Testing Guide](backend/TESTING.md)

---

**Built with ❤️ and React**
