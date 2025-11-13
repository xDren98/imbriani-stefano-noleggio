# Cloudflare Worker Proxy Setup (v4)

Guida aggiornata per configurare e pubblicare il Proxy CORS tra frontend e Google Apps Script.

## Funzioni chiave del Proxy
- Origini consentite dinamiche (suffissi host) e locale
- Caching con ETag e supporto `304`/`HEAD`
- TTL personalizzabile via query (`ttl`, ms) e `cache=1`
- Gating scritture su origini non whitelisted
- Inoltro token da cookie HttpOnly → `Authorization` se assente
- Header sicurezza e CORS (`Vary: Origin, Authorization`)

## API URL frontend
Imposta nel `config.js`:
```js
API_URL: 'https://imbriani-proxy.dreenhd.workers.dev'
```

## Pubblicazione con Wrangler v4
### Autenticazione (consigliato: API Token)
1. Dashboard → My Profile → API Tokens → Create Token (template “Edit Cloudflare Workers”)
2. Copia `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`
3. Imposta variabili:
```powershell
setx CLOUDFLARE_API_TOKEN "<TOKEN>"
setx CLOUDFLARE_ACCOUNT_ID "<ACCOUNT_ID>"
```
Apri un nuovo terminale e verifica:
```bash
npx wrangler whoami
```

### Deploy
```bash
npm run proxy:publish  # usa wrangler deploy
```
Output previsto: URL `https://<name>.<account>.workers.dev`

## Test rapidi
```bash
# Salute
curl "https://<worker>.workers.dev/?action=health"

# Versione (due volte per osservare caching)
curl -i "https://<worker>.workers.dev/?action=version"
curl -I "https://<worker>.workers.dev/?action=version"  # HEAD

# Cache con TTL personalizzato
curl "https://<worker>.workers.dev/?action=version&cache=1&ttl=60000"
```

## Risoluzione Problemi
- **Login Google al posto del JSON**: imposta la Web App GAS su “Who has access: Anyone” e usa header `X-Requested-With: XMLHttpRequest` (già gestito dal proxy).
- **CORS**: verifica che l’origine sia consentita (whitelist/suffissi) e preflight OPTIONS risponda con `Access-Control-Allow-*` corretti.
- **Scritture**: origin non whitelisted → `403 ORIGIN_NOT_ALLOWED`.

## Aggiornare il backend senza cambiare URL
```bash
npm run gas:push         # push file in backend/
npx clasp version "auto-deploy"
npx clasp deployments    # trova l'ID della deployment dell'URL in uso
npx clasp deploy -i <DEPLOYMENT_ID> -V <versionNumber>
```
