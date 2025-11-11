# Cloudflare Worker Proxy Setup

Questo documento descrive come configurare il Cloudflare Worker per gestire il proxy CORS tra il frontend e Google Apps Script.

## proxy-worker.js

```javascript
/**
 * Cloudflare Worker Proxy per Imbriani Stefano Noleggio
 * Gestisce CORS e inoltra richieste a Google Apps Script
 */

const ALLOWED_ORIGINS = [
  'http://localhost:8000',
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
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
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
    const responseHeaders = {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin'
    };

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
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
      }
    });
  }
}
```

## Installazione

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Crea un nuovo Worker
3. Incolla il codice sopra
4. Salva e deploya
5. Prendi l'URL del Worker e aggiorna `config.js`:

```javascript
API_URL: 'https://tuo-worker.tuo-sottodominio.workers.dev'
```

## Test

Testa il proxy con:

```bash
curl -X POST "https://tuo-worker.workers.dev" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "action=test&token=imbriani_secret_2025"
```

## Risoluzione Problemi

### "Dati mancanti" Error
Se ricevi `Dati mancanti` dal backend:

1. **Controlla il formato dati**: Il backend si aspetta `application/x-www-form-urlencoded`
2. **Verifica i parametri**: Assicurati che tutti i parametri richiesti siano presenti
3. **Controlla il token**: Il token deve essere `imbriani_secret_2025`
4. **Test diretto**: Prova a chiamare direttamente Apps Script per escludere il proxy

### CORS Errors
Se ricevi errori CORS:

1. Verifica che l'origine sia nell'array `ALLOWED_ORIGINS`
2. Controlla che il Worker gestisca correttamente le richieste OPTIONS
3. Assicurati che i header CORS siano corretti

## Aggiornamenti

Quando aggiorni il backend, assicurati che:

1. Il Worker continui a inoltrare correttamente i parametri
2. Il formato dei dati rimanga compatibile
3. I header CORS siano sempre corretti