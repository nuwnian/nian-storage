# GitHub Actions Workflow Architecture

## 📈 CI/CD Pipeline Flow

```
┌─ Developer Commits Code
│
├─→ GitHub: Push to Branch
│   
├─→ IF PR (Pull Request)
│   ├─ ✅ pr-checks.yml runs
│   │   ├─ Code quality check
│   │   ├─ Bundle size analysis
│   │   ├─ Secret detection
│   │   └─ Dependency audit
│   │
│   └─ Status: Required for merge
│
├─→ IF Any Branch (main/develop)
│   ├─ ✅ ci.yml runs
│   │   ├─ Backend: Install, lint, test
│   │   ├─ Frontend: Install, lint, test, build
│   │   ├─ Security: Trivy scan
│   │   └─ Summary: Report status
│   │
│   └─ Status: Blocks if failing
│
├─→ IF Merge to main
│   ├─ ✅ deploy.yml runs
│   │   ├─ Install dependencies
│   │   ├─ Deploy frontend → Vercel
│   │   ├─ Deploy backend → Vercel
│   │   └─ Create GitHub comment
│   │
│   └─ 🚀 Live on production!
│
└─ Done! ✨
```

## 🔄 Deployment Environments

### Production (Main Branch)
```
main → Push
  ↓
ci.yml (tests pass)
  ↓
deploy.yml (auto-deploy)
  ↓
Vercel Production
  ↓
Live on nian-storage.vercel.app
```

### Staging (Develop Branch)
```
develop → Push
  ↓
ci.yml (tests pass)
  ↓
Manual trigger on PR merge
  ↓
Vercel Staging
  ↓
Test on staging-nian-storage.vercel.app
```

## 📋 Event Triggers

### Continuous Integration (`ci.yml`)
```yaml
Triggered on:
  • Push to main branch
  • Push to develop branch
  • Any pull request
  
Runs:
  1. Backend tests & lint
  2. Frontend tests & lint & build
  3. Security scanning
  4. Status summary
```

### Continuous Deployment (`deploy.yml`)
```yaml
Triggered on:
  • Successful push to main
  • Manual workflow_dispatch button
  
Deploys:
  1. Frontend to vercel.app
  2. Backend to vercel.app
  3. Posts success comment on PR
```

### PR Checks (`pr-checks.yml`)
```yaml
Triggered on:
  • Pull request opened/updated
  
Validates:
  1. Code quality metrics
  2. Bundle size
  3. Secret scanning
  4. Dependency vulnerabilities
  5. Creates PR checklist comment
```

## 🎯 Job Dependencies

```
ci.yml:
├─ backend-tests     (in parallel)
├─ frontend-tests    (in parallel)
├─ security-scan     (in parallel)
└─ notify-status     (waits for all above)

deploy.yml:
├─ deploy-production
└─ deploy-staging (if develop branch)

pr-checks.yml:
├─ code-quality
├─ validate-files
└─ dependency-check
```

## 🔐 Secrets Used

```
GitHub Actions Secrets:
├─ VERCEL_TOKEN           (required for deployment)
├─ VITE_API_URL_PROD      (frontend env var)
├─ VITE_API_URL_STAGING   (frontend env var)
├─ SUPABASE_URL           (optional for tests)
├─ SUPABASE_ANON_KEY      (optional for tests)
└─ SUPABASE_SERVICE_ROLE  (optional for tests)
```

## 📊 Status Badges

Add to your README.md to show CI/CD status:

```markdown
![CI Build](https://github.com/YOUR_USERNAME/nian-storage/actions/workflows/ci.yml/badge.svg)
![CD Deploy](https://github.com/YOUR_USERNAME/nian-storage/actions/workflows/deploy.yml/badge.svg)
```

## 🚀 Quick Actions

### Manual Deployment
If you need to deploy without pushing:
1. Go to GitHub repo → **Actions**
2. Select **"CD - Deploy to Vercel"**
3. Click **"Run workflow"**
4. Confirm

### Rerun Failed Job
If a job fails:
1. Go to **Actions** → Failed workflow
2. Click **"Re-run failed jobs"**

### Cancel Running Workflow
1. Go to **Actions** → Running workflow
2. Click **"Cancel workflow"**

## 📝 Logs & Debugging

### View Logs
```
GitHub repo → Actions → [Workflow Name] → [Run] → [Job]
```

### Common Issues

**❌ Deployment fails: "Token expired"**
- Solution: Generate new Vercel token, update VERCEL_TOKEN secret

**❌ Tests fail: "Module not found"**
- Solution: Check NODE_PATH, ensure dependencies cached correctly

**❌ Build fails: "env var not found"**
- Solution: Add missing variable to GitHub Secrets

## 🔗 References

- [GitHub Actions Marketplace](https://github.com/marketplace?category=ci)
- [Vercel CLI Commands](https://vercel.com/docs/cli)
- [Actions Best Practices](https://docs.github.com/en/actions/guides/security-guides-for-github-actions)

---

**Last Updated:** March 2026
**Status:** ✅ Ready for deployment
