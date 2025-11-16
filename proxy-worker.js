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

const ALLOWED_HOST_SUFFIXES = [
  'xdren98.github.io',
  'imbrianistefanonoleggio.it',
  'vercel.app',
  'netlify.app'
];

function isLocalOrigin(origin){
  try{ const u = new URL(origin); return (u.hostname==='localhost' || u.hostname==='127.0.0.1'); }catch(_){ return false; }
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_GET = 600;
const RATE_LIMIT_MAX_POST = 60;
const rateBuckets = new Map();
const cacheStore = new Map();
const CACHE_TTL_MS = 30_000;
function getCacheTTL(action, sheetName){
  switch(action){
    case 'getVeicoli': return 120_000;
    case 'getPrenotazioni': return 30_000;
    case 'getSheet': return (sheetName === 'CLIENTI' || sheetName === 'MANUTENZIONI') ? 60_000 : 30_000;
    case 'version': return 60_000;
    case 'health': return 5_000;
    default: return CACHE_TTL_MS;
  }
}
async function computeETag(text){
  try {
    const enc = new TextEncoder().encode(text||'');
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const bytes = new Uint8Array(digest);
    let b64 = '';
    for (let i=0;i<bytes.length;i++){ b64 += String.fromCharCode(bytes[i]); }
    const base64 = btoa(b64).replace(/=+$/,'');
    return 'W/"'+base64+'"';
  } catch(_){ return ''; }
}

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
  const isHead = request.method === 'HEAD';
  
  // Gestisci preflight CORS
  if (request.method === 'OPTIONS') {
    const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : null;
    const acrh = request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With';
    const headers = {
      'Access-Control-Allow-Origin': allowedOrigin || 'https://xdren98.github.io',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': acrh,
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin, Authorization',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    };
    if (allowedOrigin) headers['Access-Control-Allow-Credentials'] = 'true';
    return new Response(null, { status: 200, headers });
  }

  try {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
    const originAllowed = origin && isAllowedOrigin(origin);
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
          for (const key of cacheStore.keys()) { if (key.includes('action=getPrenotazioni')) cacheStore.delete(key); }
        }
        if (['aggiornaCliente','creaCliente','sincronizzaClienti'].includes(actionName)) {
          for (const key of cacheStore.keys()) { if (key.includes('action=getSheet') && key.includes('name=CLIENTI')) cacheStore.delete(key); }
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
    else {
      // Se presente cookie HttpOnly, propaga come Authorization anche per GET/HEAD
      try {
        const cookie = request.headers.get('Cookie') || '';
        const m = cookie.match(/(?:^|;\s*)imbriani_token=([^;]+)/);
        const cookieToken = m && m[1] ? m[1] : '';
        if (cookieToken) originalParams.set('Authorization', 'Bearer ' + cookieToken);
      } catch(_) { }
    }
    if (cfIp) originalParams.set('cfip', cfIp);
    if (userAgent) originalParams.set('ua', userAgent);
    if (originAllowed && isLocalOrigin(origin)) { originalParams.set('originLocal','1'); }
    const searchParams = `?${originalParams.toString()}`;

    const action = originalParams.get('action') || '';
    const sheetName = originalParams.get('name') || '';
    const canCache = ((request.method === 'GET') || isHead) && (
      action === 'getVeicoli' ||
      action === 'health' ||
      action === 'version' ||
      action === 'getPrenotazioni' ||
      (action === 'getSheet' && (sheetName === 'CLIENTI' || sheetName === 'MANUTENZIONI')) ||
      (originalParams.get('cache') === '1')
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
        const ttlOverride = parseInt(originalParams.get('ttl')||'',10);
        const ttl = (!isNaN(ttlOverride) && ttlOverride>0) ? ttlOverride : getCacheTTL(action, sheetName);
        const isFresh = (Date.now() - cached.ts) < ttl;
        const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : 'https://xdren98.github.io';
        let bodyText = cached.payloadText;
        const inm = request.headers.get('If-None-Match');
        const etagCached = cached.etag || (await computeETag(bodyText));
        if (inm && etagCached && inm === etagCached) {
          const headers304 = {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Expose-Headers': 'ETag, X-Proxy-Cache',
            'Access-Control-Allow-Credentials': 'true',
            'Cache-Control': 'public, max-age=30',
            'Vary':'Origin, Authorization',
            'ETag': etagCached,
            'X-Proxy-Cache': 'HIT'
          };
          return new Response(null, { status: 304, headers: headers304 });
        }
        if (originalParams.get('diag') === '1') {
          try {
            const obj = JSON.parse(bodyText);
            obj.__proxy = { cache: isFresh ? 'HIT' : 'STALE', status: cached.status };
            bodyText = JSON.stringify(obj);
          } catch(_) { }
        }
        const baseHeaders = {
          'Content-Type':'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Expose-Headers': 'ETag, X-Proxy-Cache',
          'Access-Control-Allow-Credentials': 'true',
          'Cache-Control': 'public, max-age=30',
          'Vary':'Origin, Authorization',
          'X-Frame-Options':'DENY',
          'X-Content-Type-Options':'nosniff',
          'Referrer-Policy':'no-referrer',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
          'X-Proxy-Cache': isFresh ? 'HIT' : 'STALE',
          'ETag': etagCached || ''
        };
        const resp = isHead ? new Response(null, { status: cached.status, headers: baseHeaders }) : new Response(bodyText, { status: cached.status, headers: baseHeaders });
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
      'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker-Proxy',
      'X-Requested-With': 'XMLHttpRequest'
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
          if (!obj || !obj.action) {
            const allowedOrigin = originAllowed ? origin : 'https://xdren98.github.io';
            return new Response(JSON.stringify({ success:false, error:'Bad Request: action mancante', errorCode:'BAD_REQUEST' }), { status:400, headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin': allowedOrigin } });
          }
        } else {
          const params = new URLSearchParams(body || '');
          const a = params.get('action');
          if (a) postAction = a;
          else {
            const allowedOrigin = originAllowed ? origin : 'https://xdren98.github.io';
            return new Response(JSON.stringify({ success:false, error:'Bad Request: action mancante', errorCode:'BAD_REQUEST' }), { status:400, headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin': allowedOrigin } });
          }
        }
      } catch(_) { }
    }

    // Richieste di scrittura: consenti SOLO da origini whitelisted e richiedi credenziali
    if (request.method === 'POST' && postAction && WRITE_ACTIONS.has(postAction)) {
      if (!originAllowed) {
        const fallbackOrigin = 'https://xdren98.github.io';
        return new Response(JSON.stringify({ success:false, error:'Forbidden', errorCode:'ORIGIN_NOT_ALLOWED' }), { status:403, headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin': fallbackOrigin } });
      }
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/(?:^|;\s*)imbriani_token=([^;]+)/);
      const cookieToken = m && m[1] ? m[1] : '';
      const authHeader = request.headers.get('Authorization') || '';
      if (!cookieToken && !authHeader) {
        const allowedOrigin = origin;
        return new Response(JSON.stringify({ success:false, error:'Unauthorized', errorCode:'AUTH_REQUIRED' }), { status:401, headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin': allowedOrigin } });
      }
      // Forward token da cookie come Authorization per Apps Script se manca header
      if (cookieToken && !authHeader) {
        originalParams.set('Authorization', 'Bearer ' + cookieToken);
      }
      try{
        const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
        const now = Date.now();
        const key = ip + ':POST_ADMIN';
        const b = rateBuckets.get(key) || { start: now, count: 0 };
        if (now - b.start > RATE_LIMIT_WINDOW_MS) { b.start = now; b.count = 0; }
        b.count += 1;
        rateBuckets.set(key, b);
      }catch(_){ }
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
    let parsedObj = null;
    try {
      parsedObj = JSON.parse(responseText);
      if (originalParams.get('diag') === '1') { parsedObj.__proxy = { cache: 'MISS', status: upstreamStatus }; }
      payloadText = JSON.stringify(parsedObj);
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
      const etag = await computeETag(payloadText);
      cacheStore.set(entryKey, { ts: Date.now(), payloadText, status: upstreamStatus, etag });
      try {
        if (self.caches && self.caches.default && entryKey) {
          const resp = new Response(payloadText, { status: upstreamStatus, headers: { 'Content-Type':'application/json', 'ETag': etag } });
          await caches.default.put(new Request('https://cache.proxy/' + encodeURIComponent(entryKey)), resp);
        }
      } catch(_){ }
    }

    if (request.method === 'POST' && postAction && WRITE_ACTIONS.has(postAction)) {
      purgeCacheFor(postAction);
    }

    // Costruisci la risposta con CORS
    const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin)) ? origin : 'https://xdren98.github.io';
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Expose-Headers': 'ETag, X-Proxy-Cache',
      'Cache-Control': 'public, max-age=30',
      'Vary': 'Origin, Authorization',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'X-Proxy-Cache':'MISS'
    };
    // Invia credenziali solo se l'origine è esplicitamente consentita
    if (origin && (ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin))) {
      responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    // Imposta cookie HttpOnly per sessioni su azioni di login
    try {
      if (postAction && (postAction === 'adminLogin' || postAction === 'login' || postAction === 'devLogin') && parsedObj && parsedObj.success && parsedObj.token) {
        const maxAge = 3600; // 1h per adminLogin; per login si può estendere
        const cookie = `imbriani_token=${parsedObj.token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}`;
        responseHeaders['Set-Cookie'] = cookie;
      }
    } catch(_) { }

    try { const etagResp = await computeETag(payloadText); if (etagResp) responseHeaders['ETag'] = etagResp; } catch(_){ }
    return isHead ? new Response(null, { status: upstreamStatus, headers: responseHeaders }) : new Response(payloadText, { status: upstreamStatus, headers: responseHeaders });

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
function isAllowedOrigin(origin){
  try{ const u = new URL(origin); if (isLocalOrigin(origin)) return true; if (ALLOWED_ORIGINS.includes(origin)) return true; return ALLOWED_HOST_SUFFIXES.some(suf => u.hostname===suf || u.hostname.endsWith('.'+suf)); }catch(_){ return false; }
}
