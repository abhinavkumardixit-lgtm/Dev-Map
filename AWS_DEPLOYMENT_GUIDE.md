# MAD DEV — AWS Deployment Guide 🚀

This document provides step-by-step instructions to deploy **MAD DEV** to **Amazon Web Services (AWS)** using static hosting (S3 + CloudFront), AWS Amplify, or Container deployment (AWS ECS / App Runner).

---

## Option 1: AWS Amplify Hosting (Fastest & Easiest — 2 Minutes)

AWS Amplify provides instant global CI/CD deployment with free SSL certificates and CDN caching.

### Steps:
1. Push this repository to GitHub / AWS CodeCommit / GitLab.
2. Open the **[AWS Amplify Console](https://console.aws.amazon.com/amplify)**.
3. Click **Host Web App** -> Select your repository (e.g. GitHub).
4. For build settings, since MAD DEV is a static web application:
   - **Build Command**: `echo "Static web application ready"`
   - **Base Directory**: `/`
5. Click **Save and Deploy**. Your live URL will be generated instantly (e.g. `https://main.d123456.amplifyapp.com`).

---

## Option 2: AWS S3 + CloudFront CDN (High Performance & Ultra Low Cost)

Deploy MAD DEV directly to an S3 static web hosting bucket fronted by AWS CloudFront for sub-millisecond global latency.

### Command Line AWS CLI Deployment:
```bash
# 1. Create S3 Bucket
aws s3 mb s3://mad-dev-app-workspace --region us-east-1

# 2. Enable Static Web Hosting
aws s3 website s3://mad-dev-app-workspace/ --index-document index.html

# 3. Sync Application Files
aws s3 sync . s3://mad-dev-app-workspace/ \
  --exclude ".git/*" \
  --exclude "scratch/*" \
  --exclude "tests/*" \
  --acl public-read

# 4. Access your live AWS website URL:
# http://mad-dev-app-workspace.s3-website-us-east-1.amazonaws.com
```

---

## Option 3: AWS App Runner / Elastic Container Service (Docker)

MAD DEV includes a production-ready `Dockerfile`.

### Build & Deploy to AWS ECR / App Runner:
```bash
# 1. Build Docker image locally
docker build -t mad-dev-app .

# 2. Authenticate Docker with AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag and push to ECR
docker tag mad-dev-app:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/mad-dev-app:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/mad-dev-app:latest

# 4. Deploy service on AWS App Runner or ECS Fargate referencing the ECR image URL.
```

---

## 🔒 Environment & Private AI Gateway Setup on AWS
All user account data, GitHub settings, LeetCode handles, and Private AI API keys (OpenAI / Anthropic / Gemini / Custom Endpoint) are securely encrypted and saved in the user's browser `localStorage` per profile.

You can also connect a Supabase backend by initializing `window.supabase` in `js/core/authService.js`.
