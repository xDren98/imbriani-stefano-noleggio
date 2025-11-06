/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.6 * - Email cliente inviate con mittente forzato: imbrianistefanonoleggio@gmail.com
 * - Nessun reply-to
 * - Nessun riferimento a preventivi/importi nelle email al cliente
 * - Endpoint testEmail e trigger giornaliero reminder
 * - FIX: token letto da Authorization header (POST via proxy), query e body
 * - FEAT: ID prenotazioni dinamico formato BOOK-ANNO-xxx
 * - FEAT: Census prenotazioni esistenti con assegnazione ID mancanti
 * - FIX v8.6: Disponibilita veicoli basata su date manutenzione, non solo stato
 */

const CONFIG = {
  VERSION: '8.6',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  SHEETS: { PRENOTAZIONI: 'PRENOTAZIONI', PULMINI: 'PULMINI', CLIENTI: 'CLIENTI', MANUTENZIONI: 'MANUTENZIONI' },
  PRENOTAZIONI_COLS: {
    TIMESTAMP:1,NOME_AUTISTA_1:2,DATA_NASCITA_AUTISTA_1:3,LUOGO_NASCITA_AUTISTA_1:4,CODICE_FISCALE_AUTISTA_1:5,
    COMUNE_RESIDENZA_AUTISTA_1:6,VIA_RESIDENZA_AUTISTA_1:7,CIVICO_RESIDENZA_AUTISTA_1:8,NUMERO_PATENTE_AUTISTA_1:9,
    DATA_INIZIO_PATENTE_AUTISTA_1:10,SCADENZA_PATENTE_AUTISTA_1:11,TARGA:12,ORA_INIZIO:13,ORA_FINE:14,GIORNO_INIZIO:15,GIORNO_FINE:16,
    DESTINAZIONE:17,CELLULARE:18,DATA_CONTRATTO:19,NOME_AUTISTA_2:20,DATA_NASCITA_AUTISTA_2:21,LUOGO_NASCITA_AUTISTA_2:22,
    CODICE_FISCALE_AUTISTA_2:23,COMUNE_RESIDENZA_AUTISTA_2:24,VIA_RESIDENZA_AUTISTA_2:25,CIVICO_RESIDENZA_AUTISTA_2:26,
    NUMERO_PATENTE_AUTISTA_2:27,DATA_INIZIO_PATENTE_AUTISTA_2:28,SCADENZA_PATENTE_AUTISTA_2:29,NOME_AUTISTA_3:30,
    DATA_NASCITA_AUTISTA_3:31,LUOGO_NASCITA_AUTISTA_3:32,CODICE_FISCALE_AUTISTA_3:33,COMUNE_RESIDENZA_AUTISTA_3:34,
    VIA_RESIDENZA_AUTISTA_3:35,CIVICO_RESIDENZA_AUTISTA_3:36,NUMERO_PATENTE_AUTISTA_3:37,DATA_INIZIO_PATENTE_AUTISTA_3:38,
    SCADENZA_PATENTE_AUTISTA_3:39,ID_PRENOTAZIONE:40,STATO_PRENOTAZIONE:41,IMPORTO_PREVENTIVO:42,EMAIL:43,TEST:44
  },
  CLIENTI_COLS: { NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CODICE_FISCALE:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,DATA_INIZIO_PATENTE:9,SCADENZA_PATENTE:10,CELLULARE:11,EMAIL:12 },
  PULMINI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,NOTE:6 },
  MANUTENZIONI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,DATA_INIZIO:6,DATA_FINE:7,COSTO:8,NOTE:9 },
  TELEGRAM: { BOT_TOKEN: '8029941478:AAGR808kmlCeyw5j5joJn0T_MLKL25qwM0o', CHAT_ID: '203195623' },
  EMAIL: {
    FROM_NAME: 'Imbriani Stefano Noleggio',
    FROM_EMAIL: 'imbrianistefanonoleggio@gmail.com'
  }
};

function createJsonResponse(data,status){
  var s=status||200;
  var resp=data; resp.timestamp=new Date().toISOString(); resp.version=CONFIG.VERSION; resp.status=s;
  return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
}
function validateToken(t){ return t===CONFIG.TOKEN; }

// Token robusto: query -> headers (lowercase) -> body
function getAuthHeader(e) {
  // 1) Query string param (GET/test manuali)
  if (e && e.parameter && e.parameter.Authorization) {
    return e.parameter.Authorization.replace('Bearer ', '');
  }
  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token);
  }

  // 2) Body JSON fallback (proxy inserisce il token qui)
  try {
    if (e && e.postData && e.postData.contents) {
      const payload = JSON.parse(e.postData.contents || '{}');
      if (payload.token) return String(payload.token);
      if (payload.AUTH_TOKEN) return String(payload.AUTH_TOKEN);
    }
  } catch (_) {}

  return null;
}

// Genera ID prenotazione dinamico: BOOK-ANNO-xxx
function generaNuovoIdBooking() {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    // Anno corrente
    var annoCorrente = new Date().getFullYear();
    var prefisso = 'BOOK-' + annoCorrente + '-';
    
    // Trova il progressivo più alto per l'anno corrente
    var maxProgressivo = 0;
    for (var i = 1; i < data.length; i++) {
      var id = String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '');
      if (id.startsWith(prefisso)) {
        var numero = parseInt(id.replace(prefisso, ''), 10);
        if (!isNaN(numero) && numero > maxProgressivo) {
          maxProgressivo = numero;
        }
      }
    }
    
    // Prossimo ID disponibile per l'anno corrente
    var nuovoProgressivo = maxProgressivo + 1;
    return prefisso + String(nuovoProgressivo).padStart(3, '0');
    
  } catch (error) {
    // Fallback in caso di errore
    var anno = new Date().getFullYear();
    return 'BOOK-' + anno + '-' + String(Date.now()).slice(-3);
  }
}

function versionInfo(){
  return {
    success: true,
    service: 'imbriani-backend',
    version: CONFIG.VERSION,
    features: [
      'stato_default_in_attesa','notifica_telegram_admin','endpoint_notifyTest','health_getVeicoli_getPrenotazioni',
      'checkDisponibilita_updateStatiLive','getSheet_handleLogin_creaPrenotazione','aggiornaCliente_sincronizzaClienti',
      'email_mittente_gmail_forzato','email_conferma_cliente','email_conferma_stato','email_reminder_3giorni','trigger_giornaliero',
      'auth_header_body_fallback','booking_id_dinamico_anno','census_prenotazioni_esistenti'
    ],
    time: new Date().toISOString()
  };
}

function doGet(e){
  var p=(e&&e.parameter)?e.parameter:{}; 
  var action=p.action||'health';
  try{
    if (action==='version')
      return ContentService.createTextOutput(JSON.stringify(versionInfo())).setMimeType(ContentService.MimeType.JSON);
    if (action==='health')
      return createJsonResponse({ success:true, service:'imbriani-backend', spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:['PRENOTAZIONI','PULMINI','CLIENTI','MANUTENZIONI'], action:'health_supported' });

    // Token da header/query/body
    var token = getAuthHeader(e);
    if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);

    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(p);
      case 'updateStatiLive': return updateStatiLive();
      case 'getSheet': return getSheetGeneric(p);
      case 'sincronizzaClienti': return sincronizzaClienti();
      case 'checkReminders': return checkReminderEmails();
      case 'assegnaId': return assegnaIdPrenotazioniEsistenti();
      case 'notifyTest': 
        var demo={ targa:'TEST123', giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10), oraInizio:'09:00', oraFine:'12:00', destinazione:'Test Destinazione', autista1:{ nomeCompleto:'Mario Test', codiceFiscale:'TSTMRA85M01H501Z', cellulare:'3330000000' }, email:'test@example.com' };
        inviaNotificaTelegram(demo);
        return createJsonResponse({success:true,message:'Notifica Telegram inviata (test)'});
      case 'testEmail':
        var to = p.to || 'melloanto@icloud.com';
        var demo2={
          idPrenotazione:'BOOK-2025-999', targa:'TEST123',
          giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10),
          oraInizio:'09:00', oraFine:'12:00', destinazione:'Test', email:to, autista1:{nomeCompleto:'Test Client'}
        };
        inviaEmailConfermaCliente(demo2);
        return createJsonResponse({success:true,message:'Email di test inviata a '+to});
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);
    }
  }catch(err){
    return createJsonResponse({success:false,message:'Errore server: '+err.message},500);
  }
}

function doPost(e){
  try{
    var post={};
    try{ post=JSON.parse(e&&e.postData?(e.postData.contents||'{}'):'{}'); }
    catch(_){ return createJsonResponse({success:false,message:'Invalid JSON in request body'},400); }

    var action=post.action||'login';
    // Token da header/body/query centralizzato
    var finalToken = getAuthHeader(e);

    if (action==='login') return handleLogin(post, finalToken);
    if (!validateToken(finalToken)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);

    switch(action){
      case 'getPrenotazioni': return getPrenotazioni();
      case 'getVeicoli': return getVeicoli();
      case 'creaPrenotazione': return creaPrenotazione(post);
      case 'aggiornaStato': return aggiornaStatoPrenotazione(post);
      case 'setManutenzione': return (typeof setManutenzione==='function')?setManutenzione(post):createJsonResponse({success:false,message:'setManutenzione non implementata'},400);
      case 'aggiornaCliente': return aggiornaCliente(post);
      case 'sincronizzaClienti': return sincronizzaClienti();
      case 'checkReminders': return checkReminderEmails();
      case 'assegnaId': return assegnaIdPrenotazioniEsistenti();
      default: return createJsonResponse({success:false,message:'Azione POST non supportata: '+action},400);
    }
  }catch(err){
    return createJsonResponse({success:false,message:'Errore POST: '+err.message},500);
  }
}

function getSheetGeneric(p){
  try{
    var name=p.name; if (!name) return createJsonResponse({success:false,message:'Parametro name mancante'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
    if (!sh) return createJsonResponse({success:false,message:'Foglio non trovato: '+name},404);
    var vals=sh.getDataRange().getValues();
    var headers=vals[0]; var rows=[];
    for (var i=1;i<vals.length;i++){ var obj={}; for (var c=0;c<headers.length;c++){ obj[headers[c]]=vals[i][c]; } rows.push(obj); }
    return createJsonResponse({success:true,data:rows,count:rows.length});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore getSheet: '+err.message},500);
  }
}

function handleLogin(post){
  try{
    var cf=post.codiceFiscale; if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido (16 caratteri)'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var data=sh.getDataRange().getValues();
    for (var i=1;i<data.length;i++){
      var row=data[i];
      if (String(row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){
        return createJsonResponse({
          success:true, message:'Login effettuato',
          user:{
            nome:row[CONFIG.CLIENTI_COLS.NOME-1],
            codiceFiscale:row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1],
            dataNascita:row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1],
            luogoNascita:row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1],
            comuneResidenza:row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1],
            viaResidenza:row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1],
            civicoResidenza:row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1],
            numeroPatente:row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1],
            inizioValiditaPatente:row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1],
            scadenzaPatente:row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1],
            cellulare:row[CONFIG.CLIENTI_COLS.CELLULARE-1],
            email:row[CONFIG.CLIENTI_COLS.EMAIL-1]
          }
        });
      }
    }
    return createJsonResponse({success:false,message:'Codice fiscale non trovato',requiresRegistration:true},404);
  }catch(err){
    return createJsonResponse({success:false,message:'Errore login: '+err.message},500);
  }
}

function getVeicoli(){
  try{
    var sp=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    var shM=sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (!shP) return createJsonResponse({success:false,message:'Foglio PULMINI non trovato'},500);
    var dataP=shP.getDataRange().getValues();
    if (dataP.length<=1) return createJsonResponse({success:true,message:'Nessun veicolo trovato',data:[]});

    var manut={};
    if (shM){
      var dataM=shM.getDataRange().getValues();
      for (var i=1;i<dataM.length;i++){
        var r=dataM[i]; var t=r[CONFIG.MANUTENZIONI_COLS.TARGA-1]; var st=r[CONFIG.MANUTENZIONI_COLS.STATO-1];
        if (t && st){ manut[t]={ stato:st, dataInizio:r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1], dataFine:r[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1], note:r[CONFIG.MANUTENZIONI_COLS.NOTE-1] }; }
      }
    }

    var res=[];
    for (var j=1;j<dataP.length;j++){
      var rp=dataP[j]; var tp=rp[CONFIG.PULMINI_COLS.TARGA-1]; if (!tp) continue;
      var man=manut[tp]; var inMan = false;
      if (man && man.dataInizio && man.dataFine) {
        var oggi = new Date(); var di = new Date(man.dataInizio); var df = new Date(man.dataFine);
        if (oggi >= di && oggi <= df) { inMan = true; }
      }
      var base=rp[CONFIG.PULMINI_COLS.STATO-1]||'Disponibile';
      res.push({
        Targa:tp, Marca:rp[CONFIG.PULMINI_COLS.MARCA-1]||'', Modello:rp[CONFIG.PULMINI_COLS.MODELLO-1]||'',
        Posti:parseInt(rp[CONFIG.PULMINI_COLS.POSTI-1],10)||9,
        Disponibile:!inMan && (base==='Disponibile'||base==='Attivo'),
        Note:rp[CONFIG.PULMINI_COLS.NOTE-1]||'',
        PassoLungo:(tp==='EC787NM')||(rp[CONFIG.PULMINI_COLS.NOTE-1] && String(rp[CONFIG.PULMINI_COLS.NOTE-1]).toLowerCase().indexOf('passo lungo')>-1),
        StatoManutenzione:man?man.stato:'-',
        DisponibileDate:!inMan && (base==='Disponibile'||base==='Attivo')
      });
    }
    return createJsonResponse({success:true,message:'Trovati '+res.length+' veicoli',data:res,count:res.length});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore caricamento veicoli: '+err.message},500);
  }
}

function getPrenotazioni(){
  try{
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('PRENOTAZIONI');
    if (!sh) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI non trovato'},500);
    var data=sh.getDataRange().getValues();
    if (data.length<=1) return createJsonResponse({success:true,message:'Nessuna prenotazione trovata',data:[]});
    var out=[];
    for (var i=1;i<data.length;i++){
      var r=data[i]; var t=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; var cf=r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1];
      if (!t && !cf) continue;
      out.push({
        id:i, targa:t||'',
        giornoInizio:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]||'',
        giornoFine:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]||'',
        oraInizio:r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]||'',
        oraFine:r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]||'',
        destinazione:r[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1]||'',
        codiceFiscaleAutista1:cf||'',
        nomeAutista1:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'',
        cellulare:r[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'',
        codiceFiscaleAutista2:r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'',
        nomeAutista2:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'',
        codiceFiscaleAutista3:r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'',
        nomeAutista3:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'',
        stato:r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'In attesa',
        importo:r[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]||'',
        dataContratto:r[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO-1]||'',
        email:r[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||'',
        idPrenotazione:r[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1]||'',
        timestamp:r[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1]||''
      });
    }
    return createJsonResponse({success:true,message:'Trovate '+out.length+' prenotazioni',data:out,count:out.length});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore caricamento prenotazioni: '+err.message},500);
  }
}

function checkDisponibilita(p){
  try{
    var t=p.targa, di=p.dataInizio, df=p.dataFine;
    if (!t||!di||!df) return createJsonResponse({success:false,message:'Parametri mancanti: targa, dataInizio, dataFine'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data=sh.getDataRange().getValues(); var disp=true; var confl=[];
    for (var i=1;i<data.length;i++){
      var r=data[i]; var tp=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; var st=String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'');
      if (tp===t && ['Rifiutata','Completata'].indexOf(st)===-1){
        var ie=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]); var fe=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]);
        var ni=new Date(di); var nf=new Date(df);
        if (!(nf<ie || ni>fe)){ disp=false; confl.push({da:ie,a:fe,stato:st}); }
      }
    }
    // Controllo manutenzioni con date
    var shM = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      for (var m = 1; m < dataM.length; m++) {
        var mRow = dataM[m];
        var targaMan = mRow[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var dataInizioMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        if (targaMan === t && dataInizioMan && dataFineMan) {
          var manInizio = new Date(dataInizioMan);
          var manFine = new Date(dataFineMan);
          var ni = new Date(di);
          var nf = new Date(df);
          if (!(nf < manInizio || ni > manFine)) {
            disp = false;
            confl.push({
              da: manInizio,
              a: manFine,
              stato: mRow[CONFIG.MANUTENZIONI_COLS.STATO - 1] || 'Manutenzione',
              tipo: 'manutenzione'
            });
          }
        }
      }
    }
    return createJsonResponse({success:true,disponibile:disp,conflitti:confl});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore controllo disponibilita: '+err.message},500);
  }
}

// Aggiornamento stati live CORRETTO: non tocca "In attesa"
function updateStatiLive(){
  try{
    var now=new Date(); var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var valsP=shP.getDataRange().getValues();
    
    for (var i=1;i<valsP.length;i++){
      var r=valsP[i]; var stato=String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'');
      var di=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]); var df=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]); var next=stato;
      
      // NON toccare "In attesa" - deve rimanere fino all'approvazione manuale
      if (stato === 'In attesa') {
        continue; // Salta completamente le prenotazioni in attesa
      }
      
      // Solo prenotazioni CONFERMATE possono progredire automaticamente
      if (stato === 'Confermata' && today < di) {
        next = 'Programmata';
      }
      else if ((stato === 'Programmata' || stato === 'Confermata') && today >= di && today <= df) {
        next = 'In corso';
      }
      else if ((stato === 'In corso' || stato === 'Programmata' || stato === 'Confermata') && today > df) {
        next = 'Completata';
      }
      
      if (next !== stato) { 
        shP.getRange(i+1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE, 1, 1).setValue(next); 
      }
    }
    
    // Manutenzioni (rimane uguale)
    var shM=ss.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM){
      var valsM=shM.getDataRange().getValues();
      for (var j=1;j<valsM.length;j++){
        var m=valsM[j]; var ms=String(m[CONFIG.MANUTENZIONI_COLS.STATO-1]||'');
        var mdi=new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1]); var mdf=new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1]); var mnext=ms;
        if (today>mdf && ms==='In corso') mnext='Completata';
        else if (today>=mdi && today<=mdf && ms==='Programmata') mnext='In corso';
        if (mnext!==ms){ shM.getRange(j+1, CONFIG.MANUTENZIONI_COLS.STATO, 1, 1).setValue(mnext); }
      }
    }
    return createJsonResponse({success:true,message:'Stati aggiornati'});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore updateStatiLive: '+err.message},500);
  }
}

function creaPrenotazione(post){
  try{
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var row=new Array(44); for (var i=0;i<44;i++){ row[i]=''; }
    row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1]=new Date();
    row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]=post.autista1&&post.autista1.nomeCompleto?post.autista1.nomeCompleto:(post.autista1&&post.autista1.nome?post.autista1.nome:'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.dataNascita?post.autista1.dataNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.luogoNascita?post.autista1.luogoNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]=post.autista1&&post.autista1.codiceFiscale?post.autista1.codiceFiscale:'';
    row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.comuneResidenza?post.autista1.comuneResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.viaResidenza?post.autista1.viaResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.civicoResidenza?post.autista1.civicoResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.numeroPatente?post.autista1.numeroPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]=post.autista1&&(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente)?(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente):'';
    row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.scadenzaPatente?post.autista1.scadenzaPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.TARGA-1]=post.targa||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]=post.oraInizio||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]=post.oraFine||'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]=post.giornoInizio?new Date(post.giornoInizio):'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]=post.giornoFine?new Date(post.giornoFine):'';
    row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1]=post.destinazione||'';
    row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]=post.autista1&&post.autista1.cellulare?post.autista1.cellulare:(post.cellulare||'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO-1]=new Date();
    row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]=post.email||'';
    row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]='In attesa';
    row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]=post.importo||0;

    if (post.autista2){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]=post.autista2.nomeCompleto||post.autista2.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]=post.autista2.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]=post.autista2.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]=post.autista2.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]=post.autista2.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]=post.autista2.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]=post.autista2.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]=post.autista2.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]=post.autista2.inizioValiditaPatente||post.autista2.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]=post.autista2.scadenzaPatente||'';
    }
    if (post.autista3){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]=post.autista3.nomeCompleto||post.autista3.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]=post.autista3.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]=post.autista3.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]=post.autista3.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]=post.autista3.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]=post.autista3.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]=post.autista3.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]=post.autista3.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]=post.autista3.inizioValiditaPatente||post.autista3.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]=post.autista3.scadenzaPatente||'';
    }

    // Genera ID dinamico BOOK-ANNO-xxx
    var id = generaNuovoIdBooking();
    row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1]=id;
    sh.appendRow(row);

    if (post.upsertClienti){
      try{
        if (post.autista1 && post.autista1.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista1, true);
        if (post.autista2 && post.autista2.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista2, false);
        if (post.autista3 && post.autista3.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista3, false);
      }catch(e){ console.error('Errore upsert clienti:', e); }
    }

    try{ inviaNotificaTelegram(post); }catch(e){ console.error('Errore invio Telegram:', e); }

    if (post.email){
      try{ inviaEmailConfermaCliente({...post, idPrenotazione:id}); }
      catch(e){ console.error('Errore email conferma cliente:', e); }
    }

    return createJsonResponse({success:true,message:'Prenotazione creata',idPrenotazione:id});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore creazione prenotazione: '+err.message},500);
  }
}

// Census prenotazioni esistenti con assegnazione ID BOOK-ANNO-xxx
function assegnaIdPrenotazioniEsistenti(){
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({
        success: true,
        message: 'Nessuna prenotazione trovata',
        processate: 0
      });
    }
    
    // Raggruppa per anno per gestire ID separati
    var prenotazioniPerAnno = {};
    var maxProgressiviPerAnno = {};
    
    // Prima passata: analizza ID esistenti per anno
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var idEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '').trim();
      
      // Determina l'anno dalla data o usa anno corrente
      var annoPrenotazione;
      var timestamp = row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1];
      var dataContratto = row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1];
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      
      if (timestamp && timestamp instanceof Date) {
        annoPrenotazione = timestamp.getFullYear();
      } else if (dataContratto && dataContratto instanceof Date) {
        annoPrenotazione = dataContratto.getFullYear();
      } else if (giornoInizio && giornoInizio instanceof Date) {
        annoPrenotazione = giornoInizio.getFullYear();
      } else {
        annoPrenotazione = new Date().getFullYear(); // Default anno corrente
      }
      
      // Inizializza strutture per l'anno
      if (!prenotazioniPerAnno[annoPrenotazione]) {
        prenotazioniPerAnno[annoPrenotazione] = [];
        maxProgressiviPerAnno[annoPrenotazione] = 0;
      }
      
      prenotazioniPerAnno[annoPrenotazione].push({
        riga: i + 1,
        row: row,
        idEsistente: idEsistente,
        anno: annoPrenotazione
      });
      
      // Trova max progressivo esistente per questo anno
      var prefisso = 'BOOK-' + annoPrenotazione + '-';
      if (idEsistente.startsWith(prefisso)) {
        var numero = parseInt(idEsistente.replace(prefisso, ''), 10);
        if (!isNaN(numero) && numero > maxProgressiviPerAnno[annoPrenotazione]) {
          maxProgressiviPerAnno[annoPrenotazione] = numero;
        }
      }
    }
    
    // Seconda passata: assegna ID mancanti per anno
    var processate = 0;
    var aggiornate = 0;
    var dettagli = [];
    
    for (var anno in prenotazioniPerAnno) {
      var prossimoProgressivo = maxProgressiviPerAnno[anno] + 1;
      var prefisso = 'BOOK-' + anno + '-';
      
      for (var j = 0; j < prenotazioniPerAnno[anno].length; j++) {
        var prenotazione = prenotazioniPerAnno[anno][j];
        
        if (!prenotazione.idEsistente || prenotazione.idEsistente === '') {
          var nuovoId = prefisso + String(prossimoProgressivo).padStart(3, '0');
          
          // Aggiorna la cella
          sh.getRange(prenotazione.riga, CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE).setValue(nuovoId);
          
          dettagli.push({
            riga: prenotazione.riga,
            anno: anno,
            targa: prenotazione.row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1] || 'N/A',
            cliente: prenotazione.row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || 'N/A',
            stato: prenotazione.row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || 'N/A',
            nuovoId: nuovoId
          });
          
          prossimoProgressivo++;
          aggiornate++;
        }
        processate++;
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'ID assegnati con formato BOOK-ANNO-xxx dinamico',
      processate: processate,
      aggiornate: aggiornate,
      anniTrovati: Object.keys(prenotazioniPerAnno),
      maxProgressiviPerAnno: maxProgressiviPerAnno,
      dettagli: dettagli
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore assegnazione ID: ' + error.message
    }, 500);
  }
}

function upsertClienteInCreaPrenotazione(cliente, isPrimary){
  var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  var cf=String(cliente.codiceFiscale||'').trim();
  if (!cf||cf.length!==16) return;
  var vals=shC.getDataRange().getValues(); var idx=-1;
  for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
  function setValue(colKey, val){ if (val!==undefined && val!==null && val!==''){ if (idx>0){ shC.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } else { return val; } } return ''; }
  if (idx===-1){
    var newRow=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<newRow.length;k++) newRow[k]='';
    newRow[CONFIG.CLIENTI_COLS.NOME-1]=cliente.nomeCompleto||cliente.nome||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=cliente.dataNascita||'';
    newRow[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=cliente.luogoNascita||'';
    newRow[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
    newRow[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=cliente.comuneResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=cliente.viaResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=cliente.civicoResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=cliente.numeroPatente||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=cliente.inizioValiditaPatente||cliente.dataInizioPatente||'';
    newRow[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=cliente.scadenzaPatente||'';
    if (isPrimary){ newRow[CONFIG.CLIENTI_COLS.CELLULARE-1]=cliente.cellulare||''; newRow[CONFIG.CLIENTI_COLS.EMAIL-1]=cliente.email||''; }
    shC.appendRow(newRow);
  } else {
    setValue('NOME', cliente.nomeCompleto||cliente.nome);
    setValue('DATA_NASCITA', cliente.dataNascita);
    setValue('LUOGO_NASCITA', cliente.luogoNascita);
    setValue('COMUNE_RESIDENZA', cliente.comuneResidenza);
    setValue('VIA_RESIDENZA', cliente.viaResidenza);
    setValue('CIVICO_RESIDENZA', cliente.civicoResidenza);
    setValue('NUMERO_PATENTE', cliente.numeroPatente);
    setValue('DATA_INIZIO_PATENTE', cliente.inizioValiditaPatente||cliente.dataInizioPatente);
    setValue('SCADENZA_PATENTE', cliente.scadenzaPatente);
    if (isPrimary){ setValue('CELLULARE', cliente.cellulare); setValue('EMAIL', cliente.email); }
  }
}

function aggiornaCliente(post){
  try{
    var cf=(post.codiceFiscale||'').trim(); if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var vals=sh.getDataRange().getValues(); var idx=-1;
    for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
    if (idx===-1) return createJsonResponse({success:false,message:'Cliente non trovato'},404);
    function setIf(colKey,val){ if (val!==undefined && val!==null){ sh.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey], 1, 1).setValue(val); } }
    setIf('NOME', post.nome||post.nomeCompleto);
    setIf('LUOGO_NASCITA', post.luogoNascita);
    setIf('COMUNE_RESIDENZA', post.comuneResidenza);
    setIf('VIA_RESIDENZA', post.viaResidenza);
    setIf('CIVICO_RESIDENZA', post.civicoResidenza);
    setIf('NUMERO_PATENTE', post.numeroPatente);
    setIf('DATA_INIZIO_PATENTE', post.inizioValiditaPatente||post.dataInizioPatente);
    setIf('SCADENZA_PATENTE', post.scadenzaPatente);
    setIf('CELLULARE', post.cellulare);
    setIf('EMAIL', post.email);
    return createJsonResponse({success:true,message:'Profilo aggiornato',codiceFiscale:cf});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore aggiornamento cliente: '+err.message},500);
  }
}

function sincronizzaClienti(){
  try{
    var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!shP||!shC) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI o CLIENTI non trovato'},500);
    var pVals=shP.getDataRange().getValues(); var cVals=shC.getDataRange().getValues(); var idxByCF={};
    for (var i=1;i<cVals.length;i++){ var cf=String(cVals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]||'').trim(); if (cf) idxByCF[cf]=i+1; }
    var created=0, updated=0, skipped=0;

    function upsertCliente(data,isPrimary){
      var cf=String(data.codiceFiscale||'').trim();
      if (!cf||cf.length!==16){ skipped++; return; }
      var rowIndex=idxByCF[cf];

      function updateCell(colKey,val){ if (val!==undefined && val!==null && val!==''){ shC.getRange(rowIndex, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } }

      if (!rowIndex){
        var row=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<row.length;k++) row[k]='';
        row[CONFIG.CLIENTI_COLS.NOME-1]=data.nomeCompleto||data.nome||'';
        row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=data.dataNascita||'';
        row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=data.luogoNascita||'';
        row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
        row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=data.comuneResidenza||'';
        row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=data.viaResidenza||'';
        row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=data.civicoResidenza||'';
        row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=data.numeroPatente||'';
        row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=data.inizioValiditaPatente||data.dataInizioPatente||'';
        row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=data.scadenzaPatente||'';
        if (isPrimary){ row[CONFIG.CLIENTI_COLS.CELLULARE-1]=data.cellulare||''; row[CONFIG.CLIENTI_COLS.EMAIL-1]=data.email||''; }
        shC.appendRow(row); var last=shC.getLastRow(); idxByCF[cf]=last; created++;
      } else {
        updateCell('NOME', data.nomeCompleto||data.nome||''); updateCell('DATA_NASCITA', data.dataNascita||''); updateCell('LUOGO_NASCITA', data.luogoNascita||'');
        updateCell('COMUNE_RESIDENZA', data.comuneResidenza||''); updateCell('VIA_RESIDENZA', data.viaResidenza||''); updateCell('CIVICO_RESIDENZA', data.civicoResidenza||'');
        updateCell('NUMERO_PATENTE', data.numeroPatente||''); updateCell('DATA_INIZIO_PATENTE', data.inizioValiditaPatente||data.dataInizioPatente||''); updateCell('SCADENZA_PATENTE', data.scadenzaPatente||'');
        if (isPrimary){ updateCell('CELLULARE', data.cellulare||''); updateCell('EMAIL', data.email||''); } updated++;
      }
    }

    for (var r=1;r<pVals.length;r++){
      var row=pVals[r];
      var a1={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]||'', cellulare:row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'', email:row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||'' };
      var a2={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]||'' };
      var a3={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]||'' };
      if (a1.codiceFiscale) upsertCliente(a1,true);
      if (a2.codiceFiscale) upsertCliente(a2,false);
      if (a3.codiceFiscale) upsertCliente(a3,false);
    }
    return createJsonResponse({success:true,message:'Sincronizzazione CLIENTI completata',created:created,updated:updated,skipped:skipped});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore sincronizzaClienti: '+err.message},500);
  }
}

function inviaNotificaTelegram(pren){
  try{
    var msg=['🚐 NUOVA PRENOTAZIONE IN ATTESA','',
      '📋 Riepilogo:',
      '🚗 Veicolo: '+(pren.targa||'-'),
      '📅 Dal: '+(pren.giornoInizio||'-')+' '+(pren.oraInizio||'-'),
      '📅 Al: '+(pren.giornoFine||'-')+' '+(pren.oraFine||'-'),
      '📍 Destinazione: '+(pren.destinazione||'Non specificata'),'',
      '👤 Autista principale:',
      '👨‍💼 '+(pren.autista1&&pren.autista1.nomeCompleto||'-'),
      '🆔 '+(pren.autista1&&pren.autista1.codiceFiscale||'-'),
      '📱 '+(pren.autista1&&pren.autista1.cellulare||'-'),
      '📧 '+(pren.email||'Non fornita'),'',
      '⏰ Ricevuta: '+new Date().toLocaleString('it-IT'),
      '🔄 Stato: In attesa','',
      'Accedi alla dashboard per confermare.'
    ].join('\n');
    var url='https://api.telegram.org/bot'+CONFIG.TELEGRAM.BOT_TOKEN+'/sendMessage';
    var payload={ chat_id:CONFIG.TELEGRAM.CHAT_ID, text:msg, parse_mode:'Markdown' };
    UrlFetchApp.fetch(url,{method:'post', contentType:'application/json', payload:JSON.stringify(payload)});
  }catch(e){ Logger.log('Errore invio Telegram: '+(e&&e.message)); }
}

// EMAIL: mittente forzato Gmail noleggio
function inviaEmailConfermaCliente(prenotazione){
  try {
    var oggetto = 'Conferma Prenotazione - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';

    var corpo = 'Gentile ' + nomeCliente + ',\n\n' +
      'La Sua richiesta di prenotazione è stata ricevuta correttamente e sarà esaminata dal nostro staff.\n\n' +
      'STATO: IN ATTESA DI CONFERMA\n\n' +
      'Dettagli Prenotazione:\n' +
      'ID Prenotazione: ' + (prenotazione.idPrenotazione || 'N/A') + '\n' +
      'Veicolo: ' + (prenotazione.targa || 'N/A') + '\n' +
      'Dal: ' + dataInizio + ' alle ' + (prenotazione.oraInizio || 'N/A') + '\n' +
      'Al: ' + dataFine + ' alle ' + (prenotazione.oraFine || 'N/A') + '\n' +
      'Destinazione: ' + (prenotazione.destinazione || 'Non specificata') + '\n\n' +
      'Prossimi Passaggi:\n' +
      '• Il nostro team verificherà disponibilità e dettagli\n' +
      '• Riceverà una comunicazione di conferma quando la prenotazione sarà approvata\n' +
      '• Le invieremo un promemoria 3 giorni prima della partenza\n\n' +
      'Cordiali saluti,\n' +
      'Imbriani Stefano Noleggio\n' +
      'Email: ' + CONFIG.EMAIL.FROM_EMAIL;

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      body: corpo,
      name: CONFIG.EMAIL.FROM_NAME
    });
  } catch (error) {
    Logger.log('Errore invio email conferma cliente: ' + error.message);
  }
}

function inviaEmailConfermaPreventivo(prenotazione){
  try {
    var oggetto = 'Prenotazione Confermata - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';

    var corpo = 'Gentile ' + nomeCliente + ',\n\n' +
      'La informiamo che la Sua prenotazione è stata CONFERMATA.\n\n' +
      'Riepilogo:\n' +
      'ID: ' + (prenotazione.idPrenotazione || 'N/A') + '\n' +
      'Veicolo: ' + (prenotazione.targa || 'N/A') + '\n' +
      'Dal: ' + dataInizio + ' alle ' + (prenotazione.oraInizio || 'N/A') + '\n' +
      'Al: ' + dataFine + ' alle ' + (prenotazione.oraFine || 'N/A') + '\n' +
      'Destinazione: ' + (prenotazione.destinazione || 'Non specificata') + '\n\n' +
      'Per modifiche o informazioni aggiuntive, risponda a questa email o ci contatti.\n\n' +
      'Cordiali saluti,\n' +
      'Imbriani Stefano Noleggio';

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      body: corpo,
      name: CONFIG.EMAIL.FROM_NAME
    });
  } catch (error) {
    Logger.log('Errore invio email conferma: ' + error.message);
  }
}

function checkReminderEmails(){
  try {
    var oggi = new Date();
    var treGiorni = new Date(oggi.getTime() + (3 * 24 * 60 * 60 * 1000));
    var y = treGiorni.getFullYear(), m = String(treGiorni.getMonth() + 1).padStart(2, '0'), d = String(treGiorni.getDate()).padStart(2, '0');
    var treGiorniStr = y+'-'+m+'-'+d;

    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var sent = 0;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stato = String(row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '');
      var dataInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];

      if (stato === 'Confermata' && email && dataInizio) {
        var di = new Date(dataInizio);
        var diStr = di.getFullYear()+'-'+String(di.getMonth()+1).padStart(2,'0')+'-'+String(di.getDate()).padStart(2,'0');
        if (diStr === treGiorniStr) {
          var prenotazione = {
            idPrenotazione: row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1],
            targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1],
            giornoInizio: dataInizio,
            giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1],
            oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1],
            oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1],
            destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1],
            email: email,
            autista1: { nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] }
          };
          try { inviaEmailReminder(prenotazione); sent++; }
          catch (e) { console.error('Errore invio email reminder per '+email+':', e); }
        }
      }
    }
    return createJsonResponse({success: true, message: 'Check reminder completato', emailInviate: sent});
  } catch (err) {
    return createJsonResponse({success: false, message: 'Errore check reminder: ' + err.message}, 500);
  }
}

function inviaEmailReminder(prenotazione){
  try {
    var oggetto = 'Promemoria: Partenza tra 3 giorni - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';

    var corpo = 'Gentile ' + nomeCliente + ',\n\n' +
      'Le ricordiamo che tra 3 giorni inizierà il servizio prenotato.\n\n' +
      'Riepilogo:\n' +
      'ID: ' + (prenotazione.idPrenotazione || 'N/A') + '\n' +
      'Veicolo: ' + (prenotazione.targa || 'N/A') + '\n' +
      'Dal: ' + dataInizio + ' alle ' + (prenotazione.oraInizio || 'N/A') + '\n' +
      'Al: ' + dataFine + ' alle ' + (prenotazione.oraFine || 'N/A') + '\n' +
      'Destinazione: ' + (prenotazione.destinazione || 'Non specificata') + '\n\n' +
      'Cordiali saluti,\n' +
      'Imbriani Stefano Noleggio';

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      body: corpo,
      name: CONFIG.EMAIL.FROM_NAME
    });
  } catch (error) {
    Logger.log('Errore invio email reminder: ' + error.message);
  }
}

function setupDailyTrigger(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i=0;i<triggers.length;i++){
    if (triggers[i].getHandlerFunction()==='dailyReminderCheck'){ ScriptApp.deleteTrigger(triggers[i]); }
  }
  ScriptApp.newTrigger('dailyReminderCheck').timeBased().everyDays(1).atHour(9).create();
  Logger.log('Trigger giornaliero configurato per le 09:00');
}
function dailyReminderCheck(){
  try{ checkReminderEmails(); updateStatiLive(); Logger.log('Check giornaliero completato: '+new Date().toISOString()); }
  catch (error){ Logger.log('Errore nel check giornaliero: '+error.message); }
}
