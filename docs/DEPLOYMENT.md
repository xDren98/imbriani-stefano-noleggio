# Deployment Guide

## Google Apps Script Deployment

### Step 1: Upload Backend
1. Open [Google Apps Script](https://script.google.com)
2. Create new project: "Imbriani Backend v8.9"
3. Upload files in this order:
   - Config.gs
   - DateUtils.gs
   - Helpers.gs
   - Auth.gs
   - All Services (*.gs)
   - Endpoints (Get/Post)
   - Main.gs

### Step 2: Deploy
1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Deploy
6. Copy Web App URL

### Step 3: Configure Frontend
Update `frontend/scripts/config.js`:
```javascript
const CONFIG = {
  API_URL: 'YOUR_WEB_APP_URL',
  TOKEN: 'imbriani_secret_2025'
};
```

## Frontend Deployment

### Option 1: GitHub Pages
1. Enable GitHub Pages in repo settings
2. Select `main` branch, `/frontend` folder
3. Access at: `https://username.github.io/repo-name/`

### Option 2: Netlify
1. Connect GitHub repo
2. Build command: (none)
3. Publish directory: `frontend`
4. Deploy

See docs/SETUP.md for detailed configuration.
