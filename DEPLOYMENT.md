# 🚀 AI Interview Preparation Platform — Production Deployment Guide

This repository is fully configured and ready for production deployment. Follow this step-by-step guide to deploy both the **Backend (Node.js/Express API)** and **Frontend (Next.js App Router)** to cloud infrastructure.

---

## 🏗️ Architecture Overview

- **Frontend:** Next.js 16 (React 19 App Router) with Tailwind CSS & Shadcn UI
  - *Recommended Hosting:* [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Backend:** Node.js / Express 5 with Mongoose & Groq AI SDK
  - *Recommended Hosting:* [Render](https://render.com), [Railway](https://railway.app), or [AWS EC2/App Runner](https://aws.amazon.com)
- **Database:** MongoDB Atlas (Cloud Database Cluster)
- **AI Engine:** Groq Cloud (`qwen/qwen3.8-27b`)
- **Email Service:** Nodemailer over SMTP (Gmail, SendGrid, Amazon SES)

---

## 📋 Pre-Deployment Checklist

1. [x] MongoDB Atlas cluster created and IP whitelist configured (`0.0.0.0/0` for cloud access).
2. [x] Groq API key generated from [Groq Cloud Console](https://console.groq.com/keys).
3. [x] SMTP application password generated (e.g. Google App Password for 2FA-enabled Gmail).
4. [x] GitHub repository with latest changes pushed to `main`.

---

## STEP 1: Deploy Backend (e.g., Render / Railway)

### Option A: Deploy on Render.com (Recommended)

1. **Create Web Service:**
   - Log in to [Render Dashboard](https://dashboard.render.com).
   - Click **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repository.
2. **Configure Service Settings:**
   - **Name:** `ai-interview-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (Runs `node src/index.js`)
   - **Health Check Path:** `/api/health`
3. **Configure Environment Variables:**
   Add the following environment variables in the **Environment** tab:

   | Variable Name | Example / Production Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production environment flag |
   | `PORT` | `5000` | Render dynamically binds port, or uses 5000 |
   | `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/ai-interview-db` | MongoDB Atlas connection string |
   | `JWT_SECRET` | *(64-char random string)* | Strong secret key for signing JWT tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration period |
   | `GROQ_API_KEY` | `gsk_...` | Groq Cloud API Key |
   | `GROQ_MODEL` | `qwen/qwen3.8-27b` | Active Groq Chat Completion Model |
   | `BOOTSTRAP_ADMIN_NAME` | `Platform Administrator` | Seed platform administrator name |
   | `BOOTSTRAP_ADMIN_EMAIL` | `admin@yourdomain.com` | Seed platform administrator email |
   | `BOOTSTRAP_ADMIN_PASSWORD` | *(StrongPassword!123)* | Seed platform administrator password |
   | `SMTP_HOST` | `smtp.gmail.com` | SMTP host server |
   | `SMTP_PORT` | `587` | SMTP TLS port |
   | `SMTP_USER` | `notifications@yourdomain.com`| SMTP username |
   | `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | SMTP app password |
   | `MAIL_FROM` | `"AI Interview Platform" <no-reply@yourdomain.com>` | Sender header address |
   | `CLIENT_URL` | `https://ai-interview-platform.vercel.app` | URL of your deployed frontend (update after Step 2) |
   | `FRONTEND_URL` | `https://ai-interview-platform.vercel.app` | Secondary CORS origin alias |

4. **Verify Backend Deployment:**
   Once deployed, visit your Render URL:
   ```bash
   curl https://ai-interview-backend.onrender.com/api/health
   ```
   **Expected Response (HTTP 200):**
   ```json
   {
     "status": "ok",
     "service": "AI-Interview-Platform-Backend",
     "timestamp": "2026-10-12T18:27:42.489Z",
     "aiMode": "LIVE",
     "aiModel": "qwen/qwen3.8-27b",
     "database": "connected"
   }
   ```

---

## STEP 2: Deploy Frontend (e.g., Vercel)

### Deploy on Vercel.com (Recommended)

1. **Import Project:**
   - Log in to [Vercel](https://vercel.com).
   - Click **Add New...** $\rightarrow$ **Project**.
   - Select your GitHub repository.
2. **Configure Project Settings:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Edit and select `client`
   - **Build Command:** `next build` (Default)
   - **Output Directory:** `.next` (Default)
   - **Install Command:** `npm install` (Default)
3. **Configure Environment Variables:**
   Under **Environment Variables**, add:

   | Variable Name | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://ai-interview-backend.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | `https://ai-interview-backend.onrender.com` |

4. **Deploy:**
   Click **Deploy**. Vercel will run Turbopack production build (`next build`), compiling all 23 static and dynamic routes.

---

## STEP 3: Connect Frontend and Backend CORS

1. Copy your live Vercel frontend URL (e.g. `https://ai-interview-platform.vercel.app`).
2. Go back to your Backend hosting dashboard (Render / Railway).
3. Set `CLIENT_URL` and `FRONTEND_URL` to your live Vercel URL.
4. Trigger a quick redeploy or restart the backend web service so CORS allows requests from your live domain.

---

## STEP 4: Live Production Smoke Test

Once both frontend and backend are live:

1. **Health Check:** Open `https://your-backend.onrender.com/api/health` in your browser. Confirm `aiMode: "LIVE"` and `database: "connected"`.
2. **User Registration:** Visit `https://your-frontend.vercel.app/register` and create a student account. Confirm verification email dispatches via SMTP.
3. **Adaptive Mock Interview:** Start an interview session in React / Python / General. Submit an answer and verify Live Groq AI responds with dynamic questions and scores.
4. **Placement Readiness:** Visit `/dashboard/readiness`. Confirm candidate score components, roadmaps, and classifications display properly.
5. **Peer Challenge Arena:** Open `/challenges` and complete a daily sprint. Verify score and leaderboard updates.
6. **Administrator Portal:** Sign in with your configured `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` at `/login`. Access `/admin` to view user metrics and audit logs.

---

## 🛠️ Maintenance & Production Troubleshooting

- **429 Rate Limit Errors:** If Groq Cloud on-demand limits are reached during high traffic, the engine automatically uses graceful offline fallbacks and resumes live mode once quota resets.
- **CORS Issues:** Verify `CLIENT_URL` matches your exact production frontend URL including `https://` without a trailing slash.
- **Database Connection Failures:** Ensure MongoDB Atlas Network Access has `0.0.0.0/0` whitelisted or your cloud provider's static egress IP.
