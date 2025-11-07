# Setup Guide

## Backend Setup

1. Go to [Google Apps Script](https://script.google.com)
2. Create new project
3. Upload all files from `backend/` folder
4. Deploy as Web App
5. Copy deployment URL

## Frontend Setup

1. Update `frontend/scripts/config.js` with your API URL
2. Deploy frontend files to hosting (GitHub Pages, Netlify, etc.)

## Configuration

Edit `backend/Config.gs`:
- SPREADSHEET_ID
- TOKEN
- TELEGRAM credentials
- EMAIL settings

See backend/README.md for details.
