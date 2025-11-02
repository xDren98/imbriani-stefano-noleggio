# Setup & Backend Update - FULL FILE REPLACEMENT

Questo file contiene il backend Apps Script COMPLETO da incollare interamente (sostituzione totale).

## Istruzioni
1. Apri il tuo progetto Google Apps Script.
2. Seleziona File > App Script principale (Code.gs).
3. Sostituisci TUTTO il contenuto con il codice qui sotto.
4. Deploy > New deployment (mantieni la stessa Web App URL e access). 

---

```javascript
// ====== CONFIGURAZIONE ======
const SHEET_ID = '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns';          // ← 🔑 incolla il tuo Sheet ID qui
const AUTH_TOKEN = 'imbriani_secret_2025';                                // ← deve combaciare col frontend
const TIMEZONE = 'Europe/Rome';

// Nomi fogli
const S_PRENOTAZIONI = 'Risposte del modulo 1';
const S_VEICOLI      = 'Gestione Pulmini';
const S_CLIENTI      = 'Clienti';

// ====== UTILS ======
function sheet(name){ return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name); }
function ok(data, message='Operazione completata'){ return json({ success:true, message, data }); }
function err(message, code=400){ return json({ success:false, message, code }); }
function json(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function today(fmt){ return Utilities.formatDate(new Date(), TIMEZONE, fmt||'yyyy-MM-dd'); }
function toISO(d){ if (!d) return ''; try{ const dt=new Date(d); if (!isNaN(dt)) return Utilities.formatDate(dt,TIMEZONE,'yyyy-MM-dd'); }catch(e){} return String(d||''); }

// ====== ENTRYPOINT ======
function doGet(e){
  try{
    const q = e.parameter || {};
    if (q.action === 'options') return ok(null, 'OK');
    if (q.token !== AUTH_TOKEN) return err('Unauthorized', 401);

    switch(q.action){
      // USER APIs
      case 'login':                 return handleLogin(q);
      case 'creaPrenotazione':      return handleCreaPrenotazione(q);
      case 'recuperaPrenotazioni':  return handleRecuperaPrenotazioni(q);
      case 'disponibilita':         return handleDisponibilita(q);
      case 'modificaStato':         return handleModificaStato(q);

      // ADMIN APIs
      case 'getAllBookings':        return handleGetAllBookings(q);
      case 'getAllVehicles':        return handleGetAllVehicles(q);
      case 'updateBookingStatus':   return handleUpdateBookingStatus(q);

      // CLIENTI APIs
      case 'getClienteByCF':        return handleGetClienteByCF(q);
      case 'upsertClienti':         return handleUpsertClienti(q);

      default: return err('Azione non supportata');
    }
  } catch(ex){
    Logger.log('doGet error: ' + ex.toString());
    return err('Errore server: ' + ex.toString());
  }
}

// ====== USER ACTIONS ======
function handleLogin(q){
  const cf = (q.cf||'').toUpperCase();
  if (!/^[A-Z0-9]{16}$/.test(cf)) return err('CF non valido');

  // 1) Prova da master Clienti
  const cli = getClienteFromMaster(cf);
  if (cli) return ok({ CF:cf, Nome:cli.Nome||'', Email:cli.Email||'', Cellulare:cli.Cellulare||'' });

  // 2) Fallback da storico prenotazioni (Nome/contatti minimi)
  const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
  const data = sh.getDataRange().getValues(); const header = data.shift();
  const idxCF = header.indexOf('Codice fiscale');
  for (const r of data){
    if ((r[idxCF]||'').toString().toUpperCase() === cf){
      return ok({ CF:cf, Nome: r[header.indexOf('Nome')]||'', Email: r[header.indexOf('Email')]||'', Cellulare: r[header.indexOf('Cellulare')]||'' });
    }
  }
  return ok({ CF: cf, Nome: '', Email: '', Cellulare: '' });
}

function handleCreaPrenotazione(q){
  const required = ['cf','dataRitiro','oraRitiro','dataConsegna','oraConsegna','targa','destinazione'];
  for (const k of required) if (!q[k]) return err('Parametro mancante: '+k);

  const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
  const data = sh.getDataRange().getValues(); const header = data.shift();
  const idxID = header.indexOf('ID prenotazione');

  // Nuovo ID progressivo (numerico); opzionale BOOK-YYYY-NNN nel rendering frontend
  let maxId = 0; for (const r of data){ const id = parseInt(r[idxID],10); if (!isNaN(id) && id > maxId) maxId = id; }
  const newId = maxId + 1;

  // Autisti multipli
  const drivers = q.drivers ? JSON.parse(decodeURIComponent(q.drivers)) : [];
  const d1 = drivers[0] || {}; const d2 = drivers[1] || {}; const d3 = drivers[2] || {};

  // Prepara riga secondo intestazioni reali
  const row = new Array(header.length).fill('');
  header.forEach((col, i) => {
    switch(col){
      case 'Informazioni cronologiche': row[i] = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); break;
      case 'Nome': row[i] = d1.Nome || ''; break;
      case 'Data di nascita': row[i] = toISO(d1.DataNascita); break;
      case 'Luogo di nascita': row[i] = d1.LuogoNascita || ''; break;
      case 'Codice fiscale': row[i] = (q.cf||'').toUpperCase(); break;
      case 'Comune di residenza': row[i] = d1.ComuneResidenza || ''; break;
      case 'Via di residenza': row[i] = d1.ViaResidenza || ''; break;
      case 'Civico di residenza': row[i] = d1.CivicoResidenza || ''; break;
      case 'Numero di patente': row[i] = d1.NumeroPatente || ''; break;
      case 'Data inizio validità patente': row[i] = toISO(d1.InizioPatente); break;
      case 'Scadenza patente': row[i] = toISO(d1.ScadenzaPatente); break;
      case 'Targa': row[i] = q.targa; break;
      case 'Ora inizio noleggio': row[i] = q.oraRitiro; break;
      case 'Ora fine noleggio': row[i] = q.oraConsegna; break;
      case 'Giorno inizio noleggio': row[i] = toISO(q.dataRitiro); break;
      case 'Giorno fine noleggio': row[i] = toISO(q.dataConsegna); break;
      case 'Destinazione': row[i] = q.destinazione; break;
      case 'Cellulare': row[i] = d1.Cellulare || ''; break;
      case 'Data contratto': row[i] = today(); break;

      case 'Nome Autista 2': row[i] = d2.Nome || ''; break;
      case 'Data di nascita Autista 2': row[i] = toISO(d2.DataNascita); break;
      case 'Luogo di nascita Autista 2': row[i] = d2.LuogoNascita || ''; break;
      case 'Codice fiscale Autista 2': row[i] = d2.CF || ''; break;
      case 'Numero di patente Autista 2': row[i] = d2.NumeroPatente || ''; break;
      case 'Scadenza patente Autista 2': row[i] = toISO(d2.ScadenzaPatente); break;

      case 'Nome Autista 3': row[i] = d3.Nome || ''; break;
      case 'Data di nascita Autista 3': row[i] = toISO(d3.DataNascita); break;
      case 'Luogo di nascita Autista 3': row[i] = d3.LuogoNascita || ''; break;
      case 'Codice fiscale Autista 3': row[i] = d3.CF || ''; break;
      case 'Numero di patente Autista 3': row[i] = d3.NumeroPatente || ''; break;
      case 'Scadenza patente Autista 3': row[i] = toISO(d3.ScadenzaPatente); break;

      case 'ID prenotazione': row[i] = newId; break;
      case 'Stato prenotazione': row[i] = 'Da confermare'; break;
      case 'Importo preventivo': row[i] = ''; break;
      case 'Email': row[i] = d1.Email || ''; break;
    }
  });

  sh.appendRow(row);

  // 🔁 Aggiorna master Clienti (merge non distruttivo)
  try {
    upsertClientRow({...d1, CF:(q.cf||'').toUpperCase(), isPrimary:true});
    if (d2?.CF) upsertClientRow({...d2, isPrimary:false});
    if (d3?.CF) upsertClientRow({...d3, isPrimary:false});
  } catch(e){ Logger.log('upsert clienti error: '+e); }

  return ok({ id:newId });
}

function handleRecuperaPrenotazioni(q){
  const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
  const all = sh.getDataRange().getValues(); const header = all.shift();
  let rows = all.map(r => ({
    ID: r[header.indexOf('ID prenotazione')] || '',
    CF: r[header.indexOf('Codice fiscale')] || '',
    DataRitiro: r[header.indexOf('Giorno inizio noleggio')] || '',
    OraRitiro: r[header.indexOf('Ora inizio noleggio')] || '',
    DataConsegna: r[header.indexOf('Giorno fine noleggio')] || '',
    OraConsegna: r[header.indexOf('Ora fine noleggio')] || '',
    Targa: r[header.indexOf('Targa')] || '',
    Destinazione: r[header.indexOf('Destinazione')] || '',
    Stato: r[header.indexOf('Stato prenotazione')] || 'Da Confermare',
    DataCreazione: r[header.indexOf('Data contratto')] || '',
    Nome: r[header.indexOf('Nome')] || '',
    Cellulare: r[header.indexOf('Cellulare')] || '',
    Email: r[header.indexOf('Email')] || ''
  }));

  if ((q.cf||'').toUpperCase() !== 'ALL'){
    const cf = (q.cf||'').toUpperCase();
    rows = rows.filter(r => (r.CF||'').toUpperCase() === cf);
  }
  if (q.stato){ rows = rows.filter(r => (r.Stato||'') === q.stato); }

  return ok(rows);
}

function handleDisponibilita(q){
  const sh = sheet(S_VEICOLI); if (!sh) return err('Foglio veicoli mancante');
  const data = sh.getDataRange().getValues(); const header = data.shift();
  const rows = data.map(r => ({
    Targa: r[header.indexOf('Targa')] || '',
    Marca: r[header.indexOf('Marca')] || '',
    Modello: r[header.indexOf('Modello')] || '',
    Posti: r[header.indexOf('Posti')] || '',
    Disponibile: String(r[header.indexOf('Stato')]||'').toLowerCase() === 'disponibile',
    Note: r[header.indexOf('Note')] || ''
  }));
  return ok(rows.filter(v => String(v.Posti)==='9' && v.Disponibile===true));
}

function handleModificaStato(q){
  const id = parseInt(q.id,10); const nuovo = q.stato||''; if (!id || !nuovo) return err('Parametri mancanti');
  const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
  const data = sh.getDataRange().getValues(); const header = data.shift();
  const idxID = header.indexOf('ID prenotazione'); const idxStato = header.indexOf('Stato prenotazione');
  for (let i=0;i<data.length;i++){
    const cur = parseInt(data[i][idxID],10);
    if (cur === id){ sh.getRange(i+2, idxStato+1).setValue(nuovo); return ok({ id, stato: nuovo }); }
  }
  return err('ID non trovato');
}

// ====== ADMIN APIs ======
function handleGetAllBookings(q){
  try {
    const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
    const data = sh.getDataRange().getValues(); if (data.length <= 1) return ok([]);
    const header = data.shift();
    const bookings = data.map(row => {
      const b = {};
      header.forEach((col, i) => {
        switch(col) {
          case 'ID prenotazione': b.ID = row[i]||''; break;
          case 'Informazioni cronologiche': b.DataCreazione = row[i]||''; break;
          case 'Nome': b.NomeCompleto = row[i]||''; break;
          case 'Codice fiscale': b.CF = row[i]||''; break;
          case 'Cellulare': b.Telefono = row[i]||''; break;
          case 'Email': b.Email = row[i]||''; break;
          case 'Giorno inizio noleggio': b.DataRitiro = row[i]||''; break;
          case 'Ora inizio noleggio': b.OraRitiro = row[i]||''; break;
          case 'Giorno fine noleggio': b.DataConsegna = row[i]||''; break;
          case 'Ora fine noleggio': b.OraConsegna = row[i]||''; break;
          case 'Destinazione': b.Destinazione = row[i]||''; break;
          case 'Targa': b.Targa = row[i]||''; break;
          case 'Stato prenotazione': b.Stato = row[i]||'Da confermare'; break;
          default: b[col] = row[i]||''; break;
        }
      });
      return b;
    }).filter(b => b.ID);
    return ok(bookings);
  } catch (error) { Logger.log('getAllBookings error: ' + error.toString()); return err('Errore caricamento prenotazioni admin'); }
}

function handleGetAllVehicles(q){
  try {
    const sh = sheet(S_VEICOLI); if (!sh) return err('Foglio veicoli mancante');
    const data = sh.getDataRange().getValues(); if (data.length <= 1) return ok([]);
    const header = data.shift();
    const vehicles = data.map(row => { const v={}; header.forEach((c,i)=> v[c]=row[i]||''); return v; }).filter(v => v.Targa);
    return ok(vehicles);
  } catch (error) { Logger.log('getAllVehicles error: ' + error.toString()); return err('Errore caricamento veicoli admin'); }
}

function handleUpdateBookingStatus(q){
  try {
    const id = q.id; const status = q.status; if (!id || !status) return err('Parametri mancanti: id, status');
    const sh = sheet(S_PRENOTAZIONI); if (!sh) return err('Foglio prenotazioni mancante');
    const data = sh.getDataRange().getValues(); if (data.length <= 1) return err('Nessuna prenotazione trovata');
    const header = data[0]; const idIndex = header.indexOf('ID prenotazione'); const statusIndex = header.indexOf('Stato prenotazione');
    if (idIndex === -1 || statusIndex === -1) return err('Colonne ID o Stato non trovate');
    for (let i=1; i<data.length; i++){
      if (String(data[i][idIndex]) === String(id)){
        sh.getRange(i + 1, statusIndex + 1).setValue(status);
        const updateIndex = header.indexOf('Data aggiornamento'); if (updateIndex !== -1){ sh.getRange(i + 1, updateIndex + 1).setValue(today('yyyy-MM-dd HH:mm:ss')); }
        return ok({ id, status, message: `Prenotazione ${id} aggiornata a: ${status}` });
      }
    }
    return err(`Prenotazione ${id} non trovata`);
  } catch (error) { Logger.log('updateBookingStatus error: ' + error.toString()); return err('Errore aggiornamento stato'); }
}

// ====== CLIENTI (MASTER) ======
function getClienteFromMaster(cf){
  const sh = sheet(S_CLIENTI); if (!sh) return null;
  const all = sh.getDataRange().getValues(); const header = all.shift();
  const idx = header.reduce((m,c,i)=> (m[c]=i,m),{});
  for (const r of all){
    if (String(r[idx['Codice fiscale']]||'').toUpperCase() === cf){
      return {
        Nome: r[idx['Nome']]||'', CF: cf,
        Email: r[idx['Email']]||'', Cellulare: r[idx['Cellulare']]||'',
        DataNascita: r[idx['Data di nascita']]||'', LuogoNascita: r[idx['Luogo di nascita']]||'',
        ComuneResidenza: r[idx['Comune di residenza']]||'', ViaResidenza: r[idx['Via di residenza']]||'', CivicoResidenza: r[idx['Civico di residenza']]||'',
        NumeroPatente: r[idx['Numero di patente']]||'', InizioPatente: r[idx['Data inizio validità patente']]||'', ScadenzaPatente: r[idx['Scadenza patente']]||''
      };
    }
  }
  return null;
}

function upsertClientRow(driver){
  const sh = sheet(S_CLIENTI); if (!sh) throw new Error('Foglio Clienti mancante');
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
  setIf(toISO(driver.DataNascita), idx.DataNascita);
  setIf(driver.LuogoNascita, idx.LuogoNascita);
  setIf(driver.CF, idx.CF);
  setIf(driver.ComuneResidenza, idx.Comune);
  setIf(driver.ViaResidenza, idx.Via);
  setIf(driver.CivicoResidenza, idx.Civico);
  setIf(driver.NumeroPatente, idx.Patente);
  setIf(toISO(driver.InizioPatente), idx.InizioPatente);
  setIf(toISO(driver.ScadenzaPatente), idx.ScadenzaPatente);
  if (driver.isPrimary){ setIf(driver.Cellulare, idx.Cellulare); setIf(driver.Email, idx.Email); }
  if (rowIndex>0) { sh.getRange(rowIndex,1,1,header.length).setValues([row]); return {updated:true, created:false}; }
  sh.appendRow(row); return {updated:true, created:true};
}

function handleGetClienteByCF(q){
  const cf = (q.cf||'').toUpperCase(); if (!cf) return err('CF mancante');
  const c = getClienteFromMaster(cf); return ok(c || null, c? 'OK':'Cliente non trovato');
}

function handleUpsertClienti(q){
  try{
    const drivers = q.drivers ? JSON.parse(decodeURIComponent(q.drivers)) : [];
    if (!drivers.length) return err('Nessun driver');
    drivers.forEach((d, i)=> upsertClientRow({...d, isPrimary: i===0}));
    return ok({count: drivers.length});
  }catch(e){ return err('Errore upsert: '+e); }
}
```

---

Note:
- Gli orari e le date vengono salvati in ISO (yyyy-MM-dd) nel foglio, mentre il frontend li mostra in formato italiano.
- Autista 1 mantiene Email/Cellulare; autisti 2/3 senza contatti.
- Merge non distruttivo sul foglio Clienti (mai sovrascrivere con vuoti).
```
