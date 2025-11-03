# 🚐 Imbriani Stefano Noleggio - Sistema Prenotazioni

> Sistema completo di prenotazione pulmini 9 posti con pannello admin

## 🚀 Setup Veloce

### Requisiti
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Connessione internet per API Cloudflare

### Test in Locale

```powershell
# Scarica e testa tutto il progetto
$repo = "https://github.com/xDren98/imbriani-noleggio"
$folder = "imbriani-test"

# Clona repo
git clone $repo $folder
cd $folder

# Avvia server locale (Python)
python -m http.server 8000
# OPPURE (Node.js se installato)
npx serve .

# Vai su: http://localhost:8000
# Test diagnostics: http://localhost:8000/diagnostics.html
```

## 📱 Funzionalità

### **Cliente (index.html)**
- 🔐 Login con Codice Fiscale (16 caratteri)
- 🧿 Wizard prenotazione 4 step:
  1. 📅 Selezione date
  2. 🚐 Scelta veicolo (solo 9 posti)
  3. 👨‍✈️ Autisti (1-3 per prenotazione)
  4. ✅ Conferma finale
- 📱 Responsive (mobile/tablet/desktop)
- 📂 Area personale (prenotazioni, anagrafica, patente)

### **Admin (admin.html)**
- 🔑 Pannello amministrazione dedicato
- ✅ Approva/Rifiuta prenotazioni
- 📈 Dashboard prenotazioni in attesa
- 📄 Export CSV completo

### **Diagnostics (diagnostics.html)**
- 🔧 Test connessione API/CORS
- 📊 Monitoring sistema real-time
- 📝 Console logs centralizzati

## ⚙️ Configurazione

### API Endpoint
- **Produzione**: `https://imbriani-proxy.dreenhd.workers.dev`
- **Token**: Configurato automaticamente in `config.js`
- **CORS**: Gestito via Cloudflare Workers

### Ambiente
- 🌐 **PROD**: `imbriani-noleggio.vercel.app`
- 💻 **LOCAL**: `localhost` o `127.0.0.1`
- 🔄 Auto-detection in `config.js`

## 📁 Struttura File

```
┌── index.html          # App principale cliente
├── admin.html          # Pannello admin
├── veicoli.html        # Pagina veicoli
├── diagnostics.html    # Tool diagnostica
├── config.js           # Configurazione centralizzata
├── scripts.js          # Logica app principale
├── admin-scripts.js    # Logica pannello admin
├── booking-submit.js   # Gestione prenotazioni
├── shared-utils.js     # Utilità condivise
├── styles.css          # Stili completi
└── partials/           # Componenti HTML
    └── step-autisti.html
```

## 🚑 Deploy

### Vercel (Raccomandato)
1. Collega repo GitHub a Vercel
2. Deploy automatico su push `main`
3. Dominio: `imbriani-noleggio.vercel.app`

### Altro Hosting
- Carica tutti i file HTML/JS/CSS
- Nessuna build richiesta (static site)
- Assicurati HTTPS per API calls

## 🔧 Debug

### Test Sistema
1. Vai su `/diagnostics.html`
2. Test API Connection
3. Test CORS headers
4. Test Login mock
5. Controlla console logs

### Log Centralizzato
```javascript
// In qualsiasi script:
window.logApp('Messaggio info');
window.logApp('Errore critico', 'error');
window.logApp('Warning', 'warn');
window.logApp('Successo', 'success');
```

### Ambienti
- `window.ENV_NAME` - Nome ambiente corrente
- `window.API_URL` - URL API attivo
- `window.API_TOKEN` - Token autenticazione

## 📞 Contatti
- **WhatsApp**: +39 328 658 9618
- **Email**: Tramite sistema prenotazioni

## 📈 Versione
- **Frontend**: v8.1.0
- **Backend**: Cloudflare Workers
- **Database**: Google Sheets

---

**🎆 Sistema completo e ottimizzato per produzione!**