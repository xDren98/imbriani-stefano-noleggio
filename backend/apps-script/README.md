# Google Apps Script (clasp) - Setup rapido

1) Requisiti una tantum
- Node.js LTS installato
- Account Google con accesso a Apps Script

2) Login clasp
npm run apps:login

3) Collega questo repo allo script (sostituisci lo scriptId)
- Apri script.google.com → progetto backend → Settings → Script ID → copia
- Apri .clasp.json e sostituisci REPLACE_WITH_YOUR_SCRIPT_ID

4) Allinea file locali con lo script (se già esiste del codice su GAS)
npm run apps:pull

5) Pubblica codice dal repo a Apps Script
npm run apps:push

6) Crea un nuovo deployment Web App
npm run apps:deploy

7) Apri lo script in browser
npm run apps:open

Note:
- Il codice da pubblicare è in backend/apps-script/ (Code.gs.mirror.js verrà caricato come Code.gs)
- appsscript.json è già configurato (V8, timezone Europe/Rome)
- Se cambi Spreadsheet ID o TOKEN, aggiorna backend/apps-script/Code.gs.mirror.js e ripeti push/deploy
