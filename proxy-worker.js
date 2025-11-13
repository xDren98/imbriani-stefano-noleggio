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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_GET = 600;
const RATE_LIMIT_MAX_POST = 60;
const rateBuckets = new Map();
const cacheStore = new Map();
const CACHE_TTL_MS = 30_000;

let __prewarmDone = false;
addEventListener('fetch', event => {
  if (!__prewarmDone) {
    __prewarmDone = true;
    prewarmCaches().catch(() => {});
  }
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
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
    const originAllowed = origin && ALLOWED_ORIGINS.includes(origin);
    const isGet = request.method === 'GET';
    if (ip && (!originAllowed || !isGet)) { // Applica rate limit solo a origini non whitelisted o a scritture
      const now = Date.now();
      const key = ip + ':' + (isGet ? 'GET' : 'POST');
      const max = isGet ? RATE_LIMIT_MAX_GET : RATE_LIMIT_MAX_POST;
      const b = rateBuckets.get(key) || { start: now, count: 0 };
      if (now - b.start > RATE_LIMIT_WINDOW_MS) { b.start = now; b.count = 0; }
      b.count += 1;
      rateBuckets.set(key, b);
      if (b.count > max) {
        const allowedOrigin = originAllowed ? origin : 'https://xdren98.github.io';
        return new Response(JSON.stringify({ success:false, error:'Too Many Requests', errorCode:'RATE_LIMIT', retryAfter: Math.ceil((b.start + RATE_LIMIT_WINDOW_MS - now)/1000) }), { status:429, headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin': allowedOrigin } });
      }
    }
    const WRITE_ACTIONS = new Set([
      'setVeicolo','eliminaVeicolo','setManutenzione','creaPrenotazione','aggiornaPrenotazione','aggiornaPrenotazioneCompleta','eliminaPrenotazione','aggiornaStatoPrenotazione','aggiornaStato','confermaPrenotazione','aggiornaCliente','creaCliente','sincronizzaClienti','importaPrenotazioniICS','importaPrenotazioniCSV'
    ]);
    function purgeCacheFor(actionName){
      if (!actionName) return;
      try{
        if (['setVeicolo','eliminaVeicolo','setManutenzione'].includes(actionName)) {
          for (const key of cacheStore.keys()) { if (key.includes('action=getVeicoli')) cacheStore.delete(key); }
        }
        if (['creaPrenotazione','aggiornaPrenotazione','aggiornaPrenotazioneCompleta','eliminaPrenotazione','aggiornaStatoPrenotazione','aggiornaStato','confermaPrenotazione','importaPrenotazioniICS','importaPrenotazioniCSV'].includes(actionName)) {
          for (const key of cacheStore.keys()) { /* prenotazioni non in cache ora; placeholder */ }
        }
        if (['aggiornaCliente','creaCliente','sincronizzaClienti'].includes(actionName)) {
          for (const key of cacheStore.keys()) { /* clienti non in cache ora; placeholder */ }
        }
      }catch(_){ }
    }
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

    const action = originalParams.get('action') || '';
    const sheetName = originalParams.get('name') || '';
    const canCache = (request.method === 'GET') && (
      action === 'getVeicoli' ||
      action === 'health' ||
      action === 'version' ||
      action === 'getPrenotazioni' ||
      (action === 'getSheet' && (sheetName === 'CLIENTI' || sheetName === 'MANUTENZIONI'))
    );
    const cacheKey = canCache ? (APPS_SCRIPT_URL + '|' + searchParams) : null;
    let cacheKeyNormalized = null;
    if (canCache) {
      const ck = new URLSearchParams(originalParams.toString());
      ck.delete('Authorization');
      ck.delete('cfip');
      ck.delete('ua');
      ck.delete('diag');
      ck.delete('nocache');
      cacheKeyNormalized = APPS_SCRIPT_URL + '|' + ck.toString();
    }
    if (canCache && cacheKey) {
      let cached = cacheStore.get(cacheKeyNormalized || cacheKey);
      if (!cached) {
        try {
          if (self.caches && self.caches.default && cacheKeyNormalized) {
            const reqKey = new Request('https://cache.proxy/' + encodeURIComponent(cacheKeyNormalized));
            const match = await caches.default.match(reqKey);
            if (match) {
              const text = await match.text();
              cached = { ts: Date.now(), payloadText: text, status: match.status || 200 };
            }
          }
        } catch(_){ }
      }
      if (cached) {
        const isFresh = (Date.now() - cached.ts) < CACHE_TTL_MS;
        const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://xdren98.github.io';
        let bodyText = cached.payloadText;
        if (originalParams.get('diag') === '1') {
          try {
            const obj = JSON.parse(bodyText);
            obj.__proxy = { cache: isFresh ? 'HIT' : 'STALE', status: cached.status };
            bodyText = JSON.stringify(obj);
          } catch(_) { }
        }
        const resp = new Response(bodyText, { status: cached.status, headers: {
          'Content-Type':'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Expose-Headers': 'X-Proxy-Cache',
          'Cache-Control': 'public, max-age=30',
          'Vary':'Origin',
          'X-Frame-Options':'DENY',
          'X-Content-Type-Options':'nosniff',
          'Referrer-Policy':'no-referrer',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
          'X-Proxy-Cache': isFresh ? 'HIT' : 'STALE'
        }});
        try { if (self.caches && self.caches.default && cacheKeyNormalized) { await caches.default.put(new Request('https://cache.proxy/' + encodeURIComponent(cacheKeyNormalized)), resp.clone()); } } catch(_){ }
        if (!isFresh) {
          revalidateUpstream(cacheKeyNormalized, APPS_SCRIPT_URL + searchParams, cached.status).catch(() => {});
        }
        return resp;
      }
    }
    
    // Costruisci la nuova richiesta per Apps Script
    let body = null;
    let headers = {
      'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker-Proxy'
    };

    let postAction = null;
    if (request.method === 'POST') {
      // Per le richieste POST, mantieni il body così com'è
      body = await request.text();
      headers['Content-Type'] = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded';
      try {
        const ct = headers['Content-Type'].toLowerCase();
        if (ct.includes('application/json')) {
          const obj = JSON.parse(body || '{}');
          if (obj && typeof obj.action === 'string') postAction = obj.action;
        } else {
          const params = new URLSearchParams(body || '');
          const a = params.get('action');
          if (a) postAction = a;
        }
      } catch(_) { }
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
      if (originalParams.get('diag') === '1') {
        parsed.__proxy = { cache: 'MISS', status: upstreamStatus };
      }
      payloadText = JSON.stringify(parsed);
    } catch (_) {
      // Wrap non-JSON in un envelope JSON
      const obj = {
        success: false,
        message: 'Risposta non JSON dal backend',
        status: upstreamStatus,
        contentType: upstreamCT,
        raw: responseText && responseText.length > 500 ? (responseText.slice(0, 500) + '…') : responseText
      };
      if (originalParams.get('diag') === '1') obj.__proxy = { cache: 'MISS', status: upstreamStatus };
      payloadText = JSON.stringify(obj);
    }

    if (canCache && cacheKey) {
      const entryKey = cacheKeyNormalized || cacheKey;
      cacheStore.set(entryKey, { ts: Date.now(), payloadText, status: upstreamStatus });
      try {
        if (self.caches && self.caches.default && entryKey) {
          const resp = new Response(payloadText, { status: upstreamStatus, headers: responseHeaders });
          await caches.default.put(new Request('https://cache.proxy/' + encodeURIComponent(entryKey)), resp);
        }
      } catch(_){ }
    }

    if (request.method === 'POST' && postAction && WRITE_ACTIONS.has(postAction)) {
      purgeCacheFor(postAction);
      for (const key of cacheStore.keys()) {
        if (key.includes('action=getPrenotazioni') || key.includes('action=getSheet')) {
          cacheStore.delete(key);
        }
      }
    }

    // Costruisci la risposta con CORS
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://xdren98.github.io';
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Expose-Headers': 'X-Proxy-Cache',
      'Cache-Control': 'public, max-age=30',
      'Vary': 'Origin',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'X-Proxy-Cache':'MISS'
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

async function revalidateUpstream(entryKey, upstreamUrl, lastStatus) {
  try {
    const r = await fetch(upstreamUrl);
    const t = await r.text();
    const s = r.status;
    const obj = (() => { try { return JSON.parse(t); } catch(_) { return { success:false, message:'Risposta non JSON dal backend', status:s, raw:t }; } })();
    const payloadText = JSON.stringify(obj);
    cacheStore.set(entryKey, { ts: Date.now(), payloadText, status: s });
    const resp = new Response(payloadText, { status: s, headers: { 'Content-Type': 'application/json' } });
    if (self.caches && self.caches.default && entryKey) {
      await caches.default.put(new Request('https://cache.proxy/' + encodeURIComponent(entryKey)), resp);
    }
  } catch(_) { }
}

async function prewarmCaches() {
  try {
    const urls = [
      APPS_SCRIPT_URL + '?' + new URLSearchParams({ action:'getVeicoli' }).toString(),
      APPS_SCRIPT_URL + '?' + new URLSearchParams({ action:'getSheet', name:'CLIENTI', limit:'50' }).toString(),
      APPS_SCRIPT_URL + '?' + new URLSearchParams({ action:'health' }).toString(),
      APPS_SCRIPT_URL + '?' + new URLSearchParams({ action:'version' }).toString()
    ];
    await Promise.allSettled(urls.map(u => fetch(u)));
  } catch(_) { }
}
