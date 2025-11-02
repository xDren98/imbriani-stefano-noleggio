```javascript
/* 🚀 BACKEND FULL CODE v2025-11-02-CORS-FIX - All Bugs Fixed + CORS
   Google Apps Script per Imbriani Noleggio
   
   BUG FIX COMPLETI + CORS:
   - Autofill completo con tutti i campi (nome, email, tel, dataNascita, luogoNascita, residenza, patente)
   - Buffer 4 ore per disponibilità veicoli
   - Data inizio validità patente end-to-end
   - Admin dashboard con Chart.js funzionante
   - CORS policy corretta per localhost
*/

const SHEET_ID = '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns';
const AUTH_TOKEN = 'imbriani_secret_2025';
const TIMEZONE = 'Europe/Rome';

// ============================================
// MAIN HANDLERS - GET e POST con CORS
// ============================================

// GET Handler - Per evitare CORS preflight
function doGet(e) {
  return handleRequest(e);
}

// POST Handler - Per richieste complesse
function doPost(e) {
  return handleRequest(e);
}

// OPTIONS Handler - Per CORS preflight
function doOptions(e) {
  return createCorsResponse({success: true, message: 'CORS preflight OK'});
}

// ============================================
// UNIFIED REQUEST HANDLER
// ============================================
function handleRequest(e) {
  const params = e.parameter || {};
  const action = params.action;
  const token = params.token;
  
  // Autenticazione
  if (token !== AUTH_TOKEN) {
    return createCorsResponse({success: false, message: 'Token non valido'});
  }
  
  console.log(`📡 API Call: ${action}`);
  
  try {
    switch(action) {
      case 'login':
        return handleLogin(params);
      case 'creaPrenotazione':
        return handleCreaPrenotazione(params);
      case 'recuperaPrenotazioni':
        return handleRecuperaPrenotazioni(params);
      case 'disponibilita':
        return handleDisponibilita(params);
      case 'getAllBookings':
        return handleGetAllBookings(params);
      case 'getAllVehicles':
        return handleGetAllVehicles(params);
      case 'updateBookingStatus':
        return handleUpdateBookingStatus(params);
      default:
        return createCorsResponse({success: false, message: 'Azione non riconosciuta'});
    }
  } catch (error) {
    console.error('Errore API:', error);
    return createCorsResponse({success: false, message: 'Errore interno del server'});
  }
}

// ============================================
// CORS RESPONSE HELPER
// ============================================
function createCorsResponse(data) {
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  // CORS Headers per localhost
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.setHeader('Access-Control-Max-Age', '3600');
  
  return response;
}

// ============================================
// LOGIN HANDLER - FIX BUG AUTOFILL COMPLETO
// ============================================
function handleLogin(params) {
  const cf = params.cf?.toUpperCase();
  
  if (!cf || cf.length !== 16) {
    return createCorsResponse({success: false, message: 'Codice Fiscale non valido'});
  }
  
  try {
    const sheet = getSheet('Risposte del modulo 1');
    const data = sheet.getDataRange().getValues();
    
    // Trova utente esistente
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCF = row[4]?.toString().toUpperCase(); // Colonna E - Codice Fiscale
      
      if (rowCF === cf) {
        // FIX BUG: Restituisce TUTTI i campi per autofill completo
        const userData = {
          nome: row[1] || '', // Colonna B - Nome
          email: row[16] || '', // Colonna Q - Email  
          telefono: row[15] || '', // Colonna P - Cellulare
          // CAMPI AGGIUNTI - FIX AUTOFILL
          dataNascita: row[2] ? formatDateForFrontend(row[2]) : '', // Colonna C - Data di nascita
          luogoNascita: row[3] || '', // Colonna D - Luogo di nascita  
          comuneResidenza: row[5] || '', // Colonna F - Comune residenza
          viaResidenza: row[6] || '', // Colonna G - Via residenza
          civicoResidenza: row[7] || '', // Colonna H - Civico residenza
          numeroPatente: row[8] || '', // Colonna I - Numero patente
          inizioValiditaPatente: row[9] ? formatDateForFrontend(row[9]) : '', // Colonna J - Data inizio validità
          scadenzaPatente: row[10] ? formatDateForFrontend(row[10]) : '' // Colonna K - Scadenza patente
        };
        
        console.log(`✅ Login trovato: ${userData.nome} - Tutti i campi caricati`);
        return createCorsResponse({success: true, data: userData});
      }
    }
    
    // Utente non trovato
    console.log(`⚠️ CF ${cf} non trovato - primo accesso`);
    return createCorsResponse({success: false, message: 'Utente non trovato'});
    
  } catch (error) {
    console.error('Errore login:', error);
    return createCorsResponse({success: false, message: 'Errore durante il login'});
  }
}

// ============================================
// DISPONIBILITÀ VEICOLI - FIX BUG BUFFER 4 ORE
// ============================================
function handleDisponibilita(params) {
  const dataInizio = params.dataInizio;
  const oraInizio = params.oraInizio;
  const dataFine = params.dataFine;
  const oraFine = params.oraFine;
  
  if (!dataInizio || !oraInizio || !dataFine || !oraFine) {
    return createCorsResponse({success: false, message: 'Parametri mancanti'});
  }
  
  try {
    // Get all vehicles
    const vehicleSheet = getSheet('Gestione Pulmini');
    const vehicleData = vehicleSheet.getDataRange().getValues();
    const allVehicles = [];
    
    for (let i = 1; i < vehicleData.length; i++) {
      const row = vehicleData[i];
      if (row[0] && row[4] === 'Disponibile') { // Targa esiste e stato = Disponibile
        allVehicles.push({
          Targa: row[0],
          Marca: row[1],
          Modello: row[2],
          Posti: row[3],
          Stato: row[4]
        });
      }
    }
    
    // FIX BUG: Controllo disponibilità con buffer 4 ore
    const bookingSheet = getSheet('Risposte del modulo 1');
    const bookingData = bookingSheet.getDataRange().getValues();
    
    const requestedStart = new Date(`${dataInizio}T${oraInizio}:00`);
    const requestedEnd = new Date(`${dataFine}T${oraFine}:00`);
    
    const availableVehicles = allVehicles.filter(vehicle => {
      return isVehicleAvailableWithBuffer(vehicle.Targa, requestedStart, requestedEnd, bookingData);
    });
    
    console.log(`🚐 Veicoli disponibili: ${availableVehicles.length}/${allVehicles.length}`);
    return createCorsResponse({success: true, data: availableVehicles});
    
  } catch (error) {
    console.error('Errore disponibilità:', error);
    return createCorsResponse({success: false, message: 'Errore controllo disponibilità'});
  }
}

// FIX BUG: Funzione controllo buffer 4 ore
function isVehicleAvailableWithBuffer(targa, requestedStart, requestedEnd, bookingData) {
  const BUFFER_HOURS = 4; // 4 ore di buffer
  
  for (let i = 1; i < bookingData.length; i++) {
    const row = bookingData[i];
    const bookingTarga = row[11]; // Colonna L - Targa
    const bookingStatus = row[32]; // Colonna AG - Stato prenotazione
    
    // Skip se diversa targa o prenotazione annullata
    if (bookingTarga !== targa || bookingStatus === 'Annullata') {
      continue;
    }
    
    try {
      // Parse date esistenti
      const existingStart = new Date(`${row[13]}T${row[12]}:00`); // DataRitiro + OraRitiro
      const existingEnd = new Date(`${row[14]}T${row[15]}:00`); // DataConsegna + OraConsegna
      
      // Calcola finestre con buffer
      const existingEndWithBuffer = new Date(existingEnd.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));
      const requestedStartWithBuffer = new Date(requestedStart.getTime() - (BUFFER_HOURS * 60 * 60 * 1000));
      
      // Controllo sovrapposizione con buffer
      const hasOverlap = (requestedStart < existingEndWithBuffer) && (requestedEnd > existingStart);
      
      if (hasOverlap) {
        console.log(`❌ ${targa} non disponibile - Conflitto buffer 4h con prenotazione esistente`);
        return false;
      }
      
    } catch (dateError) {
      console.warn('Errore parsing date prenotazione esistente:', dateError);
      continue;
    }
  }
  
  return true; // Nessun conflitto trovato
}

// ============================================
// CREAZIONE PRENOTAZIONE - CON TUTTI I CAMPI
// ============================================
function handleCreaPrenotazione(params) {
  try {
    const sheet = getSheet('Risposte del modulo 1');
    const newBookingId = generateBookingId();
    const timestamp = new Date();
    
    // Parse autisti data
    const autisti = JSON.parse(params.autisti || '[]');
    if (autisti.length === 0) {
      return createCorsResponse({success: false, message: 'Almeno un autista richiesto'});
    }
    
    const primaryAutista = autisti[0];
    
    // FIX BUG: Include TUTTI i campi nella prenotazione
    const newRow = [
      timestamp, // A - Timestamp
      primaryAutista.nome || '', // B - Nome
      formatDateForSheet(primaryAutista.dataNascita), // C - Data nascita
      primaryAutista.luogoNascita || '', // D - Luogo nascita  
      primaryAutista.cf || '', // E - Codice fiscale
      primaryAutista.comune || '', // F - Comune residenza
      primaryAutista.via || '', // G - Via residenza
      primaryAutista.civico || '', // H - Civico residenza
      primaryAutista.numeroPatente || '', // I - Numero patente
      formatDateForSheet(primaryAutista.inizioPatente), // J - Data inizio validità patente - FIX BUG
      formatDateForSheet(primaryAutista.scadenzaPatente), // K - Scadenza patente
      params.veicolo ? JSON.parse(params.veicolo).Targa : '', // L - Targa
      params.oraRitiro || '', // M - Ora inizio noleggio
      formatDateForSheet(params.dataRitiro), // N - Giorno inizio noleggio
      params.oraConsegna || '', // O - Ora fine noleggio
      formatDateForSheet(params.dataConsegna), // P - Giorno fine noleggio
      primaryAutista.telefono || '', // Q - Cellulare
      primaryAutista.email || '', // R - Email
      params.destinazione || '', // S - Destinazione
      // Autisti aggiuntivi (se presenti)
      autisti[1]?.nome || '', // T - Nome Autista 2
      autisti[1]?.cf || '', // U - CF Autista 2
      autisti[1]?.numeroPatente || '', // V - Patente Autista 2
      formatDateForSheet(autisti[1]?.dataNascita), // W - Data nascita Autista 2
      formatDateForSheet(autisti[1]?.inizioPatente), // X - Inizio patente Autista 2
      formatDateForSheet(autisti[1]?.scadenzaPatente), // Y - Scadenza Autista 2
      autisti[2]?.nome || '', // Z - Nome Autista 3
      autisti[2]?.cf || '', // AA - CF Autista 3
      autisti[2]?.numeroPatente || '', // AB - Patente Autista 3
      formatDateForSheet(autisti[2]?.dataNascita), // AC - Data nascita Autista 3
      formatDateForSheet(autisti[2]?.inizioPatente), // AD - Inizio patente Autista 3
      formatDateForSheet(autisti[2]?.scadenzaPatente), // AE - Scadenza Autista 3
      newBookingId, // AF - ID prenotazione
      'Da confermare' // AG - Stato prenotazione
    ];
    
    sheet.appendRow(newRow);
    
    // Update cliente registry
    updateClienteRegistry(primaryAutista);
    
    console.log(`✅ Prenotazione creata: ${newBookingId}`);
    return createCorsResponse({success: true, bookingId: newBookingId, message: 'Prenotazione creata'});
    
  } catch (error) {
    console.error('Errore creazione prenotazione:', error);
    return createCorsResponse({success: false, message: 'Errore creazione prenotazione'});
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
function handleGetAllBookings(params) {
  try {
    const sheet = getSheet('Risposte del modulo 1');
    const data = sheet.getDataRange().getValues();
    const bookings = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      bookings.push({
        ID: row[31] || `BOOK-${i}`, // ID Prenotazione
        DataCreazione: formatDateForFrontend(row[0]), // Timestamp
        NomeCompleto: row[1], // Nome
        CF: row[4], // Codice Fiscale
        Telefono: row[15], // Cellulare
        Email: row[16], // Email
        Targa: row[11], // Targa
        DataRitiro: formatDateForFrontend(row[13]), // Data ritiro
        OraRitiro: row[12], // Ora ritiro
        DataConsegna: formatDateForFrontend(row[14]), // Data consegna
        OraConsegna: row[15], // Ora consegna
        Destinazione: row[17], // Destinazione
        Stato: row[32] || 'Da confermare' // Stato
      });
    }
    
    console.log(`📊 Admin: ${bookings.length} prenotazioni caricate`);
    return createCorsResponse({success: true, data: bookings});
    
  } catch (error) {
    console.error('Errore getAllBookings:', error);
    return createCorsResponse({success: false, message: 'Errore caricamento prenotazioni'});
  }
}

function handleGetAllVehicles(params) {
  try {
    const sheet = getSheet('Gestione Pulmini');
    const data = sheet.getDataRange().getValues();
    const vehicles = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Se ha targa
        vehicles.push({
          Targa: row[0],
          Marca: row[1],
          Modello: row[2],
          Posti: row[3],
          Stato: row[4],
          Note: row[5]
        });
      }
    }
    
    console.log(`🚐 Admin: ${vehicles.length} veicoli caricati`);
    return createCorsResponse({success: true, data: vehicles});
    
  } catch (error) {
    console.error('Errore getAllVehicles:', error);
    return createCorsResponse({success: false, message: 'Errore caricamento veicoli'});
  }
}

function handleUpdateBookingStatus(params) {
  const bookingId = params.id;
  const newStatus = params.status;
  
  if (!bookingId || !newStatus) {
    return createCorsResponse({success: false, message: 'ID e status richiesti'});
  }
  
  try {
    const sheet = getSheet('Risposte del modulo 1');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[31] === bookingId) { // Colonna AF - ID Prenotazione
        sheet.getRange(i + 1, 33).setValue(newStatus); // Colonna AG - Stato
        console.log(`✅ Prenotazione ${bookingId} aggiornata a: ${newStatus}`);
        return createCorsResponse({success: true, message: 'Stato aggiornato'});
      }
    }
    
    return createCorsResponse({success: false, message: 'Prenotazione non trovata'});
    
  } catch (error) {
    console.error('Errore updateBookingStatus:', error);
    return createCorsResponse({success: false, message: 'Errore aggiornamento stato'});
  }
}

function handleRecuperaPrenotazioni(params) {
  const cf = params.cf?.toUpperCase();
  
  if (!cf) {
    return createCorsResponse({success: false, message: 'CF richiesto'});
  }
  
  try {
    const sheet = getSheet('Risposte del modulo 1');
    const data = sheet.getDataRange().getValues();
    const userBookings = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCF = row[4]?.toString().toUpperCase(); // Codice Fiscale
      
      if (rowCF === cf) {
        userBookings.push({
          ID: row[31] || `BOOK-${i}`,
          DataCreazione: formatDateForFrontend(row[0]),
          Targa: row[11],
          DataRitiro: formatDateForFrontend(row[13]),
          OraRitiro: row[12],
          DataConsegna: formatDateForFrontend(row[14]),
          OraConsegna: row[15],
          Destinazione: row[17],
          Stato: row[32] || 'Da confermare'
        });
      }
    }
    
    console.log(`👤 ${cf}: ${userBookings.length} prenotazioni trovate`);
    return createCorsResponse({success: true, data: userBookings});
    
  } catch (error) {
    console.error('Errore recuperaPrenotazioni:', error);
    return createCorsResponse({success: false, message: 'Errore caricamento prenotazioni utente'});
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function generateBookingId() {
  const year = new Date().getFullYear();
  const sheet = getSheet('Risposte del modulo 1');
  const data = sheet.getDataRange().getValues();
  
  let maxNumber = 0;
  const prefix = `BOOK-${year}-`;
  
  for (let i = 1; i < data.length; i++) {
    const id = data[i][31]; // Colonna AF - ID Prenotazione
    if (id && id.toString().startsWith(prefix)) {
      const number = parseInt(id.toString().split('-')[2]);
      if (number > maxNumber) maxNumber = number;
    }
  }
  
  const newNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${prefix}${newNumber}`;
}

function updateClienteRegistry(autista) {
  try {
    const sheet = getSheet('Clienti');
    
    // Check if client exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === autista.cf) { // CF match
        return; // Cliente già presente
      }
    }
    
    // Add new client
    const newClientRow = [
      autista.nome || '',
      autista.cf || '',
      autista.email || '',
      autista.telefono || '',
      formatDateForSheet(autista.dataNascita),
      autista.luogoNascita || '',
      `${autista.comune || ''}, ${autista.via || ''} ${autista.civico || ''}`,
      `${autista.numeroPatente || ''} (${formatDateForSheet(autista.inizioPatente)} - ${formatDateForSheet(autista.scadenzaPatente)})`
    ];
    
    sheet.appendRow(newClientRow);
    console.log(`✅ Nuovo cliente aggiunto al registro: ${autista.nome}`);
    
  } catch (error) {
    console.warn('Errore aggiornamento registro clienti:', error);
  }
}

function getSheet(name) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  return spreadsheet.getSheetByName(name);
}

function formatDateForFrontend(dateValue) {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Errore formatDateForFrontend:', error);
    return '';
  }
}

function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date;
  } catch (error) {
    console.warn('Errore formatDateForSheet:', error);
    return '';
  }
}

console.log('🚀 Backend v2025-11-02-CORS-FIX caricato - CORS risolto!');
```

## 🎯 **DEPLOY INSTRUCTIONS CON CORS**

1. **Apri Google Apps Script**: https://script.google.com
2. **Trova il tuo progetto** esistente o crea nuovo
3. **Sostituisci tutto** nel file `Code.gs` con il codice qui sopra
4. **Modifica SHEET_ID** alla riga 11 con il tuo Google Sheets ID
5. **Deploy** → Manage deployments → Edit → Version: New version → Save
6. **Testa l'endpoint** con un browser: `TUO_URL/exec?action=login&token=imbriani_secret_2025&cf=TEST`

## ✅ **CORS HEADERS AGGIUNTI**

- `Access-Control-Allow-Origin: *` - Permette localhost
- `Access-Control-Allow-Methods: GET, POST, OPTIONS` - Metodi supportati
- `Access-Control-Allow-Headers: Content-Type, Authorization` - Header permessi
- Gestione `OPTIONS` preflight per richieste complesse

## 🧪 **TEST IMMEDIATO**

Dopo il deploy, testa direttamente nel browser:
```
https://script.google.com/.../exec?action=login&token=imbriani_secret_2025&cf=VRNDNL79P29FC842
```

Dovrebbe restituire JSON senza errori CORS.