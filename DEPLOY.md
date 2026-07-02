# Deployment Setup

## One-time setup (do this once, then all deploys are automatic)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: PCOS Phase 0 MVP — Challenge Engine, XP system, Portfolio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/primeluck-creative-os.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** → select `primeluck-creative-os`
3. Set **Framework Preset** to Vite (auto-detected)
4. Set **Team** to primeluck
5. Click **Deploy** — first deploy runs, live URL appears

After the first deploy, go to your Vercel project settings and note down:
- **Project ID** (Settings → General → Project ID)

### Step 3 — Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com/account/tokens → Create |
| `VERCEL_ORG_ID` | `team_fgmRtfqomj6xZnjScLH6d4rW` |
| `VERCEL_PROJECT_ID` | Vercel project settings → General |
| `LINEAR_API_KEY` | linear.app/settings/api → Personal API keys |
| `LINEAR_DEPLOY_ISSUE_ID` | The UUID of PRI-22 in Linear |
| `LINEAR_DONE_STATE_ID` | `2ff1699f-c379-4c63-bb37-fd95fccb542e` |
| `NOTION_TOKEN` | notion.so/profile/integrations → New integration |
| `NOTION_BUILD_LOG_PAGE_ID` | `38f6aa313f8081f9863bd647139c6ebb` |

### From this point on

- Push to `main` → auto-deploys to production, updates Linear + Notion
- Open a pull request → preview URL generated and posted as a PR comment
- Rollback: Vercel dashboard → Deployments → any previous deploy → Promote to Production
