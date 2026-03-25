# GitHub Actions Setup Guide

## 🚀 Overview

This repository uses GitHub Actions for:
- **CI (Continuous Integration)**: Testing and building on every push/PR
- **CD (Continuous Deployment)**: Auto-deploying to Vercel on main branch
- **PR Checks**: Code quality and security scans on pull requests

## 📋 Required GitHub Secrets

### 1. Vercel Deployment Secrets

You need to create the following secrets in your GitHub repository:

#### `VERCEL_TOKEN`
- Purpose: Authenticate with Vercel for deployments
- How to get it:
  1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
  2. Create a new token (copy it immediately)
  3. In GitHub repo → Settings → Secrets and variables → Actions
  4. Add new secret: `VERCEL_TOKEN` = *your token*

#### `VITE_API_URL_PROD`
- Example: `https://nian-storage-api.vercel.app`
- This is your production backend API URL

#### `VITE_API_URL_STAGING`
- Example: `https://nian-storage-staging-api.vercel.app`
- This is your staging backend API URL

### 2. Supabase Secrets (if needed in CI/CD)

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Add these only if your tests need to connect to Supabase.

## 🔧 How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the list above

## 📊 Workflow Files

### `ci.yml` - Continuous Integration
**Triggered on:** Push to `main` or `develop`, and all PRs
**Jobs:**
- Backend tests & linting
- Frontend tests & build
- Security scanning (Trivy)
- Status summary

### `deploy.yml` - Continuous Deployment
**Triggered on:** Push to `main` branch or manual trigger
**Jobs:**
- Deploy frontend to Vercel (production)
- Deploy backend to Vercel (production)

### `pr-checks.yml` - Pull Request Validation
**Triggered on:** Pull requests to `main` or `develop`
**Jobs:**
- Code quality checks
- Bundle size analysis
- Secret scanning
- Dependency audit

## 🎯 Current Issues to Fix

Your project needs these scripts in `package.json` files:

### Backend (`backend/package.json`)
Add these scripts if missing:
```json
{
  "scripts": {
    "dev": "node --watch server.js",
    "test": "echo 'Tests pending...' && exit 0",
    "lint": "echo 'Linter pending...' && exit 0"
  }
}
```

### Frontend (`frontend/package.json`)
Add these scripts if missing:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "echo 'Tests pending...' && exit 0",
    "lint": "echo 'Linter pending...' && exit 0"
  }
}
```

## 📝 Environment Variables

### Frontend (`.env.production`)
```
VITE_API_URL=https://your-backend-api.vercel.app
```

### Backend (`.env.production`)
```
PORT=3000
NODE_ENV=production
DATABASE_URL=your_supabase_connection_string
CORS_ORIGIN=https://your-frontend.vercel.app
```

## ✅ Testing Locally with Act

To test workflows locally before pushing:

```bash
# Install act
brew install act  # macOS
# or see https://github.com/nektos/act for other platforms

# Run a specific workflow
act push -j ci-tests

# Run all workflows
act push
```

## 🔒 Security Best Practices

1. ✅ Use branch protection rules on `main`
2. ✅ Require PR reviews before merge
3. ✅ Enable required status checks (tests must pass)
4. ✅ Rotate `VERCEL_TOKEN` regularly
5. ✅ Never commit `.env` files
6. ✅ Use GitHub Secrets for all sensitive data

## 📈 Monitoring

- **GitHub Actions tab**: See all workflow runs and logs
- **Vercel Dashboard**: Monitor deployments and performance
- **GitHub Issues**: Create issues from failed actions
- **Slack Integration**: (Optional) Get notifications for deployments

## 🆘 Troubleshooting

### Deployment fails with "Vercel token invalid"
- Go to Vercel, create new token
- Update `VERCEL_TOKEN` secret in GitHub

### Tests can't find environment variables
- Add environment variables to GitHub Secrets
- Reference them in workflows using `${{ secrets.VARIABLE_NAME }}`

### Build fails on Node version mismatch
- Update `node-version` in workflows to match your local version
- Current: `18` (check with `node -v`)

## 🎬 Getting Started

1. **Create GitHub Secrets** (see section above)
2. **Push workflows to `.github/workflows/`**
3. **Add test scripts to package.json** files
4. **Push to main branch** - deployment will start
5. **Monitor in GitHub Actions tab**

---

For more info, see [GitHub Actions Documentation](https://docs.github.com/en/actions)
