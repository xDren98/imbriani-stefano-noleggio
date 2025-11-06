/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.6
 * - FIX: Disponibilità veicoli include tutte le manutenzioni con date definite, indipendentemente dallo stato
 * - UI veicoli aggiornata: pulmini risultano non disponibili se oggi è in periodo di manutenzione
 * - Nessun altro cambiamento: solo patch su logica getVeicoli/checkDisponibilita
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

// ... Funzioni introduttive, versionInfo, doGet, doPost, getSheetGeneric, handleLogin (restano IDENTICHE)

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
        manut[t]={ stato:st, dataInizio:r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1], dataFine:r[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1], note:r[CONFIG.MANUTENZIONI_COLS.NOTE-1] };
      }
    }
    var res=[];
    for (var j=1;j<dataP.length;j++){
      var rp=dataP[j]; var tp=rp[CONFIG.PULMINI_COLS.TARGA-1]; if (!tp) continue;
      var man=manut[tp];
      var inMan = false;
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

// ... Tutto il resto del file (creaPrenotazione, upsertCliente, inviaMail, trigger, ecc) rimane IDENTICO.
