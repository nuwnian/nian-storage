# Deployment Guide - Nian Storage

## 📦 Cloudflare R2 Setup

### Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage** → **Create bucket**
3. Bucket name: `nian-storage` (or your preferred name)
4. Location: Choose closest to your users
5. Click **Create bucket**

### Step 2: Get R2 API Credentials

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `Nian Storage API`
4. Permissions: **Object Read & Write**
5. Choose **Apply to specific buckets only** → Select `nian-storage`
6. Click **Create API Token**
7. **Copy and save**:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (looks like: `https://1234567890abcdef.r2.cloudflarestorage.com`)

### Step 3: Setup Public Access (Optional)

For public file access:
1. Go to your bucket → **Settings**
2. Under **Public Access**, click **Allow Access**
3. Add custom domain (recommended): `storage.yourdomain.com`
4. Or use R2.dev subdomain: `https://pub-xxxxx.r2.dev`

---

## 🚀 Vercel Deployment

### Backend Deployment

1. **Push code to GitHub**:
   ```bash
   cd "d:\nian storage"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/nian-storage.git
   git push -u origin main
   ```

2. **Deploy Backend to Vercel**:
   ```bash
   cd backend
   npm install -g vercel
   vercel
   ```

3. **Configure Environment Variables** on Vercel:
   - Go to your project settings → **Environment Variables**
   - Add all variables from `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `R2_ENDPOINT`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_BUCKET_NAME`
     - `R2_PUBLIC_URL`
     - `CORS_ORIGIN` (your frontend URL)

4. **Redeploy** after adding environment variables

### Frontend Deployment

1. **Update API URL**:
   - Create `frontend/.env.production`:
     ```env
     VITE_API_URL=https://your-backend.vercel.app
     ```

2. **Deploy Frontend**:
   ```bash
   cd frontend
   vercel
   ```

3. **Update CORS** in backend `.env`:
   - Set `CORS_ORIGIN` to your frontend Vercel URL

---

## 🔒 Security Checklist

- [ ] All R2 credentials in environment variables (never in code)
- [ ] CORS configured to allow only your domain
- [ ] Supabase RLS policies enabled
- [ ] OAuth redirect URLs updated in Supabase
- [ ] File upload size limits configured
- [ ] R2 bucket has proper access controls

---

## 📝 Post-Deployment

### Update Supabase Redirect URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add production URLs:
   - `https://your-frontend.vercel.app`
   - `https://www.yourdomain.com` (if using custom domain)

### Update OAuth Providers

**Google Cloud Console**:
- Add redirect URI: `https://zozvtmmtqgrsdyautisy.supabase.co/auth/v1/callback`
- Add authorized origin: `https://your-frontend.vercel.app`

**GitHub OAuth App**:
- Update callback URL to your production URL

---

## 🧪 Testing Production

1. Test email/password registration
2. Test Google/GitHub OAuth login
3. Test file upload to R2
4. Test file download
5. Test file deletion
6. Verify storage quota calculations

---

## 💰 Cost Estimate (Cloudflare R2 Free Tier)

- **Storage**: 10 GB free
- **Class A Operations** (writes): 1 million/month free
- **Class B Operations** (reads): 10 million/month free
- **Data Transfer**: Unlimited egress (free)

Perfect for starting out! 🎉

---

## 📞 Support

If you encounter issues:
- Check Vercel deployment logs
- Check browser console for errors
- Verify all environment variables are set
- Test R2 credentials with sample upload
