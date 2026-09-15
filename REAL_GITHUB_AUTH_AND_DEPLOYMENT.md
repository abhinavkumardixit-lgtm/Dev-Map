# Step-by-Step Guide: Make MAD DEV & Real GitHub OAuth Live 🚀

This guide explains how to enable **Official Production GitHub OAuth** and deploy **MAD DEV** live on the web so anyone can sign in with their real GitHub account.

---

## 🔑 Part 1: Set Up Real GitHub OAuth (1-Click Authentication)

Right now, MAD DEV operates in **Smart Sandbox Mode** (fetches GitHub profile, avatar, repos & stats via public API). To upgrade to **Official GitHub OAuth**:

### Step 1: Create a GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **OAuth Apps** -> **New OAuth App**.
3. Fill in the details:
   - **Application Name:** `MAD DEV`
   - **Homepage URL:** `https://your-domain.amplifyapp.com` (or your deployment URL)
   - **Authorization Callback URL:** `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`
4. Click **Register Application**.
5. Copy your **Client ID** and click **Generate a new client secret**.

### Step 2: Enable GitHub Provider in Supabase (Free Backend)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Navigate to **Authentication** -> **Providers** -> **GitHub**.
3. Toggle **Enable GitHub provider**.
4. Paste your **Client ID** and **Client Secret** from GitHub.
5. Click **Save**.

### Step 3: Add Supabase Credentials to MAD DEV
Add your Supabase URL & Anon Key in `pages/login.html` and `index.html` right before `authService.js`:

```html
<!-- Supabase Auth Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  window.supabase = supabase.createClient(
    'https://YOUR_PROJECT_ID.supabase.co',
    'YOUR_SUPABASE_ANON_KEY'
  );
</script>
<script src="../js/core/authService.js"></script>
```

> **Note:** `AuthService.js` in MAD DEV is already pre-configured to detect `window.supabase` and automatically initiate real OAuth redirect flow (`window.supabase.auth.signInWithOAuth({ provider: 'github' })`).

---

## ☁️ Part 2: Deploy MAD DEV Live to AWS (3 Easy Methods)

### Method 1: AWS Amplify (Recommended — 2 Minutes)
1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for MAD DEV"
   git remote add origin https://github.com/YOUR_USERNAME/mad-dev.git
   git push -u origin main
   ```
2. Open the **[AWS Amplify Console](https://console.aws.amazon.com/amplify)**.
3. Click **Create new app** -> **Host web app**.
4. Connect your GitHub repository and select `main` branch.
5. Keep default settings and click **Save and Deploy**.
6. AWS will give you a live HTTPS link like: `https://main.d123456.amplifyapp.com`.

---

### Method 2: AWS S3 + CloudFront CDN (Low Cost CLI)
```bash
# 1. Create S3 bucket
aws s3 mb s3://mad-dev-app-workspace --region us-east-1

# 2. Configure static website hosting
aws s3 website s3://mad-dev-app-workspace/ --index-document index.html

# 3. Upload project files
aws s3 sync . s3://mad-dev-app-workspace/ --exclude ".git/*" --acl public-read
```

---

### Method 3: Vercel / Netlify / Render (Instant 1-Click Deployment)
1. Push repository to GitHub.
2. Go to [Vercel.com](https://vercel.com) or [Netlify.com](https://netlify.com).
3. Import your GitHub repository.
4. Click **Deploy** — your app is live on a custom `.vercel.app` URL in 30 seconds!

---

## 🎯 Summary Checklist
- [x] Local GitHub Profile & Repo Sync Working Out-of-the-Box
- [x] Multi-user Local Profile Isolation & Account Switcher
- [ ] Register GitHub OAuth App ([github.com/settings/developers](https://github.com/settings/developers))
- [ ] Connect Supabase Free Project for OAuth Tokens
- [ ] Deploy to AWS Amplify or Vercel
