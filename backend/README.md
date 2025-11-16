# 🚀 Backend Modulare - Imbriani Stefano Noleggio

## 📋 Panoramica

Questa cartella contiene il backend modulare per Google Apps Script, diviso in file specifici per responsabilità.

**Versione**: 8.9 (Modularizzata)

---

## 📁 Struttura File

### **Core Files**

| File | Righe | Descrizione |
|------|-------|-------------|
| `Config.gs` | ~140 | Configurazione globale (spreadsheet, token, colonne) |
| `Main.gs` | ~30 | Entry point (doGet/doPost) |
| `Helpers.gs` | ~120 | Utility generiche (JSON response, normalizzazione) |
| `DateUtils.gs` | ~90 | Utility per date (formattazione italiana) |

### **Authentication**

| File | Righe | Descrizione |
|------|-------|-------------|
| `Auth.gs` | ~150 | Autenticazione, validazione token e CSRF |
| `EndpointsGet.gs` | ~150 | Routing endpoint GET |
| `EndpointsPost.gs` | ~120 | Routing endpoint POST |

### **Services** (Da creare)

| File | Righe Est. | Descrizione |
|------|------------|-------------|
| `PrenotazioniService.gs` | ~500 | CRUD prenotazioni, stati, ID booking |
| `VeicoliService.gs` | ~200 | Gestione veicoli e disponibilità |
| `ClientiService.gs` | ~250 | Gestione clienti e sincronizzazione |
| `ManutenzioniService.gs` | ~150 | Gestione manutenzioni veicoli |

### **Features** (Da creare)

| File | Righe Est. | Descrizione |
|------|------------|-------------|
| `PDFGenerator.gs` | ~300 | Generazione e gestione PDF contratti |
| `EmailService.gs` | ~250 | Invio email (conferma, reminder, preventivo) |
| `TelegramService.gs` | ~80 | Notifiche Telegram |

---

## 🔗 Dipendenze tra File

```
Main.gs
  ├─> EndpointsGet.gs
  │     ├─> Auth.gs (validateToken, getAuthHeader)
  │     ├─> PrenotazioniService.gs
  │     ├─> VeicoliService.gs
  │     └─> Helpers.gs (createJsonResponse)
  │
  └─> EndpointsPost.gs
        ├─> Auth.gs (handleLogin, validateToken)
        ├─> PrenotazioniService.gs
        ├─> ClientiService.gs
        └─> Helpers.gs

Tutti i Services usano:
  ├─> Config.gs (CONFIG object)
  ├─> DateUtils.gs (formatDateToItalian)
  └─> Helpers.gs (createJsonResponse)
```

---

## 🛠️ Setup e Deploy

### **Metodo 1: Copia Manuale (GAS)**

1. Apri [Google Apps Script](https://script.google.com)
2. Crea nuovo progetto "Imbriani Backend v8.9"
3. Per ogni file `.gs` in questa cartella:
   - Clicca "+" per aggiungere file
   - Copia il contenuto dal file GitHub
   - Incolla nell'editor
   - Salva con stesso nome (es. `Config`)
4. Deploy come Web App (Who has access: Anyone)

### **Metodo 2: clasp (CLI)**

```bash
# Installa clasp
npm install -g @google/clasp

# Login
clasp login

# Clone progetto esistente
clasp clone <SCRIPT_ID>

# Copia file da backend/
cp backend/*.gs ./

# Push su Apps Script
clasp push

# Crea nuova versione
clasp version "auto-deploy"

# Aggiorna la deployment esistente senza cambiare URL
# (sostituisci DEPLOYMENT_ID con l'ID dell'URL in uso)
clasp deploy -i DEPLOYMENT_ID -V <versionNumber>
```

---

## 📡 API Endpoints

### **GET Endpoints** (Auth richiesta)

```
GET ?action=getPrenotazioni&token=imbriani_secret_2025
GET ?action=getVeicoli&token=imbriani_secret_2025
GET ?action=checkDisponibilita&targa=XX&dataInizio=YYYY-MM-DD&dataFine=YYYY-MM-DD
GET ?action=updateStatiLive
GET ?action=sincronizzaClienti
GET ?action=checkReminders
```

### **POST Endpoints**

```json
// Login (no auth)
POST { "action": "login", "codiceFiscale": "..." }

// Crea prenotazione (auth richiesta)
POST {
  "action": "creaPrenotazione",
  "token": "imbriani_secret_2025",
  "targa": "...",
  "giornoInizio": "...",
  "autista1": { ... }
}

// Aggiorna stato
POST {
  "action": "aggiornaStato",
  "idPrenotazione": "BOOK-2025-001",
  "nuovoStato": "Confermata"
}
```

---

## 🔄 Workflow Modifica

### **Quando modifichi un file:**

1. **Modifica su GitHub** (questo repository)
2. **Download locale** (PowerShell):
   ```powershell
   $file = "Config.gs"
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/backend/$file" -OutFile "$file"
   ```
3. **Copia in Google Apps Script Editor**
4. **Salva e testa**
5. **Deploy nuova versione**

---

## 🧪 Testing

### **Test tramite Proxy**
```bash
curl "https://<tuo-worker>.workers.dev/?action=health"
curl "https://<tuo-worker>.workers.dev/?action=version"
```

### **Test con Token**
```bash
curl "https://script.google.com/.../exec?action=getVeicoli&token=imbriani_secret_2025"
```

---

## 📝 Note Importanti

### **⚠️ Limitazioni Google Apps Script**

- ❌ Non supporta cartelle (tutti i file nella stessa directory)
- ❌ Non supporta `import/export` ES6
- ✅ Tutte le funzioni sono globali
- ✅ File caricati in ordine alfabetico

### **✅ Best Practices**

1. **Prefissi funzioni**: Usa nomi descrittivi (es. `getPrenotazioni` non `get`)
2. **Documentazione**: JSDoc per ogni funzione
3. **Logging**: `Logger.log()` per debug
4. **Error handling**: Try/catch su tutte le funzioni pubbliche

---

## 🔐 Configurazione

### **Variabili in `Config.gs`**

```javascript
CONFIG.SPREADSHEET_ID // ID Google Sheets
CONFIG.TOKEN          // Token autenticazione
CONFIG.TELEGRAM.*     // Bot Telegram
CONFIG.PDF.*          // Template e folder PDF
```

### **Permissions richieste**

- Google Sheets (read/write)
- Google Drive (PDF generation)
- Gmail (email sending)
- UrlFetch (Telegram API)

---

## 🔐 Sicurezza

### **Configurazione Sicurezza Avanzata**

Il backend include sistemi di sicurezza avanzati configurabili tramite `SecurityConfig.gs`:

#### **Controllo Accessi**
- `ALLOWED_IPS`: Lista IP autorizzati (es: "192.168.1.1, 10.0.0.0/24")
- `ALLOWED_DOMAINS`: Lista domini autorizzati (es: "imbriani.it, noleggi-imbriani.it")
- `WEBAPP_ACCESS`: Configurato su "DOMAIN" (accesso limitato al dominio)

#### **Rate Limiting**
- `MAX_REQUESTS_PER_MINUTE`: Limite richieste per IP (default: 60)
- Protezione contro attacchi DDoS e bruteforce

#### **CSRF Protection**
- Token CSRF generati per ogni sessione
- Validazione automatica su tutti gli endpoint POST
- Timeout token: 1 ora

#### **Formula Injection Protection**
- Sanitizzazione automatica dei dati prima della scrittura su Google Sheets
- Protezione contro formule maligne (=,+,-,@)

#### **Session Management**
- JWT con HMAC-SHA256
- Session timeout: 24 ore
- Protezione contro session hijacking

### **Impostazioni Raccomandate per Produzione**

```javascript
// In SecurityConfig.gs
ALLOWED_IPS: '192.168.1.0/24, 10.0.0.0/16' // Solo IP aziendali
ALLOWED_DOMAINS: 'imbriani.it, www.imbriani.it' // Solo domini ufficiali
MAX_REQUESTS_PER_MINUTE: 30 // Più restrittivo
DEBUG_MODE: false // Disabilita debug in produzione
```

---

## 📊 Vantaggi Modularizzazione

### ✅ **Manutenibilità**
- File piccoli (50-500 righe)
- Responsabilità singola
- Bug facili da trovare

### ✅ **Collaborazione**
- Merge conflict ridotti
- Review code più semplici
- Modifiche isolate

### ✅ **Testing**
- Test per singolo modulo
- Mock semplificati
- Debug veloce

---

## 📖 Documentazione Completa

Vedi:
- [API Documentation](../docs/API.md)
- [Setup Guide](../docs/SETUP.md)
- [File originale monolitico](../code.gs) (backup)

---

## 🆘 Supporto

Per problemi o domande:
- Apri issue su GitHub
- Contatta: dreenhd@gmail.com

---

**Ultimo aggiornamento**: 07/11/2025
**Versione Backend**: 8.9 (Modulare)
