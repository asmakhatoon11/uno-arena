# UNO ARENA — Production Deployment Guide

This guide covers deploying the **UNO ARENA** backend (Node.js + Express + Socket.IO) to production hosting platforms such as **Render**, **Railway**, or **Fly.io**, alongside the frontend (Vercel).

---

## 🚀 Quick Reference

| Property | Value |
|---|---|
| **Production Start Command** | `node backend/server.js` (or `npm start`) |
| **Root Build / Install Command** | `npm install --prefix backend` |
| **Primary Health Check Endpoint** | `/api/health` |
| **Root Ping Endpoint** | `/` |
| **Primary Environment Variable** | `FRONTEND_URL` |
| **Default Port** | `process.env.PORT` (defaults to `5000` if unset) |
| **Server Host Binding** | `0.0.0.0` (accessible in Docker / container environments) |

---

## ⚙️ Environment Variables (Backend)

Configure these environment variables in your hosting provider's dashboard (e.g. Render Dashboard ➔ Environment, or Railway ➔ Variables):

| Variable | Required? | Example / Default | Description |
|---|---|---|---|
| `PORT` | Auto-provided | `5000` (or host-assigned) | The port the backend listens on. Automatically provided by Render, Railway, and Heroku. |
| `FRONTEND_URL` | **Yes** (in production) | `https://uno-arena.vercel.app` | Comma-separated list of allowed frontend origins for CORS and Socket.IO handshake. |
| `NODE_ENV` | Recommended | `production` | Enables production optimizations and disables arbitrary localhost CORS origins. |
| `CORS_ORIGIN` | Optional | `https://uno-arena.vercel.app` | Secondary alias for `FRONTEND_URL`. |

> **Note on Vercel Previews**: The backend automatically allows any `https://*.vercel.app` subdomain dynamically, so Vercel preview branches work out-of-the-box without manual CORS configuration.

---

## 🛠️ Step-by-Step Deployment Instructions

### Option A: Deploying on Render (Recommended)

1. **Create Web Service**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and click **New ➔ Web Service**.
   - Connect your GitHub repository containing UNO ARENA.
2. **Configure Service Settings**:
   - **Name**: `uno-arena-backend`
   - **Region**: Choose the region closest to your users.
   - **Branch**: `main` (or your active release branch).
   - **Root Directory**: Leave empty (repository root).
   - **Environment**: `Node`
   - **Build Command**: `npm install --prefix backend`
   - **Start Command**: `node backend/server.js`
3. **Set Environment Variables**:
   - Under the **Environment** tab, add:
     - `NODE_ENV` = `production`
     - `FRONTEND_URL` = `https://your-frontend.vercel.app` (your deployed Vercel domain)
4. **Health Check Path**:
   - Under **Advanced ➔ Health Check Path**, set `/api/health`.
5. **Deploy**:
   - Click **Create Web Service**.
   - Render will build and deploy the backend. Note down the service URL (e.g., `https://uno-arena-backend.onrender.com`).

---

### Option B: Deploying on Railway

1. **New Project**:
   - Go to [railway.app](https://railway.app/) and select **New Project ➔ Deploy from GitHub repo**.
   - Select your UNO repository.
2. **Service Settings**:
   - Go to **Settings ➔ Build & Deploy**.
   - **Build Command**: `npm install --prefix backend`
   - **Start Command**: `node backend/server.js`
3. **Environment Variables**:
   - Go to the **Variables** tab and add:
     - `NODE_ENV` = `production`
     - `FRONTEND_URL` = `https://your-frontend.vercel.app`
4. **Health Check**:
   - Set Healthcheck Path to `/api/health`.
5. **Generate Domain**:
   - Under **Settings ➔ Networking**, click **Generate Domain** to get your public backend URL.

---

## 🔗 Connecting Frontend (Vercel) to Backend

Once your backend is live (e.g. `https://uno-arena-backend.onrender.com`):

1. In your **Vercel Project Settings**:
   - Go to **Settings ➔ Environment Variables**.
   - Add or update:
     - `VITE_BACKEND_URL` = `https://uno-arena-backend.onrender.com`
2. Redeploy the Vercel frontend so the new `VITE_BACKEND_URL` is baked into the production bundle.
3. In your **Backend Hosting Provider** (Render / Railway):
   - Ensure `FRONTEND_URL` matches your exact Vercel production domain:
     - `FRONTEND_URL` = `https://your-frontend.vercel.app`

---

## 🔍 Verification & Health Checks

Once deployed, verify that the backend is operating normally:

1. **HTTP Health Check**:
   ```bash
   curl -I https://<your-backend-host>/api/health
   # Returns: HTTP/1.1 200 OK
   # Body: {"status":"ok","project":"UNO Arena"}
   ```

2. **Root Ping Check**:
   ```bash
   curl https://<your-backend-host>/
   # Returns: "UNO Arena Backend API is running."
   ```

3. **Socket.IO Handshake Check**:
   ```bash
   curl "https://<your-backend-host>/socket.io/?EIO=4&transport=polling"
   # Returns: 0{"sid":"...","upgrades":["websocket"],"pingInterval":10000,"pingTimeout":5000}
   ```
