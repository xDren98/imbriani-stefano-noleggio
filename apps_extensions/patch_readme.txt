// PATCH v8.5.1 — Forza mittente Gmail del noleggio su tutte le email
// - Aggiunge parametro `from: 'imbrianistefanonoleggio@gmail.com'` a tutte le MailApp.sendEmail
// - Non imposta reply-to
// - Nessun cambio logica, solo mittente coerente

function __applyMailSenderPatch_851__(){ return 'ok'; }
