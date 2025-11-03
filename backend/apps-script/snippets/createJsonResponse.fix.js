// Utility per risposte JSON compatibili con Apps Script (senza setHeaders)
function createJsonResponse(data, status) {
  var payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    version: CONFIG.VERSION,
    status: status || 200,
    success: data && data.success !== undefined ? data.success : true,
    ...data
  }, null, 2);
  
  var output = ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  // Apps Script non supporta setHeaders su ContentService. Per CORS usare doOptions e HtmlService se necessario.
  return output;
}
