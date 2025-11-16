# 🚐 Imbriani Stefano Noleggio

**Sistema di prenotazione pulmini 9 posti**

[![Backend Version](https://img.shields.io/badge/Backend-v8.9-blue)](backend/)
[![Frontend Version](https://img.shields.io/badge/Frontend-v8.3.5-green)](config.js)
[![License](https://img.shields.io/badge/license-Private-red)](.)

---

## 🎯 Caratteristiche

✅ **Sistema Prenotazioni**
- Prenotazione online pulmini 9 posti
- Gestione multipli autisti (fino a 3)
- Controllo disponibilità real-time
- Stati dinamici prenotazioni

✅ **Automazioni**
- Generazione automatica PDF contratti
- Email conferma/reminder/approvazione
- Notifiche Telegram per admin
- Aggiornamento stati live

✅ **Area Admin**
- Dashboard gestione prenotazioni
- Gestione flotta veicoli
- Anagrafica clienti
- Calendario manutenzioni

✅ **Area Cliente**
- Login con codice fiscale
- Storico prenotazioni
- Aggiornamento profilo
- Tracking stato booking

---

## 📦 Struttura Repository

```
imbriani-stefano-noleggio/
├── 📂 backend/              # Backend modulare Google Apps Script
│   ├── Config.gs           # Configurazione globale
│   ├── Main.gs             # Entry point (doGet/doPost)
│   ├── Auth.gs             # Autenticazione/JWT/CSRF
│   ├── EndpointsGet.gs     # Routing GET con cache
│   ├── EndpointsPost.gs    # Routing POST e operazioni protette
│   ├── DateUtils.gs        # Utility date
│   ├── Helpers.gs          # Helper generici e caching
│   ├── ClientiService.gs   # Gestione clienti
│   ├── PrenotazioniService.gs # CRUD prenotazioni e stati
│   ├── VeicoliService.gs   # Gestione flotta e disponibilità
│   ├── ManutenzioniService.gs # Calendario manutenzioni
│   ├── EmailService.gs     # Invio email
│   ├── TelegramService.gs  # Notifiche Telegram
│   ├── PDFGenerator.gs     # Generazione/gestione PDF
│   ├── OCRService.gs       # OCR documenti
│   ├── CSVImportService.gs # Import CSV
│   ├── ICSImportService.gs # Import ICS
│   ├── SecurityConfig.gs   # Config sicurezza
│   ├── SecurityUtils.gs    # Util sicurezza
│   └── appsscript.json     # Manifest GAS
│
├── 🎨 Frontend HTML/CSS/JS
│   ├── index.html          # Homepage
│   ├── admin.html          # Dashboard admin
│   ├── area-personale.html # Area clienti
│   ├── veicoli.html        # Gestione flotta
│   ├── dati-autisti.html   # Inserimento autisti
│   ├── richiesta-preventivo.html
│   ├── riepilogo-prenotazione.html
│   ├── config.js           # Configurazione frontend
│   ├── shared-utils.js     # Utility condivise
│   ├── booking-submit.js   # Invio prenotazioni
│   ├── scripts.js          # Script principali
│   ├── styles.css          # Stili globali
│   ├── admin-*.js/css      # Moduli admin
│   └── dist/admin.bundle.js # Bundle Rollup per admin
│
├── 📧 Email Templates
│   ├── email-template-conferma.html
│   ├── email-template-approvazione.html
│   └── email-template-reminder.html
│
├── ☁️ Cloudflare Worker
│   ├── proxy-worker.js     # Proxy CORS/Rate limit/cache
│   └── wrangler.toml       # Config deploy Worker
│
├── 🛠️ scripts/            # Script utilità
│   ├── download-backend.ps1
│   └── scripts/gas-deploy.js
│
├── 📦 pwa/                 # Progressive Web App
│   ├── manifest.json
│   ├── service-worker.js
│   └── push-notifications.js
│
├── 🧪 tests/               # Test
│   └── shared-utils.test.js
│
├── 🩹 patches/             # Fix di contrasto/accessibilità
│   └── contrast-fixes.css
│
├── 📄 Docs                 # Documentazione
│   ├── docs/proxy-setup.md
│   ├── docs/setup-props.html
│   ├── docs/diagnostics.html
│   └── docs/miglioramenti-tracker.html
└── 🧾 Varie
    ├── package.json
    ├── eslint.config.js
    ├── jsconfig.json
    ├── rollup.config.js
    └── .clasp.json
```

---

## 🚀 Quick Start

### **1️⃣ Setup Backend**

#### Opzione A: Download Automatico (Windows)
```powershell
# Scarica script
iwr https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/scripts/download-backend.ps1 -OutFile download.ps1

# Esegui
.\download.ps1
```

#### Opzione B: Manuale
1. Vai su [backend/](backend/)
2. Copia ogni file `.gs` in Google Apps Script
3. Deploy come Web App

**Vedi**: [Backend README](backend/README.md) per dettagli

---

### **2️⃣ Setup Frontend**

#### Test Locale
```bash
# Clona repository
git clone https://github.com/xDren98/imbriani-stefano-noleggio.git

# Avvia server locale
cd imbriani-stefano-noleggio
npx http-server -p 8000 -c-1

# Apri browser
# http://localhost:8000
```

#### Produzione
- Hosting statico (GitHub Pages / qualsiasi CDN)
- Proxy Cloudflare Worker per CORS e cookie HttpOnly
- API URL puntato al Worker (es. `https://imbriani-proxy.dreenhd.workers.dev`)

---

## 🔧 Configurazione

### **Backend (`backend/Config.gs`)**
```javascript
CONFIG.SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'
CONFIG.TOKEN = 'YOUR_SECRET_TOKEN'
CONFIG.TELEGRAM.BOT_TOKEN = 'YOUR_BOT_TOKEN'
CONFIG.PDF.TEMPLATE_DOC_ID = 'YOUR_TEMPLATE_ID'
```

### **Frontend (`config.js`)**
```javascript
const CONFIG = {
  API_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: 'YOUR_SECRET_TOKEN',
  SHEETS_ID: 'YOUR_SPREADSHEET_ID'
};
```

### **Proxy Cloudflare Worker**
Vedi: `docs/proxy-setup.md` per configurazione CORS e pubblicazione.
Comandi utili:
```bash
npm run proxy:publish   # deploy Worker
npm run gas:push        # push backend
npm run gas:deploy-auto # aggiorna deployment GAS senza cambiare URL
```

---

## 📡 API Endpoints

### **GET**
```
GET /exec?action=health
GET /exec?action=getVeicoli&token=XXX
GET /exec?action=getPrenotazioni&token=XXX
GET /exec?action=disponibilita&targa=XX&dataInizio=YY&dataFine=ZZ
```

### **POST**
```json
// Login
POST { "action": "login", "codiceFiscale": "..." }

// Crea prenotazione
POST {
  "action": "creaPrenotazione",
  "token": "...",
  "targa": "...",
  "giornoInizio": "2025-11-20",
  "autista1": { ... }
}
```

Per ulteriori dettagli vedi `backend/README.md` e `docs/diagnostics.html`.

---

## 📈 Architettura

### **Stack Tecnologico**

**Backend**
- 🔹 Google Apps Script (JavaScript)
- 🔹 Google Sheets (Database)
- 🔹 Google Drive (PDF Storage)
- 🔹 Gmail API (Email)
- 🔹 Telegram Bot API (Notifiche)

**Frontend**
- 🟢 HTML5 + CSS3
- 🟢 Vanilla JavaScript (no framework)
- 🟢 Progressive Web App (PWA)

**Infrastructure**
- ☁️ Cloudflare Workers (CORS Proxy)
- ☁️ GitHub (Version Control)
- ☁️ Static Hosting (GitHub Pages / Vercel)

### **Flusso Dati**

```
Frontend (Browser)
  │
  ↓ HTTPS + CORS
  │
Cloudflare Worker Proxy
  │
  ↓ Token validation
  │
Google Apps Script Backend
  ├──> Google Sheets (Read/Write)
  ├──> Google Drive (PDF Gen)
  ├──> Gmail (Send Email)
  └──> Telegram API (Notify)
```

---

## 🔐 Sicurezza

✅ Token authentication su tutte le chiamate API  
✅ CORS gestito da Cloudflare Worker  
✅ Rate limiting su Apps Script  
✅ Validazione input lato server  
✅ Escape HTML per prevenire XSS  
✅ HTTPS only  

---

## 📚 Documentazione

- 📝 Backend Modulare: `backend/README.md`
- ☁️ Proxy setup: `docs/proxy-setup.md`
- ⚙️ Proprietà GAS: `docs/setup-props.html`
- 🔧 Diagnostica: `docs/diagnostics.html`
- 📈 Miglioramenti pianificati: `docs/miglioramenti-tracker.html`

---

## 🔄 Workflow Sviluppo

### **Aggiornamento Backend**
```powershell
# Download file modificato
$file = "Config.gs"
iwr "https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/backend/$file" -OutFile $file

# Copia in Apps Script Editor
# Salva e Deploy
```

### **Test Locale Frontend**
```bash
# Server locale
npx http-server -p 8000 -c-1

# Apri DevTools browser
# Testa modifiche
```

### **Deploy Produzione**
```bash
# Commit modifiche
git add .
git commit -m "feat: Nuova funzionalità"
git push origin main

# Deploy automatico (se configurato)
```

---

## 👥 Team

**Developer**: Antonio "Dren" Mello ([@xDren98](https://github.com/xDren98))  
**Cliente**: Imbriani Stefano Noleggio  

---

## 📝 Changelog

### v8.9 (07/11/2025)
- ✅ Modularizzazione backend (14 file)
- ✅ README e documentazione completa
- ✅ Script PowerShell per download
- ✅ Migliorata gestione date italiane

### v8.3.5
- ✅ Proxy Cloudflare Worker
- ✅ Fix CORS completo
- ✅ Gestione token smart

**Vedi**: [CHANGELOG.md](CHANGELOG.md) per storia completa

---

## 🔗 Link Utili

- 🌐 [Repository GitHub](https://github.com/xDren98/imbriani-stefano-noleggio)
- 📊 [Google Sheets Database](https://docs.google.com/spreadsheets/d/1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns)
- 📄 [Template PDF Contratto](https://docs.google.com/document/d/1JEpqJZq9SnmmBWAucrRQ-CAzditSK3fL7HXKbWe-kcM)
- 📂 [Cartella PDF Generati](https://drive.google.com/drive/folders/1bYLuvfydAUaKsZpZVrFq-H3uRT66oo98)

---

## 🆘 Supporto

Per problemi o domande:
- 🐛 Apri [Issue su GitHub](https://github.com/xDren98/imbriani-stefano-noleggio/issues)
- 📧 Email: dreenhd@gmail.com
- 📞 WhatsApp: +393286589618

---

## ©️ License

**Private** - Tutti i diritti riservati  
© 2025 Imbriani Stefano Noleggio

---

**Ultimo aggiornamento**: 07/11/2025  
**Versione**: 8.9 (Modulare)
