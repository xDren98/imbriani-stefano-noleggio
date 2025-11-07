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

### ❌ Cartelle Obsolete/Demo

```bash
backup/                          # Vecchi backup - non più necessari
patches/                         # Patch temporanee - integrate
pwa/                             # PWA sperimentale - non usato
partials/                        # Partial HTML - consolidati

# File demo OCR (sperimentali)
demo-ocr-autista.html
demo-ocr-autisti-google.html
```

---

## 🛠️ Come Rimuovere

### Opzione 1: Git Command Line

```bash
# Rimuovi file singoli
git rm code.gs
git rm index.html admin.html area-personale.html
git rm config.js admin-prenotazioni.js admin-scripts.js
git rm styles.css admin-styles.css
git rm email-template-*.html

# Rimuovi cartelle
git rm -r backup/ patches/ pwa/ partials/
git rm demo-ocr-*.html

# Commit
git commit -m "chore: Rimossi file obsoleti dopo riorganizzazione"
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
├── backend/              ✅ Backend modulare
├── frontend/             ✅ Frontend organizzato
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

---

## ⚠️ Note Importanti

1. **NON eliminare cartella `backend/`** - Contiene i file modulari attivi
2. **NON eliminare cartella `scripts/`** - Contiene utility PowerShell
3. **Backup locale** - Prima di eliminare, fai backup locale per sicurezza
4. **Verifica link** - Dopo cleanup, verifica che frontend/pages/ puntino ai nuovi percorsi

---

## 📝 After Cleanup Checklist

- [ ] File root rimossi
- [ ] Cartelle obsolete rimosse
- [ ] Frontend funzionante con nuova struttura
- [ ] Backend invariato (già in cartella)
- [ ] README aggiornato
- [ ] GitHub Pages configurato su `/frontend` se usato

---

**Dopo il cleanup, elimina anche questo file CLEANUP.md!** 🚀
