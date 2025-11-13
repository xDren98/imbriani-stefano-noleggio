# Documento di Continuità Tecnico‑Operativa

Versione: 1.0  
Data: 2025‑11‑13

## 1. Stato Attuale del Lavoro
- Attività e stato di avanzamento
  - Prestazioni backend: indici cache e snapshot
    - Implementati indici `CLIENTI (CF→riga)` e `PRENOTAZIONI (ID→riga)` per accesso O(1)
    - Snapshot cache `CLIENTI` e `PRENOTAZIONI` (TTL 120s) per ricerche testuali rapide
    - Caching mirato su `getCliente` (TTL 60s)
    - Stato: completato
  - Endpoint di ricerca
    - Nuovo `action=search` con `entity=clienti|veicoli|prenotazioni`, filtri `q`, `limit`, `offset`, supporto JSONP
    - Stato: completato
  - Ottimizzazioni proxy
    - Prewarm iniziale, stale‑while‑revalidate e caching chiavi normalizzate
    - Stato: completato
  - Gestione fallback JSONP
    - Abilitato lato backend il wrapping `callback(<json>)` per azioni GET
    - Stato: completato
  - Refactoring frontend admin
    - Scomposizione in moduli (`admin-validation.js`, `admin-api.js`, `admin-ui.js`, `admin-renderer.js`) e orchestrazione in `admin-main.js`
    - Estratto renderer UI: rendering Clienti/Flotta/Selezione veicolo in `admin-renderer.js`
    - Listener UI (sidebar/pulsanti) spostati in `admin-ui.js` e esposti via `window.*`
    - Utilities centralizzate: uso di `escapeHtml`/`parseDateAny` da `shared-utils.js`; comparatori in `admin-validation.js`
    - Bundling con Rollup → `dist/admin.bundle.js`, aggiornato `admin.html`
    - Stato: completato (Fase 1–3)

- Documentazione tecnica aggiornata
  - Proxy e caching: `proxy-worker.js` (prewarm, stale‑while‑revalidate, TTL 30s)
  - Backend Apps Script:
    - `backend/Helpers.gs`: funzioni cache JSON, normalizzazione testo, indici e snapshot
    - `backend/EndpointsGet.gs`: supporto JSONP e `action=search`
    - `backend/ClientiService.gs`: utilizzo indici e `setValues` per aggiornamenti atomici
    - `backend/PrenotazioniService.gs`: utilizzo indici per aggiornamenti stato/importo
  - Frontend Admin:
    - Moduli: `admin-validation.js`, `admin-api.js`, `admin-ui.js`, `admin-renderer.js`, `admin-main.js`
    - Build: `rollup.config.js`, `package.json` (script `npm run build`)
    - Bundle: `dist/admin.bundle.js`

- Configurazioni e impostazioni correnti
  - CSP (`admin.html`): consente `script.google.com` e `script.googleusercontent.com` per JSONP
  - Cloudflare Worker: origini consentite, rate limit GET/POST, header CORS, cache TTL 30s
  - Backend Apps Script:
    - `CONFIG.SPREADSHEET_ID` e `CONFIG.TOKENS` via Script Properties
    - TTL cache: `getVeicoli` e `getPrenotazioni` 120s; snapshot 120s; `getCliente` 60s
  - Frontend Admin:
    - Caricamento `shared-utils.js` + `dist/admin.bundle.js` (ESM)
  - `docs/diagnostics.html` con pannello Riepilogo (KPI tempi/cache/pass/fail)

## 2. Punti di Ripristino
- Punto esatto da cui riprendere
  - Frontend: `admin.html` carica `dist/admin.bundle.js` (build effettuato il 2025‑11‑13)
  - Backend: indici e snapshot attivi; endpoint `search` disponibile
  - Proxy: prewarm abilitato all’avvio

- Dati e contesto necessari
  - Script Properties in Apps Script: `SPREADSHEET_ID`, `TOKEN` e `TOKENS`
  - Accesso a Cloudflare Worker (deploy attuale) e Google Apps Script
  - Fogli Google: `PRENOTAZIONI`, `PULMINI`, `CLIENTI`, `MANUTENZIONI`
  - Ambiente Node.js per build (`npm run build`)

- Procedure di ripristino rapido
  - Se il bundle non fosse disponibile o coerente:
    - Ripristinare `admin.html` ai moduli non bundle (caricare `admin-validation.js`, `admin-api.js`, `admin-ui.js`, `admin-scripts.js` in ordine)
    - Rigenerare bundle: `npm install` → `npm run build` → confermare `dist/admin.bundle.js`
  - Se indici/snapshot fossero incoerenti:
    - Usare le routine di invalidazione (`invalidateIndex('CLIENTI'|'PREN')`) e rilanciare la richiesta

## 3. Requisiti per la Migrazione (ASK)
- Specifiche tecniche del nuovo ambiente
  - Node.js ≥ 18 e npm ≥ 9
  - Rollup ≥ 4 (config in `rollup.config.js`)
  - Accesso a Cloudflare Workers (se il proxy resta su Workers)
  - Accesso al progetto Google Apps Script e alle Script Properties

- Dipendenze e prerequisiti
  - DevDependencies: `rollup`, `@rollup/plugin-node-resolve`
  - Runtime: nessuna dipendenza lato frontend oltre Bootstrap/FontAwesome CDN; lato backend Apps Script standard
  - CORS/CSP: configurazioni aggiornate su `admin.html` e headers nel Worker

- Procedure di verifica post‑migrazione
  - Frontend:
    - Aprire `docs/diagnostics.html` e lanciare “Esegui tutti i test”
    - Verificare KPI in “Riepilogo” (tempi medi, cache HIT/STALE/MISS, pass/fail)
  - Backend:
    - Testare endpoint `health`, `version`, `debugAuth`, `search` (clienti/veicoli/prenotazioni)
  - Proxy:
    - Controllare header `X-Proxy-Cache` e `__proxy.cache` (HIT/STALE/MISS)
  - Build:
    - Eseguire `npm install` e `npm run build` senza errori; confermare `dist/admin.bundle.js`

## 4. Checklist di Trasferimento
- Elementi da migrare
  - Codice backend: `backend/*` (Apps Script), inclusi `Auth.gs`, `Helpers.gs`, `EndpointsGet.gs`, `EndpointsPost.gs`, servizi
  - Proxy: `proxy-worker.js` (se migra l’infrastruttura Workers)
  - Frontend admin: `admin.html`, `shared-utils.js`, moduli (`admin-validation.js`, `admin-api.js`, `admin-ui.js`, `admin-scripts.js`), bundle `dist/admin.bundle.js`
  - Diagnostica: `docs/diagnostics.html`
  - Configurazioni: Script Properties (`SPREADSHEET_ID`, `TOKEN`, `TOKENS`), `vercel.json` se usato, `.clasp.json`
  - Dati: fogli Google (`PRENOTAZIONI`, `CLIENTI`, `PULMINI`, `MANUTENZIONI`)

- Sequenza temporale consigliata
  1. Freeze scritture in orario concordato (prenotazioni/clienti)
  2. Esportare configurazioni (Script Properties) e confermare accessi al nuovo ambiente
  3. Migrare codice backend e proxy; validare `health/version/debugAuth`
  4. Deploy frontend e bundle; aggiornare `admin.html`
  5. Verifiche diagnostiche e KPI; sblocco scritture

- Punti di verifica intermedi
  - `health` 200 OK e timestamp
  - `version` risponde con `CONFIG.VERSION`
  - `debugAuth` valida sessione admin
  - `search` restituisce risultati coerenti per `clienti`, `veicoli`, `prenotazioni`
  - Diagnostica: tempi prima chiamata ridotti (prewarm); cache HIT/STALE funzionanti

## Allegati Tecnici (Riferimenti File)
- Backend
  - `backend/Helpers.gs`: funzioni cache/indici/snapshot
  - `backend/EndpointsGet.gs`: endpoint `search`, supporto JSONP
  - `backend/ClientiService.gs`: aggiornamenti via `setValues`, utilizzo indici
  - `backend/PrenotazioniService.gs`: aggiornamenti via `setValues`, utilizzo indici
- Proxy
  - `proxy-worker.js`: prewarm, stale‑while‑revalidate, headers CORS/CSP
- Frontend Admin
  - `admin.html`: CSP e caricamento bundle
  - Moduli: `admin-validation.js`, `admin-api.js`, `admin-ui.js`, `admin-renderer.js`, `admin-scripts.js`, `admin-main.js`
  - `shared-utils.js`: `escapeHtml`, `parseDateAny`, `formatDateIT`, `secureGet/securePost`
  - `dist/admin.bundle.js` (build consolidato)
  - `diagnostics.html`: test + riepilogo KPI

## Esiti Test e Compatibilità
- Build: `npm run build` → OK, bundle aggiornato (`dist/admin.bundle.js`).
- UI: Navigazione sidebar, refresh, modali ICS/CSV, Clienti/Legacy, dashboard KPI → OK.
- Ordinamenti: Tabelle con `onclick` funzionanti tramite `window.set*Sort` definiti in `admin-ui.js`.
- API: Tutte le chiamate passano da `window.adminApi.callAPI` (wrapper `secureGet/securePost`).
- Proxy/Caching: conferma visiva tramite diagnostica (HIT/STALE/MISS) attesa come da prewarm e TTL.
- Globali esposti: `window.renderClienti`, `window.adminRenderer`, `window.loadAdminSection`, `window.showAdminGate`, `window.hasAdminSessionPresent`, `window.initAdminUIBindings`.
