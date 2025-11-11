/**
 * Cloudflare Worker Proxy per Imbriani Stefano Noleggio
 * Gestisce CORS e inoltra richieste a Google Apps Script
 */

const ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080',
  'https://imbriani-stefano-noleggio.vercel.app',
  'https://imbriani-stefano-noleggio.netlify.app'
];

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get('Origin');
  
  // Gestisci preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        // In DEV consenti tutte le origini se non riconosciuta
        'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }

  try {
    // Inoltra la richiesta a Google Apps Script
    const url = new URL(request.url);
    const searchParams = url.search;
    
    // Costruisci la nuova richiesta per Apps Script
    let body = null;
    let headers = {
      'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker-Proxy'
    };

    if (request.method === 'POST') {
      // Per le richieste POST, mantieni il body così com'è
      body = await request.text();
      headers['Content-Type'] = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded';
    }

    const appsScriptRequest = new Request(APPS_SCRIPT_URL + searchParams, {
      method: request.method,
      headers: headers,
      body: body
    });

    // Invia la richiesta a Apps Script
    const response = await fetch(appsScriptRequest);
    const responseText = await response.text();

    // Costruisci la risposta con CORS
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
    const responseHeaders = {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin'
    };
    // Invia credenziali solo se l'origine è esplicitamente consentita
    if (allowedOrigin !== '*') {
      responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    return new Response(responseText, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Proxy error: ' + error.message,
      errorCode: 'PROXY_ERROR'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*'
      }
    });
  }
}
