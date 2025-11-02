# Setup Guide - Imbriani Noleggio v7.2.0

## Quick Start

### 1. Download Files
```powershell
# 💾 Backup + Download latest
$backupDir = "backup-current"
if (Test-Path $backupDir) { Remove-Item -Path $backupDir -Recurse -Force }
New-Item -ItemType Directory -Name $backupDir -Force | Out-Null
Get-ChildItem -File *.html,*.js,*.css,*.md -ErrorAction SilentlyContinue | Copy-Item -Destination $backupDir

$repo = "https://raw.githubusercontent.com/xDren98/imbriani-noleggio/working-stable/"
$files = @("index.html","scripts.js","shared-utils.js","styles.css","config.js","admin.html","admin-scripts.js","admin-styles.css","design-system.css","SETUP.md","BACKEND_FULL_CODE.md")
foreach ($f in $files) {
  try { Invoke-WebRequest -Uri ($repo + $f) -OutFile $f -UseBasicParsing -ErrorAction Stop; Write-Host "✅ $f" -ForegroundColor Green }
  catch { Write-Host "⚠️ $f not found" -ForegroundColor Yellow }
}
```

### 2. Backend Setup
1. Open BACKEND_FULL_CODE.md
2. Copy entire code block
3. Paste in Google Apps Script (replace everything)
4. Update SHEET_ID on line 2
5. Deploy as Web App

### 3. Test
- Open index.html (use file:// to avoid CORS)
- Login with CF → should autofill Driver 1 completely
- Open admin.html → should load real bookings

## Features

### ✅ Complete Auto-fill System
- Login loads from "Clienti" registry first
- Falls back to booking history if not found
- Driver 1 gets complete data (name, birth, address, license)
- Driver 2/3 remain manual

### ✅ Profile Management
- "Il mio profilo" tab populated automatically
- Local save for fallback data
- Non-destructive merge with registry

### ✅ Client Registry (Clienti Sheet)
- Master client database
- Updated automatically on each booking
- Census function to populate from existing bookings

### ✅ Admin Dashboard
- Real API calls with mock fallback
- Complete booking management
- Vehicle tracking
- Status updates

### ✅ Smart ID Generation
- BOOK-YYYY-NNN format (e.g., BOOK-2025-001)
- Year-based progressive numbering
- Consistent rendering throughout

## File Structure
```
📁 Frontend (Essential)
├── index.html          # Main client interface
├── scripts.js          # Complete autofill logic
├── shared-utils.js     # Common utilities
├── styles.css          # Client UI styling
└── config.js           # API configuration

📁 Admin Dashboard
├── admin.html          # Admin interface
├── admin-scripts.js    # Real API calls + fallback
├── admin-styles.css    # Admin UI styling
└── design-system.css   # Color tokens

📁 Documentation
├── SETUP.md            # This file
└── BACKEND_FULL_CODE.md # Complete backend code
```

## Troubleshooting

### CORS Issues
- Use file:// URLs for local testing
- For localhost, ensure Apps Script allows cross-origin

### Auto-fill Not Working
1. Check "Clienti" sheet exists with correct headers
2. Verify SHEET_ID in backend
3. Run client census to populate registry

### Admin Dashboard Empty
1. Check API_URL and token in config.js
2. Verify backend deployment URL
3. Check browser console for errors

## Support
All issues tracked in working-stable branch commits.
Version: v7.2.0 (2025-11-02)
