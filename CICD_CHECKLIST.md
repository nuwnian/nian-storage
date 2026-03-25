# ✅ GitHub Actions CI/CD Setup Checklist

## 🎯 Quick Start (5 minutes)

### Step 1: Create GitHub Secrets
- [ ] Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
- [ ] Add `VERCEL_TOKEN` (get from [Vercel Account Settings](https://vercel.com/account/tokens))
- [ ] Add `VITE_API_URL_PROD` (your production API URL)
- [ ] Add `VITE_API_URL_STAGING` (your staging API URL)

### Step 2: Push Workflows
The following files are already created:
- [ ] `.github/workflows/ci.yml` → Tests & builds on every commit
- [ ] `.github/workflows/deploy.yml` → Auto-deploys to Vercel
- [ ] `.github/workflows/pr-checks.yml` → PR validation

### Step 3: Push to GitHub
```bash
git add .github/workflows/
git add .github/
git add backend/package.json
git add frontend/package.json
git add CICD_SETUP.md
git commit -m "chore: add GitHub Actions CI/CD pipeline"
git push origin main
```

### Step 4: Monitor
- Check **Actions** tab in your GitHub repo
- First run will validate the setup

## 📊 What Each Workflow Does

| Workflow | When | What | Branch |
|----------|------|------|--------|
| **ci.yml** | Every push & PR | Tests, builds, security scan | all |
| **deploy.yml** | Push to main | Deploy frontend & backend | main |
| **pr-checks.yml** | Pull request | Code quality, secrets scan | PRs |

## 🚀 Current Status

✅ **Completed:**
- GitHub Actions workflow files created
- Test & lint scripts added to package.json
- Security scanning configured
- Vercel deployment template ready

⚠️ **Next Steps (You):**
1. Create Vercel token and add to GitHub Secrets
2. Add test suites (Jest, Vitest, etc.) later
3. Add ESLint/Prettier configuration
4. Push to GitHub

## 🔗 Useful Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 💡 Tips

**To test workflows locally before pushing:**
```bash
npm install -g act
act push  # Simulate a push event
```

**To see detailed logs:**
Go to repo → **Actions** → Click workflow run → Click job

**To manually trigger a deployment:**
Go to repo → **Actions** → **CD - Deploy to Vercel** → **Run workflow**

---

**Questions?** Check [CICD_SETUP.md](./CICD_SETUP.md) for detailed documentation.
