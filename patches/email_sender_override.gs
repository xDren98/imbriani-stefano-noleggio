/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.5.1 (patch mittente Gmail)
 * - Forza mittente: imbrianistefanonoleggio@gmail.com
 * - Nessun reply-to
 */

// === INIZIO BLOCCO SOSTITUZIONE SOLO FUNZIONI INVIO ===

function inviaEmailConfermaCliente(prenotazione){
  try {
    var oggetto = '✅ Conferma Prenotazione - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';

    var corpo = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #0066FF, #004ECC); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: white; border-left: 4px solid #0066FF; padding: 15px; margin: 15px 0; }
        .status { background: #E3F2FD; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .highlight { color: #0066FF; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚐 Imbriani Stefano Noleggio</h1>
        <p>Conferma Prenotazione Ricevuta</p>
      </div>
      <div class="content">
        <h2>Gentile ${nomeCliente},</h2>
        <p>La ringraziamo per aver scelto i nostri servizi. La Sua prenotazione è stata <strong>ricevuta con successo</strong> e sarà esaminata dal nostro staff.</p>
        <div class="status">🔄 STATO: IN ATTESA DI CONFERMA</div>
        <div class="info-box">
          <h3>📋 Dettagli Prenotazione</h3>
          <p><strong>ID Prenotazione:</strong> <span class="highlight">${prenotazione.idPrenotazione || 'N/A'}</span></p>
          <p><strong>Veicolo:</strong> ${prenotazione.targa || 'N/A'}</p>
          <p><strong>Dal:</strong> ${dataInizio} alle ${prenotazione.oraInizio || 'N/A'}</p>
          <p><strong>Al:</strong> ${dataFine} alle ${prenotazione.oraFine || 'N/A'}</p>
          <p><strong>Destinazione:</strong> ${prenotazione.destinazione || 'Non specificata'}</p>
        </div>
        <div class="info-box">
          <h3>⏰ Prossimi Passaggi</h3>
          <p>1. <strong>Verifica Amministrativa</strong></p>
          <p>2. <strong>Preventivo</strong> via email</p>
          <p>3. <strong>Conferma</strong> definitiva</p>
          <p>4. <strong>Promemoria</strong> 3 giorni prima della partenza</p>
        </div>
        <div class="info-box">
          <h3>📞 Contatti</h3>
          <p><strong>Telefono:</strong> [INSERIRE NUMERO]</p>
          <p><strong>Email:</strong> imbrianistefanonoleggio@gmail.com</p>
        </div>
      </div>
      <div class="footer">
        <p>© 2025 Imbriani Stefano Noleggio</p>
      </div>
    </body>
    </html>`;

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      htmlBody: corpo,
      name: 'Imbriani Stefano Noleggio',
      from: 'imbrianistefanonoleggio@gmail.com'
    });
  } catch (error) {
    Logger.log('Errore invio email conferma cliente: ' + error.message);
  }
}

function inviaEmailConfermaPreventivo(prenotazione){
  try {
    var oggetto = '🎉 Prenotazione Confermata - Preventivo Definitivo';
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';
    var importoStr = prenotazione.importo ? prenotazione.importo + '€' : 'Da concordare';

    var corpo = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #22C55E, #16A34A); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: white; border-left: 4px solid #22C55E; padding: 15px; margin: 15px 0; }
        .status { background: #DCFCE7; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; color: #166534; }
        .price-box { background: #FEF3C7; border: 2px solid #F59E0B; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .highlight { color: #22C55E; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚐 Imbriani Stefano Noleggio</h1>
        <p>Prenotazione Confermata!</p>
      </div>
      <div class="content">
        <h2>Gentile ${nomeCliente},</h2>
        <p>La Sua prenotazione è stata <strong>APPROVATA E CONFERMATA</strong>.</p>
        <div class="status">✅ PRENOTAZIONE CONFERMATA</div>
        <div class="price-box">
          <h3>💰 Preventivo Definitivo</h3>
          <div style="font-size: 24px; font-weight: bold; color: #B45309;">${importoStr}</div>
        </div>
        <div class="info-box">
          <h3>📋 Riepilogo</h3>
          <p><strong>ID:</strong> <span class="highlight">${prenotazione.idPrenotazione || 'N/A'}</span></p>
          <p><strong>Veicolo:</strong> ${prenotazione.targa || 'N/A'}</p>
          <p><strong>Dal:</strong> ${dataInizio} alle ${prenotazione.oraInizio || 'N/A'}</p>
          <p><strong>Al:</strong> ${dataFine} alle ${prenotazione.oraFine || 'N/A'}</p>
          <p><strong>Destinazione:</strong> ${prenotazione.destinazione || 'Non specificata'}</p>
        </div>
      </div>
      <div class="footer">
        <p>© 2025 Imbriani Stefano Noleggio</p>
      </div>
    </body>
    </html>`;

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      htmlBody: corpo,
      name: 'Imbriani Stefano Noleggio',
      from: 'imbrianistefanonoleggio@gmail.com'
    });
  } catch (error) {
    Logger.log('Errore invio email conferma preventivo: ' + error.message);
  }
}

function inviaEmailReminder(prenotazione){
  try {
    var oggetto = '⏰ Promemoria: Partenza tra 3 giorni - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';
    var importoStr = prenotazione.importo ? prenotazione.importo + '€' : 'Da concordare';

    var corpo = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: white; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; }
        .reminder-box { background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .checklist { background: #F0FDF4; border-left: 4px solid #22C55E; padding: 15px; margin: 15px 0; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .highlight { color: #F59E0B; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚐 Imbriani Stefano Noleggio</h1>
        <p>Promemoria Partenza</p>
      </div>
      <div class="content">
        <h2>Gentile ${nomeCliente},</h2>
        <p>Le ricordiamo che tra 3 giorni inizierà il servizio da Lei prenotato.</p>
        <div class="reminder-box">
          <h3>⏰ PARTENZA TRA 3 GIORNI</h3>
          <div style="font-size: 18px; font-weight: bold; margin-top: 10px;">${dataInizio} alle ${prenotazione.oraInizio || 'N/A'}</div>
        </div>
        <div class="info-box">
          <h3>📋 Riepilogo</h3>
          <p><strong>ID:</strong> <span class="highlight">${prenotazione.idPrenotazione || 'N/A'}</span></p>
          <p><strong>Veicolo:</strong> ${prenotazione.targa || 'N/A'}</p>
          <p><strong>Dal:</strong> ${dataInizio} alle ${prenotazione.oraInizio || 'N/A'}</p>
          <p><strong>Al:</strong> ${dataFine} alle ${prenotazione.oraFine || 'N/A'}</p>
          <p><strong>Destinazione:</strong> ${prenotazione.destinazione || 'Non specificata'}</p>
          <p><strong>Importo:</strong> ${importoStr}</p>
        </div>
      </div>
      <div class="footer">
        <p>© 2025 Imbriani Stefano Noleggio</p>
      </div>
    </body>
    </html>`;

    MailApp.sendEmail({
      to: prenotazione.email,
      subject: oggetto,
      htmlBody: corpo,
      name: 'Imbriani Stefano Noleggio',
      from: 'imbrianistefanonoleggio@gmail.com'
    });
  } catch (error) {
    Logger.log('Errore invio email reminder: ' + error.message);
  }
}

// === FINE BLOCCO SOSTITUZIONE SOLO FUNZIONI INVIO ===
