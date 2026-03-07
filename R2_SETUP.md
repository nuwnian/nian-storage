# Cloudflare R2 Setup - Quick Guide

## 🚀 Quick Start (5 minutes)

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **R2 Object Storage** in sidebar
3. Click **Create bucket**
4. Name: `nian-storage`
5. Location: **Automatic** (or closest to you)
6. Click **Create bucket**

### 2. Get API Credentials

1. Still in R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Fill in:
   - **Token name**: `Nian Storage`
   - **Permissions**: ✅ Object Read & Write
   - **TTL**: Leave blank (no expiration)
   - **Specific buckets**: Select `nian-storage`
4. Click **Create API Token**
5. **⚠️ SAVE THESE VALUES** (you won't see them again):
   ```
   Access Key ID: xxxxxxxxxxxxxxxxxxxxxx
   Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   Endpoint: https://1234567890abcdef.r2.cloudflarestorage.com
   ```

### 3. Setup Public Access

#### Option A: R2.dev Subdomain (Easy)

1. In your bucket → **Settings** tab
2. Under **Public Access**, click **Allow Access**
3. Click **Enable R2.dev subdomain**
4. Copy the URL: `https://pub-xxxxxxxxxxxxx.r2.dev`

#### Option B: Custom Domain (Recommended for production)

1. In your bucket → **Settings** → **Custom Domains**
2. Click **Connect Domain**
3. Enter domain: `storage.yourdomain.com`
4. Add CNAME record to your DNS (Cloudflare will show you the values)
5. Wait for DNS propagation (~5 minutes)

### 4. Update Backend `.env`

Open `backend/.env` and fill in:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://1234567890abcdef.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=nian-storage
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

### 5. Test It

Restart your backend server:
```bash
cd backend
node server.js
```

Try uploading a file from your app!

---

## 📊 Free Tier Limits

Cloudflare R2 is **extremely generous**:

- ✅ **10 GB storage** - Free forever
- ✅ **1 million writes/month** - Free
- ✅ **10 million reads/month** - Free  
- ✅ **Unlimited egress** - YES, FREE! (unlike S3)

Perfect for this project! 🎉

---

## 🔍 Troubleshooting

**Error: "Access Denied"**
- Check R2_ENDPOINT is correct (include `https://`)
- Verify API token has "Object Read & Write" permissions
- Ensure token is applied to your specific bucket

**Error: "Bucket not found"**
- Check R2_BUCKET_NAME matches exactly (case-sensitive)
- Ensure bucket exists in the same Cloudflare account

**Files uploaded but can't access**
- Make sure Public Access is enabled on the bucket
- Check R2_PUBLIC_URL is correct (with `https://`)
- Wait a minute for changes to propagate

---

## 💡 Pro Tips

1. **Test locally first** - Upload/delete files before deploying
2. **Use custom domain in production** - More professional
3. **Enable CORS** if accessing files from browser directly:
   - Bucket Settings → CORS Policy → Add your domain
4. **Set cache headers** for better performance (optional):
   - Can be configured in upload code

---

Need more help? Check [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide!
