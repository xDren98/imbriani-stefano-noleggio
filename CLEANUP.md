# 🧹 Repository Cleanup Guide

## File da Rimuovere dalla Root

### ❌ File Obsoleti Backend

```bash
# Backend monolitico (sostituito da backend/)
code.gs                          # 80 KB - Sostituito da 14 file modulari
```

### ❌ File Frontend da Root (Spostati)

```bash
# HTML - Spostati in frontend/pages/
index.html                       → frontend/pages/index.html
admin.html                       → frontend/pages/admin.html
area-personale.html              → frontend/pages/area-personale.html
veicoli.html                     → frontend/pages/veicoli.html
dati-autisti.html                → frontend/pages/dati-autisti.html
richiesta-preventivo.html        → frontend/pages/richiesta-preventivo.html
riepilogo-prenotazione.html      → frontend/pages/riepilogo-prenotazione.html

# JavaScript - Spostati in frontend/scripts/
config.js                        → frontend/scripts/config.js
admin-prenotazioni.js            → frontend/scripts/admin-prenotazioni.js
admin-scripts.js                 → frontend/scripts/admin-scripts.js
scripts.js                       → frontend/scripts/scripts.js
booking-submit.js                → frontend/scripts/booking-submit.js
shared-utils.js                  → frontend/scripts/shared-utils.js

# CSS - Spostati in frontend/styles/
styles.css                       → frontend/styles/styles.css
admin-styles.css                 → frontend/styles/admin-styles.css
```

### ❌ Template Email (Spostati)

```bash
email-template-conferma.html     → templates/email-template-conferma.html
email-template-approvazione.html → templates/email-template-approvazione.html
email-template-reminder.html     → templates/email-template-reminder.html
```

### ❌ Cartelle Obsolete/Spostate

```bash
backup/                          # Vecchi backup - non più necessari
patches/                         # Patch temporanee - integrate
partials/                        # Partial HTML - consolidati
pwa/                             # ✅ SPOSTATA in frontend/pwa/ 

# File demo OCR (sperimentali - non usati)
demo-ocr-autista.html
demo-ocr-autisti-google.html
```

---

## 🛠️ Come Rimuovere

### Opzione 1: Git Command Line (CONSIGLIATO)

```bash
# Rimuovi file singoli
git rm code.gs
git rm index.html admin.html area-personale.html veicoli.html
git rm dati-autisti.html richiesta-preventivo.html riepilogo-prenotazione.html
git rm config.js admin-prenotazioni.js admin-scripts.js
git rm scripts.js booking-submit.js shared-utils.js
git rm styles.css admin-styles.css
git rm email-template-*.html

# Rimuovi file demo OCR
git rm demo-ocr-*.html

# Rimuovi cartelle obsolete
git rm -r backup/
git rm -r patches/
git rm -r partials/
git rm -r pwa/              # Ora in frontend/pwa/

# Commit tutto insieme
git commit -m "chore: Cleanup - Rimossi file obsoleti dopo riorganizzazione"
git push origin main
```

### Opzione 2: GitHub Web Interface

1. Vai su [github.com/xDren98/imbriani-stefano-noleggio](https://github.com/xDren98/imbriani-stefano-noleggio)
2. Per ogni file:
   - Clicca sul file
   - Clicca 🗑️ (icona cestino)
   - Commit change: "Remove obsolete file"
3. Per cartelle: ripeti per ogni file nella cartella

---

## ✅ Nuova Struttura (Dopo Cleanup)

```
imbriani-stefano-noleggio/
├── backend/              ✅ Backend modulare (14 file)
├── frontend/             ✅ Frontend organizzato
│   ├── pages/            ✅ HTML pages
│   ├── scripts/          ✅ JavaScript
│   ├── styles/           ✅ CSS
│   └── pwa/              ✅ Progressive Web App
├── templates/            ✅ Template email
├── docs/                 ✅ Documentazione
├── scripts/              ✅ Utility scripts
├── .gitignore            ✅ Aggiornato
├── README.md             ✅ Nuova documentazione
└── CLEANUP.md            ✅ Questa guida
```

---

## 📊 Statistiche Cleanup

### Prima della Riorganizzazione
- **File root:** 28 file
- **Cartelle root:** 7 cartelle
- **Totale:** ~35 elementi disorganizzati

### Dopo la Riorganizzazione
- **File root:** 3 file (README, .gitignore, CLEANUP)
- **Cartelle root:** 5 cartelle organizzate
- **Riduzione:** ~85% file in root

### Benefici
- ✅ Navigazione più semplice
- ✅ Struttura professionale
- ✅ Separazione responsabilità
- ✅ Manutenibilità migliorata
- ✅ PWA organizzato in frontend/pwa/

---

## ⚠️ Note Importanti

1. **NON eliminare cartella `backend/`** - Contiene i file modulari attivi
2. **NON eliminare cartella `frontend/`** - Nuova struttura organizzata
3. **NON eliminare cartella `scripts/`** - Contiene utility PowerShell
4. **Backup locale** - Prima di eliminare, fai backup locale per sicurezza
5. **PWA spostato** - La vecchia cartella `pwa/` in root è ora in `frontend/pwa/`
6. **Verifica link** - Dopo cleanup, verifica che le pagine HTML puntino ai nuovi percorsi

---

## 📝 After Cleanup Checklist

- [ ] File root rimossi (HTML, JS, CSS)
- [ ] Cartelle obsolete rimosse (backup/, patches/, partials/)
- [ ] Vecchia cartella pwa/ rimossa (ora in frontend/pwa/)
- [ ] File demo OCR rimossi
- [ ] code.gs rimosso (backend monolitico obsoleto)
- [ ] Frontend funzionante con nuova struttura
- [ ] Backend invariato (già in cartella)
- [ ] PWA testato (service worker, manifest)
- [ ] README aggiornato
- [ ] GitHub Pages configurato su `/frontend` se usato

---

## 🚀 Dopo il Cleanup

### Test PWA

```bash
# Verifica che PWA funzioni
1. Apri dev tools → Application → Manifest
2. Controlla Service Worker registrato
3. Test offline mode
4. Test installazione app
```

### Update HTML Pages

Aggiungi in `<head>` delle pagine:

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/frontend/pwa/manifest.json">
<meta name="theme-color" content="#0066FF">
```

Registra Service Worker:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/frontend/pwa/service-worker.js');
  }
</script>
```

---

**Dopo il cleanup, elimina anche questo file CLEANUP.md!** 🚀

**Vedi frontend/pwa/README.md per documentazione completa PWA**
