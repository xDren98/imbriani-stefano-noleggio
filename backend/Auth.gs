function parseToken(e){var a=(e&&e.parameter&&e.parameter.Authorization)||'';if(a){a=a.trim().replace(/^Bearer\s+/i,'');return a}var t=(e&&e.parameter&&e.parameter.token)||'';return t.trim()}
function getProps(){return PropertiesService.getScriptProperties()}
function nowSec(){return Math.floor(Date.now()/1000)}
function base64urlEncode(bytes){var s=Utilities.base64Encode(bytes).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');return s}
function base64urlEncodeString(str){return base64urlEncode(Utilities.newBlob(str).getBytes())}
function getJWTSecret(){var s=getProps().getProperty('JWT_SECRET');return s&&String(s).trim()?s:'change_me_secret'}
function createJWT(payload){var header={alg:'HS256',typ:'JWT'};var h=base64urlEncodeString(JSON.stringify(header));var p=base64urlEncodeString(JSON.stringify(payload));var data=h+'.'+p;var sig=Utilities.computeHmacSha256Signature(data,getJWTSecret());var s=base64urlEncode(sig);return data+'.'+s}
function verifyJWT(token){try{var parts=String(token||'').split('.');if(parts.length!==3)return null;var h=parts[0],p=parts[1],s=parts[2];var data=h+'.'+p;var sig=Utilities.computeHmacSha256Signature(data,getJWTSecret());var s2=base64urlEncode(sig);if(s!==s2)return null;var json=Utilities.newBlob(Utilities.base64Decode(p)).getDataAsString();var payload=JSON.parse(json);if(payload&&payload.exp&&payload.exp<nowSec())return null;return payload}catch(_){return null}}
function putSession(token,session){if(!token)return false;var p=getProps();p.setProperty('SESSION:'+token,JSON.stringify(session));return true}
function getSessionLegacy(token){if(!token)return null;var raw=getProps().getProperty('SESSION:'+token);if(!raw)return null;try{var s=JSON.parse(raw);if(s&&s.exp&&s.exp<nowSec()){revokeSession(token);return null}return s}catch(_){return null}}
function revokeSession(token){if(!token)return false;getProps().deleteProperty('SESSION:'+token);return true}
function getSession(token){if(!token)return null;var jwt=verifyJWT(token);if(jwt)return jwt;return getSessionLegacy(token)}
function isAdmin(token){var s=getSession(token);return !!(s&&String(s.role||'')==='admin')}
function getSessionInfo(token){var s=getSession(token);return{sessionValid:!!s,sessionRole:s?(s.role||'user'):'none'}}
function json(o,code){var t=ContentService.createTextOutput(JSON.stringify(o));t.setMimeType(ContentService.MimeType.JSON);if(code&&t.setStatusCode)t.setStatusCode(code);return t}
