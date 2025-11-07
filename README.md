# 🚐 Imbriani Stefano Noleggio

**Sistema completo di gestione noleggio pulmini con backend modulare Google Apps Script e frontend responsive.**

[![Version](https://img.shields.io/badge/version-8.9-blue.svg)](https://github.com/xDren98/imbriani-stefano-noleggio)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/backend-Google_Apps_Script-yellow.svg)](https://script.google.com)
[![Architecture](https://img.shields.io/badge/architecture-modular-success.svg)](backend/README.md)

---

## 📁 Struttura Repository

```
imbriani-stefano-noleggio/
│
├── 📁 backend/              Backend modulare (14 file)
│   ├── Config.gs           Configurazione centrale
│   ├── Main.gs             Entry point doGet/doPost
│   ├── *Service.gs         Servizi business logic
│   └── README.md           Documentazione completa
│
├── 📁 frontend/             Frontend web application
│   ├── pages/              HTML pages
│   ├── scripts/            JavaScript modules
│   └── styles/             CSS stylesheets
│
├── 📁 templates/            Template email HTML
│
├── 📁 docs/                 Documentazione
│   ├── API.md              API Reference
│   ├── SETUP.md            Setup Guide
│   └── DEPLOYMENT.md       Deployment Guide
│
├── 📁 scripts/              Utility scripts
│   └── download-backend.ps1 PowerShell download script
│
└── README.md               ← Questo file
```

---

## ✨ Caratteristiche

### Backend (Google Apps Script)
- ✅ **Architettura modulare** - 14 file separati per responsabilità
- ✅ **API RESTful** - GET/POST endpoints con autenticazione token
- ✅ **Gestione completa** - Prenotazioni, veicoli, clienti, manutenzioni
- ✅ **Generazione PDF automatica** - Contratti al volo
- ✅ **Email automatiche** - Conferma, approvazione, reminder
- ✅ **Notifiche Telegram** - Alert real-time
- ✅ **Date italiane** - Formattazione gg/mm/aaaa
- ✅ **Stati automatici** - Transizioni temporizzate

### Frontend
- ✅ **Dashboard admin** - Gestione prenotazioni completa
- ✅ **Area personale clienti** - Storico prenotazioni
- ✅ **Booking online** - Form prenotazione guidato
- ✅ **Responsive design** - Mobile-first
- ✅ **Real-time updates** - Sincronizzazione automatica

---

## 🚀 Quick Start

### 1️⃣ Setup Backend

```bash
# Download file backend
powershell -File scripts/download-backend.ps1

# Carica su Google Apps Script
# Vedi docs/SETUP.md per istruzioni dettagliate
```

### 2️⃣ Deploy Web App

1. Apri [Google Apps Script](https://script.google.com)
2. Carica tutti i file da `backend/`
3. Deploy → New deployment → Web app
4. Copia URL deployment

### 3️⃣ Configura Frontend

```javascript
// frontend/scripts/config.js
const CONFIG = {
  API_URL: 'TUO_WEB_APP_URL',
  TOKEN: 'imbriani_secret_2025'
};
```

### 4️⃣ Test

```bash
# Apri browser su:
http://localhost:8000/frontend/pages/index.html
```

**Documentazione completa:** [docs/SETUP.md](docs/SETUP.md)

---

## 📊 Architettura

### Backend Modulare

```
Main.gs (Entry Point)
├── EndpointsGet.gs → Route GET requests
├── EndpointsPost.gs → Route POST requests
└── Services/
    ├── PrenotazioniService.gs
    ├── VeicoliService.gs
    ├── ClientiService.gs
    ├── PDFGenerator.gs
    ├── EmailService.gs
    └── TelegramService.gs
```

### Database (Google Sheets)

- **PRENOTAZIONI** - 83+ prenotazioni
- **PULMINI** - 3 veicoli
- **CLIENTI** - 90+ clienti
- **MANUTENZIONI** - Storico manutenzioni

---

## 🔧 Configurazione

### Backend (Config.gs)

```javascript
const CONFIG = {
  VERSION: '8.9',
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
  TOKEN: 'YOUR_SECRET_TOKEN',
  TELEGRAM: {
    BOT_TOKEN: 'YOUR_BOT_TOKEN',
    CHAT_ID: 'YOUR_CHAT_ID'
  },
  PDF: {
    TEMPLATE_DOC_ID: 'YOUR_TEMPLATE_ID',
    PDF_FOLDER_ID: 'YOUR_FOLDER_ID'
  }
};
```

### Frontend (config.js)

```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/.../exec',
  TOKEN: 'imbriani_secret_2025'
};
```

---

## 📚 Documentazione

- **[Backend README](backend/README.md)** - Documentazione completa backend
- **[API Reference](docs/API.md)** - Tutti gli endpoints disponibili
- **[Setup Guide](docs/SETUP.md)** - Istruzioni setup passo-passo
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy produzione

---

## 🧪 Test

### Test Backend

```powershell
# PowerShell
$url = "YOUR_WEB_APP_URL"
$token = "imbriani_secret_2025"

# Test health
Invoke-RestMethod "$url?action=health"

# Test veicoli
Invoke-RestMethod "$url?action=getVeicoli&token=$token"
```

### Test Frontend

```bash
# Avvia server locale
npx http-server frontend -p 8000

# Apri browser
http://localhost:8000/pages/index.html
```

**Risultati attesi:**
- ✅ 8/8 test backend passati (100%)
- ✅ 83 prenotazioni caricate
- ✅ 90 clienti sincronizzati
- ✅ 3 veicoli disponibili

---

## 🛠️ Sviluppo

### Prerequisiti

- Google Account
- Browser moderno (Chrome, Firefox, Edge)
- PowerShell (per script utility)

### Workflow

```bash
# 1. Clone repository
git clone https://github.com/xDren98/imbriani-stefano-noleggio.git

# 2. Modifica file
# - Backend: cartella backend/
# - Frontend: cartella frontend/

# 3. Test locale
npx http-server frontend

# 4. Deploy
# - Backend: Carica su Google Apps Script
# - Frontend: Push su GitHub → GitHub Pages
```

---

## 📈 Statistiche

- **Backend:** 14 file modulari (~2000 righe totali)
- **Frontend:** 8 pagine HTML + 10 file JS/CSS
- **Database:** 83 prenotazioni, 90 clienti, 3 veicoli
- **Test:** 8/8 passati (100% success rate)
- **Uptime:** 99.9% (Google Apps Script)

---

## 🤝 Contribuire

1. Fork repository
2. Crea branch feature (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'Add amazing feature'`)
4. Push su branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

---

## 📝 License

MIT License - vedi [LICENSE](LICENSE) per dettagli

---

## 👤 Autore

**Antonio Mello (xDren98)**
- GitHub: [@xDren98](https://github.com/xDren98)
- Email: dreenhd@gmail.com

---

## 🙏 Credits

- Google Apps Script
- Google Sheets API
- Telegram Bot API

---

## 📞 Supporto

Per problemi o domande:
- 📧 Email: dreenhd@gmail.com
- 🐛 [GitHub Issues](https://github.com/xDren98/imbriani-stefano-noleggio/issues)

---

**⭐ Se questo progetto ti è utile, lascia una stella!**

```
   ___           _          _              _   
  |_ _|_ __ ___ | |__  _ __(_) __ _ _ __ (_)  
   | || '_ ` _ \| '_ \| '__| |/ _` | '_ \| |  
   | || | | | | | |_) | |  | | (_| | | | | |  
  |___|_| |_| |_|_.__/|_|  |_|\__,_|_| |_|_|  
                                               
  Noleggio Pulmini - Sistema Completo v8.9
```
