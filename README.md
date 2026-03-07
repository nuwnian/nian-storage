# Nian Storage 🌿

A beautiful, full-stack personal cloud storage application with a clean green aesthetic design.

## 🎨 Features

- **Beautiful UI**: Modern, clean interface with a calming green color palette
- **User Authentication**: Login and registration pages with smooth transitions
- **File Management**: 
  - View files in grid or list layout
  - Filter by file type (Images, Videos, Documents)
  - Search functionality
  - Drag & drop upload zone
- **Storage Tracking**: Visual storage usage indicator
- **Responsive Design**: Works on all device sizes

## 🏗️ Architecture

This is a full-stack application with:

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Inline styles with Google Fonts (DM Sans & Syne)
- **State Management**: React useState hooks

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API Structure**: RESTful API
- **Routes**:
  - `/api/auth` - Authentication endpoints (register, login, logout)
  - `/api/files` - File management endpoints (CRUD operations)

## 📁 Project Structure

```
nian storage/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── NianLogin.jsx      # Login/Register page
│   │   │   └── NianStorage.jsx    # Main storage dashboard
│   │   ├── App.jsx                # Root component with auth state
│   │   └── main.jsx               # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── jsconfig.json
│
├── backend/
│   ├── routes/
│   │   ├── auth.js                # Authentication routes
│   │   └── files.js               # File management routes
│   ├── server.js                  # Express server setup
│   ├── package.json
│   └── .env.example               # Environment variables template
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (free tier is fine)

### Installation

1. **Clone the repository** (or navigate to the project folder)

```bash
cd "d:\nian storage"
```

2. **Set up Supabase Database**

Follow the detailed guide in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to:
- Create a Supabase project
- Set up database tables
- Get your credentials

3. **Install Frontend Dependencies**

```bash
cd frontend
npm install
```

4. **Install Backend Dependencies**

```bash
cd ../backend
npm install
```

5. **Configure Environment Variables**

```bash
# In the backend folder
cd backend
# Edit .env and add your Supabase credentials
# SUPABASE_URL and SUPABASE_ANON_KEY
```

### Running the Application

You'll need two terminal windows:

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
The backend will run on `http://localhost:5000`

**Terminal 2 - Frontend Development Server:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```
The build output will be in `frontend/dist/`

**Backend:**
```bash
cd backend
npm start
```

## 🔌 API Endpoints

### Authentication (Supabase Auth)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/logout` - Logout user

### Files (Protected Routes)
- `GET /api/files` - Get all files for logged-in user (with optional filters)
- `GET /api/files/:id` - Get single file
- `POST /api/files/upload` - Upload new file metadata
- `DELETE /api/files/:id` - Delete file

**Note:** All file endpoints require Bearer token in Authorization header.

## 🎯 Future Enhancements

- [x] ~~Add database integration~~ ✅ Supabase PostgreSQL
- [x] ~~Add authentication~~ ✅ Supabase Auth
- [ ] Implement actual file upload to Supabase Storage
- [ ] Add file preview functionality
- [ ] Implement file sharing features
- [ ] Add user profile management page
- [ ] Implement folder organization
- [ ] Add file versioning
- [ ] Mobile app version
- [ ] Real-time file sync

## 🎨 Design System

**Color Palette:**
- Primary Background: `#E8EDE0`
- Secondary Background: `#D4DEC8`
- Card Background: `#DDE8D2`
- Primary Text: `#1C2416`
- Secondary Text: `#6B7D5A`
- Accent: `#E07A2F`
- Green Gradient: `#4A7C3F` → `#7BA05B`

**Typography:**
- Headings: Syne (Bold, ExtraBold)
- Body: DM Sans (Regular, Medium, SemiBold)

## 📝 License

MIT License - feel free to use this project for learning or personal use.

## 👨‍💻 Development Notes

This project was built with a focus on:
- Clean, readable code
- Component reusability
- Smooth animations and transitions
- Accessible UI components
- RESTful API design principles

---

**Built with ❤️ and React**
