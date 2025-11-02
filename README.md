# 🚐 Imbriani Noleggio

## Sistema di Prenotazione Pulmini 9 Posti

**Versione**: 5.4.1 Production  
**Ultima modifica**: 02 Novembre 2025

### 🌐 URL Produzione
- **Sito**: https://xdren98.github.io/imbriani-noleggio/
- **Admin**: https://xdren98.github.io/imbriani-noleggio/admin.html

### 🏗️ Architettura
- **Frontend**: GitHub Pages (HTML/CSS/JS)
- **Backend**: Google Apps Script
- **Database**: Google Sheets

### ✅ Funzionalità
- ✅ Sistema prenotazioni con calendario
- ✅ Area personale clienti
- ✅ Dashboard amministratore
- ✅ Gestione stati prenotazioni
- ✅ Integrazione WhatsApp
- ✅ Sistema cache e real-time updates

### 🔧 Deploy
Il sito è automaticamente deployato via GitHub Pages dal branch `main`.

Per modifiche:
1. Modifica i file
2. Commit su `main`
3. GitHub Pages aggiorna automaticamente

### 🚀 Test Locale
```bash
npx serve . -p 3000
```

### 📁 Struttura File
```
├── index.html
├── config.js
├── shared-utils.js
├── scripts.js
├── styles.css
├── safe-whatsapp-fix.js
├── whatsapp-loader.js
└── README.md
```

### 🔗 API Backend
- URL: https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec
- Endpoint: /login /recuperaPrenotazioni /disponibilita /creaPrenotazione

---
© 2025 Imbriani Noleggio - Sistema v5.4.1