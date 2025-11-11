/**
 * Cloudflare Worker Proxy per Imbriani Stefano Noleggio
 * Gestisce CORS e inoltra richieste a Google Apps Script
 */

const ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080',
  'https://xdren98.github.io',
  'https://www.imbrianistefanonoleggio.it',
  'https://imbrianistefanonoleggio.it',
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
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin || 'https://xdren98.github.io',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      }
    });
  }

  try {
    // Inoltra la richiesta a Google Apps Script
    const url = new URL(request.url);
    const originalParams = new URLSearchParams(url.search);
    // Forward Authorization header e IP come query param per Apps Script
    const authHeader = request.headers.get('Authorization') || '';
    const cfIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
    const userAgent = request.headers.get('User-Agent') || '';
    if (authHeader) originalParams.set('Authorization', authHeader);
    if (cfIp) originalParams.set('cfip', cfIp);
    if (userAgent) originalParams.set('ua', userAgent);
    const searchParams = `?${originalParams.toString()}`;
    
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
    const upstreamCT = response.headers.get('Content-Type') || '';
    const upstreamStatus = response.status;
    const responseText = await response.text();

    // Tenta di garantire sempre una risposta JSON parseabile
    let payloadText;
    try {
      const parsed = JSON.parse(responseText);
      payloadText = JSON.stringify(parsed);
    } catch (_) {
      // Wrap non-JSON in un envelope JSON
      payloadText = JSON.stringify({
        success: false,
        message: 'Risposta non JSON dal backend',
        status: upstreamStatus,
        contentType: upstreamCT,
        raw: responseText && responseText.length > 500 ? (responseText.slice(0, 500) + '…') : responseText
      });
    }

    // Costruisci la risposta con CORS
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://xdren98.github.io';
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    };
    // Invia credenziali solo se l'origine è esplicitamente consentita
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    return new Response(payloadText, {
      status: upstreamStatus,
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
        'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://xdren98.github.io'
      }
    });
  }
}
