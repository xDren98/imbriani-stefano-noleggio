/**
 * BACKEND EMAIL v8.0 - inviaRiepilogo with personal area link
 * Sends booking confirmation email with link only if email is provided
 */

/**
 * inviaRiepilogo
 * Invia email riepilogo prenotazione con link area personale
 * Include link SOLO se email è presente (come richiesto)
 */
function inviaRiepilogo(p) {
  try {
    const idPrenotazione = p.idPrenotazione;
    const email = (p.email || '').trim();
    
    if (!idPrenotazione) {
      return respond(false, {}, 'ID prenotazione mancante', 400);
    }
    
    if (!email) {
      console.log(`[EMAIL] Email non fornita per ${idPrenotazione}, skip invio`);
      return respond(false, {}, 'Email non fornita, invio saltato', 400);
    }
    
    // Cerca prenotazione nel foglio
    const sheetPren = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sheetPren) {
      return respond(false, {}, 'Foglio prenotazioni non trovato', 500);
    }
    
    const data = sheetPren.getDataRange().getValues();
    const H = CONFIG.PREN_COLS;
    
    let prenotazione = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][H.ID_PREN] === idPrenotazione) {
        const r = data[i];
        prenotazione = {
          id: r[H.ID_PREN],
          targa: r[H.TARGA],
          dataInizio: r[H.GIORNO_INIZIO],
          oraInizio: r[H.ORA_INIZIO],
          dataFine: r[H.GIORNO_FINE],
          oraFine: r[H.ORA_FINE],
          destinazione: r[H.DESTINAZIONE],
          nome: r[H.NAME],
          cellulare: r[H.CELLULARE],
          stato: r[H.STATO_PRENOTAZIONE]
        };
        break;
      }
    }
    
    if (!prenotazione) {
      return respond(false, {}, 'Prenotazione non trovata', 404);
    }
    
    // Trova info veicolo dalla flotta
    let veicoloInfo = 'Veicolo';
    try {
      const flotta = JSON.parse(getFlottaRaw());
      const veicolo = flotta.find(v => v.Targa === prenotazione.targa);
      if (veicolo) {
        veicoloInfo = `${veicolo.Marca} ${veicolo.Modello} (${veicolo.Targa})`;
        if (veicolo.PassoLungo || veicolo.Targa === 'EC787NM') {
          veicoloInfo += ' - Passo Lungo';
        }
      }
    } catch (e) {
      console.warn('[EMAIL] Errore caricamento veicolo:', e);
    }
    
    // Costruisci email
    const oggetto = `Riepilogo Prenotazione ${idPrenotazione} - Imbriani Stefano Noleggio`;
    
    // Link area personale (incluso SOLO se email presente)
    const linkAreaPersonale = `https://imbriani-noleggio.vercel.app/?login=${encodeURIComponent(prenotazione.nome.split(' ')[0])}`;
    
    const corpo = `
Gentile ${prenotazione.nome},

Grazie per aver scelto Imbriani Stefano Noleggio!

Ecco il riepilogo della sua prenotazione:

🆔 ID PRENOTAZIONE: ${idPrenotazione}
🚐 VEICOLO: ${veicoloInfo}
📅 RITIRO: ${formatDateForEmail(prenotazione.dataInizio)} alle ${prenotazione.oraInizio}
📅 CONSEGNA: ${formatDateForEmail(prenotazione.dataFine)} alle ${prenotazione.oraFine}
📍 DESTINAZIONE: ${prenotazione.destinazione}
ℹ️ STATO: ${prenotazione.stato}

🔗 AREA PERSONALE:
Per seguire lo stato della sua prenotazione:
${linkAreaPersonale}

Per qualsiasi informazione:
📞 Tel: 328 658 9618
📧 Email: info@imbrianinoleggio.it

Cordiali saluti,
Imbriani Stefano Noleggio
    `;
    
    // Invia email
    MailApp.sendEmail({
      to: email,
      subject: oggetto,
      body: corpo
    });
    
    console.log(`[EMAIL] Riepilogo inviato a ${email} per ${idPrenotazione}`);
    
    return respond(true, {
      email: email,
      idPrenotazione: idPrenotazione,
      linkAreaPersonale: linkAreaPersonale
    }, `Email riepilogo inviata a ${email}`);
    
  } catch (e) {
    console.error('[EMAIL] Errore invio:', e);
    return respond(false, {}, 'Errore invio email: ' + e.message, 500);
  }
}

/**
 * Formatta data per email (DD/MM/YYYY)
 */
function formatDateForEmail(dateInput) {
  if (!dateInput) return '';
  
  const date = toDateSafe(dateInput);
  if (!date) return String(dateInput);
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}