# Quick Setup Guide for Nian Storage

## Prerequisites Check
- [ ] Node.js installed (version 18+)
- [ ] npm or yarn installed
- [ ] Code editor ready (VS Code recommended)

## Installation Steps

### Step 1: Install Dependencies

Open your terminal and navigate to the project root:

```bash
cd "d:\nian storage"
```

Install all dependencies at once:
```bash
npm run install-all
```

Or install them separately:
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

### Step 2: Setup Backend Environment

Create a `.env` file in the backend folder:
```bash
cd backend
copy .env.example .env
```

The default values in `.env.example` are sufficient for development.

### Step 3: Run the Application

**Option A: Run both servers together (Recommended)**

From the project root:
```bash
npm run dev
```

**Option B: Run servers separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Step 4: Access the Application

Once both servers are running:
- Frontend: Open your browser to `http://localhost:3000`
- Backend API: `http://localhost:5000`

## Testing the Application

1. You'll see the **Login Page** first
2. You can switch between "Sign In" and "Create Account" tabs
3. Fill in the form and click submit
4. After the loading animation, you'll be redirected to the **Storage Dashboard**
5. Try the following features:
   - Switch between Grid and List views
   - Filter files by type (All, Photos, Videos, Docs)
   - Search for files
   - Hover over the upload zone

## Troubleshooting

**Port already in use?**
- Frontend: Edit `vite.config.js` and change port 3000 to another
- Backend: Edit `.env` and change PORT to another number

**Module not found errors?**
- Run `npm install` again in the respective folder

**Cannot find 'react'?**
- Navigate to frontend folder: `cd frontend`
- Install dependencies: `npm install`

## Next Steps

Now that everything is set up:
1. Explore the code in `frontend/src/pages/`
2. Check the API routes in `backend/routes/`
3. Customize the design colors in the JSX files
4. Add new features following the existing structure

## Development Tips

- Frontend hot-reloads automatically when you save changes
- Backend restarts automatically with nodemon
- Check browser console for any frontend errors
- Check terminal for backend errors

Happy coding! 🌿
