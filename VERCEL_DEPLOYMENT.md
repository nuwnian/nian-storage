# Vercel Deployment Configuration

## 🔧 Frontend Configuration (Vercel)

### 1. Connect Your Repo
```bash
# Option A: Via Vercel Dashboard
1. Go to https://vercel.com/import
2. Select your repository
3. Click "Import"

# Option B: Via CLI
vercel login
cd frontend
vercel
```

### 2. Environment Variables (Frontend)

In Vercel Dashboard → Project Settings → Environment Variables

```env
# Production
VITE_API_URL=https://nian-storage-api.vercel.app

# Preview/Staging
VITE_API_URL=https://nian-storage-staging-api.vercel.app

# Development
VITE_API_URL=http://localhost:5000
```

### 3. Build Settings

```yaml
Framework: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run dev
```

### 4. Frontend Project Structure
```
frontend/
├── vite.config.js  (should specify build output)
├── package.json
├── index.html
└── src/
```

## 🔧 Backend Configuration (Vercel)

### 1. Connect Backend Repo
```bash
# Via CLI
cd backend
vercel --env-file .env
```

### 2. Environment Variables (Backend)

In Vercel Dashboard → Backend Project Settings → Environment Variables

```env
# Core
NODE_ENV=production
PORT=3000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=ey... (public key)
SUPABASE_SERVICE_ROLE_KEY=ey... (secret key)

# Storage (R2)
R2_ACCESS_KEY_ID=****
R2_ACCESS_KEY_SECRET=****
R2_BUCKET_NAME=nian-storage
R2_ACCOUNT_ID=****
R2_PUBLIC_URL=https://r2.yourdomain.com

# CORS
CORS_ORIGIN=https://nian-storage.vercel.app
```

### 3. Build Settings

```yaml
Framework: Other
Build Command: npm install
Output Directory: ./
Start Command: node server.js
Install Command: npm install
```

### 4. Backend Project Structure
```
backend/
├── server.js
├── package.json
├── vercel.json  (Optional, for custom routing)
├── routes/
├── config/
└── services/
```

## 📝 vercel.json (Optional)

### Frontend `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "@vite_api_url"
  }
}
```

### Backend `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

## 🔐 Getting Secrets

### Supabase Keys
1. Go to [Supabase Console](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - Anon Public Key → `SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### Cloudflare R2 Credentials
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. R2 → Settings
3. Copy:
   - Account ID
   - Create API token
   - Bucket name

### Vercel Token (for GitHub Actions)
1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create new token
3. Copy and paste into GitHub Secrets

## 📋 Deployment Checklist

### Before First Deploy
- [ ] Frontend project connected to Vercel
- [ ] Backend project connected to Vercel
- [ ] All environment variables set in Vercel Dashboard
- [ ] GitHub Secrets added (VERCEL_TOKEN, API URLs)
- [ ] Test deployment locally: `vercel dev`
- [ ] Check build logs for errors

### After First Deploy
- [ ] Frontend loads at https://nian-storage.vercel.app
- [ ] Backend API responds at https://nian-storage-api.vercel.app/api/health
- [ ] Frontend can reach backend (check network tab)
- [ ] Database queries work
- [ ] File uploads work
- [ ] Authentication works

## 🧪 Testing Deployment Locally

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Test frontend locally
cd frontend
vercel dev  # Runs on http://localhost:3000

# Test backend locally
cd ../backend
vercel dev  # Runs on http://localhost:3000

# Link local project to Vercel project (one-time)
vercel link
```

## 🚀 Go Live Workflow

1. **Local testing**
   ```bash
   npm run dev  # Test locally
   git add .
   git commit -m "feat: new feature"
   ```

2. **Push to GitHub**
   ```bash
   git push origin main
   ```

3. **CI/CD runs automatically**
   - Tests run in GitHub Actions
   - Build succeeds
   - Deploy to Vercel

4. **Verify live**
   - Check frontend: https://nian-storage.vercel.app
   - Check backend: https://nian-storage-api.vercel.app/api/health

## 🔗 Custom Domain (Optional)

### Add Your Domain
1. Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Update DNS records at your registrar
4. Wait for DNS propagation (~30 min)

### Example
```
Frontend: storage.yourdomain.com → Vercel
Backend:  api.storage.yourdomain.com → Vercel
```

## 📊 Monitoring

### Vercel Analytics
- Go to Vercel Dashboard → Project → Analytics
- Monitor:
  - Request count
  - Response times
  - Error rates
  - Bandwidth usage

### Logs
- Vercel Dashboard → Deployments → [Latest] → Runtime Logs
- See real-time logs from your deployed app

## 🆘 Troubleshooting

### Deploy fails: "Build timed out"
- Solution: Optimize build process, check for infinite loops

### 502 Bad Gateway
- Solution: Backend not running, check GitHub Actions logs

### CORS errors
- Solution: Update `CORS_ORIGIN` in backend `.env`

### File uploads fail
- Solution: Check R2 credentials, verify bucket exists

---

**Ready to deploy?** Push to GitHub and watch GitHub Actions work!
