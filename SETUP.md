# Setup & Backend Update Guide

## Frontend Update
Run this PowerShell script to backup and download the latest working-stable files.

```powershell
$backupDir = "backup-current"
if (Test-Path $backupDir) { Remove-Item -Path $backupDir -Recurse -Force }
New-Item -ItemType Directory -Name $backupDir -Force | Out-Null
Get-ChildItem -File *.html,*.js,*.css -ErrorAction SilentlyContinue | Copy-Item -Destination $backupDir

$repo = "https://raw.githubusercontent.com/xDren98/imbriani-noleggio/working-stable/"
$files = @(
  "index.html","scripts.js","shared-utils.js","config.js","styles.css",
  "admin.html","admin-scripts.js","admin-styles.css","design-system.css"
)
foreach ($f in $files) {
  try { Invoke-WebRequest -Uri ($repo + $f) -OutFile $f -UseBasicParsing -ErrorAction Stop; Write-Host "✅ $f" -ForegroundColor Green } catch { Write-Host "⚠️ $f non trovato" -ForegroundColor Yellow }
}
```

## Apps Script Backend Update
Paste this into your Google Apps Script project to add Clients directory and API endpoints.

```javascript
// ===== CLIENTI SHEET CONFIG =====
const S_CLIENTI = 'Clienti';
function sheet(name){ return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name); }
function upsertClientRow(driver){
  const sh = sheet(S_CLIENTI); if (!sh) return {updated:false, reason:'Foglio Clienti mancante'};
  const header = sh.getDataRange().getValues()[0];
  const idx = {
    Nome: header.indexOf('Nome'),
    DataNascita: header.indexOf('Data di nascita'),
    LuogoNascita: header.indexOf('Luogo di nascita'),
    CF: header.indexOf('Codice fiscale'),
    Comune: header.indexOf('Comune di residenza'),
    Via: header.indexOf('Via di residenza'),
    Civico: header.indexOf('Civico di residenza'),
    Patente: header.indexOf('Numero di patente'),
    InizioPatente: header.indexOf('Data inizio validità patente'),
    ScadenzaPatente: header.indexOf('Scadenza patente'),
    Cellulare: header.indexOf('Cellulare'),
    Email: header.indexOf('Email')
  };
  const data = sh.getDataRange().getValues();
  let rowIndex = -1;
  for (let r=1;r<data.length;r++){
    if (String(data[r][idx.CF]||'').toUpperCase() === String(driver.CF||'').toUpperCase()) { rowIndex = r+1; break; }
  }
  const row = rowIndex>0 ? sh.getRange(rowIndex,1,1,header.length).getValues()[0] : new Array(header.length).fill('');
  function setIf(val, i){ if (i>=0 && val && String(val).trim()) row[i]=val; }
  setIf(driver.Nome, idx.Nome);
  setIf(driver.DataNascita, idx.DataNascita);
  setIf(driver.LuogoNascita, idx.LuogoNascita);
  setIf(driver.CF, idx.CF);
  setIf(driver.ComuneResidenza, idx.Comune);
  setIf(driver.ViaResidenza, idx.Via);
  setIf(driver.CivicoResidenza, idx.Civico);
  setIf(driver.NumeroPatente, idx.Patente);
  setIf(driver.InizioPatente, idx.InizioPatente);
  setIf(driver.ScadenzaPatente, idx.ScadenzaPatente);
  // Solo autista 1 ha contatto
  if (driver.isPrimary){ setIf(driver.Cellulare, idx.Cellulare); setIf(driver.Email, idx.Email); }
  if (rowIndex>0) { sh.getRange(rowIndex,1,1,header.length).setValues([row]); return {updated:true, created:false}; }
  sh.appendRow(row); return {updated:true, created:true};
}

// ====== NEW ACTIONS ======
function handleGetClienteByCF(q){
  const sh = sheet(S_CLIENTI); if (!sh) return err('Foglio Clienti mancante');
  const all = sh.getDataRange().getValues(); const header = all.shift();
  const idx = header.reduce((m, c, i)=> (m[c]=i,m), {});
  const cf = (q.cf||'').toUpperCase(); if (!cf) return err('CF mancante');
  for (const r of all){ if (String(r[idx['Codice fiscale']]||'').toUpperCase()===cf){
    return ok({
      Nome: r[idx['Nome']]||'', CF: cf,
      Email: r[idx['Email']]||'', Cellulare: r[idx['Cellulare']]||'',
      DataNascita: r[idx['Data di nascita']]||'', LuogoNascita: r[idx['Luogo di nascita']]||'',
      ComuneResidenza: r[idx['Comune di residenza']]||'', ViaResidenza: r[idx['Via di residenza']]||'', CivicoResidenza: r[idx['Civico di residenza']]||'',
      NumeroPatente: r[idx['Numero di patente']]||'', InizioPatente: r[idx['Data inizio validità patente']]||'', ScadenzaPatente: r[idx['Scadenza patente']]||''
    });
  }}
  return ok(null, 'Cliente non trovato');
}

function handleUpsertClienti(q){
  try{
    const drivers = q.drivers ? JSON.parse(decodeURIComponent(q.drivers)) : [];
    if (!drivers.length) return err('Nessun driver');
    drivers.forEach((d, i)=> upsertClientRow({...d, isPrimary: i===0}));
    return ok({count: drivers.length});
  }catch(e){ return err('Errore upsert: '+e); }
}

// Hook nel doGet
// case 'getClienteByCF': return handleGetClienteByCF(q);
// case 'upsertClienti': return handleUpsertClienti(q);

// Call upsert dopo creazione prenotazione
// In handleCreaPrenotazione, prima del return ok({id:newId}) aggiungi:
// try{ handleUpsertClienti({drivers: q.drivers}); }catch(_){}
```

## Uso lato frontend
- Dopo il login: chiama `getClienteByCF` e popola Autista 1 + Profilo. Se null, fallback su storico prenotazioni.
- Dopo `creaPrenotazione`: il backend esegue `upsertClienti` per aggiornare il foglio “Clienti”.

## Policy
- Autista 1: include Email/Cellulare.
- Autisti 2 e 3: nessun contatto, solo anagrafica e patente.
- Aggiornamento non distruttivo: non sovrascrivere campi con vuoto.
