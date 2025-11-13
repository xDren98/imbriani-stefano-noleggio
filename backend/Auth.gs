function parseToken(e){var a=(e&&e.parameter&&e.parameter.Authorization)||'';if(a){a=a.trim().replace(/^Bearer\s+/i,'');return a}var t=(e&&e.parameter&&e.parameter.token)||'';return t.trim()}
function getProps(){return PropertiesService.getScriptProperties()}
function nowSec(){return Math.floor(Date.now()/1000)}
function putSession(token,session){if(!token)return false;var p=getProps();p.setProperty('SESSION:'+token,JSON.stringify(session));return true}
function getSession(token){if(!token)return null;var raw=getProps().getProperty('SESSION:'+token);if(!raw)return null;try{var s=JSON.parse(raw);if(s&&s.exp&&s.exp<nowSec()){revokeSession(token);return null}return s}catch(_){return null}}
function revokeSession(token){if(!token)return false;getProps().deleteProperty('SESSION:'+token);return true}
function isAdmin(token){var s=getSession(token);return !!(s&&String(s.role||'')==='admin')}
function getSessionInfo(token){var s=getSession(token);return{sessionValid:!!s,sessionRole:s?(s.role||'user'):'none'}}
function json(o,code){var t=ContentService.createTextOutput(JSON.stringify(o));t.setMimeType(ContentService.MimeType.JSON);if(code&&t.setStatusCode)t.setStatusCode(code);return t}
