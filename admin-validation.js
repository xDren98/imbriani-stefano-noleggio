// admin-validation.js
export function parseDateAnySafe(val){
  if(!val) return null;
  if(val instanceof Date && !isNaN(val.getTime())) return val;
  if(typeof window.parseDateAny === 'function'){
    const d = window.parseDateAny(val); return (d && !isNaN(d.getTime())) ? d : null;
  }
  const d2 = new Date(val); return isNaN(d2.getTime()) ? null : d2;
}

export function cmpStr(a,b){
  const sa = String(a||'').toLowerCase(); const sb = String(b||'').toLowerCase();
  if(sa < sb) return -1; if(sa > sb) return 1; return 0;
}

export function cmpNum(a,b){
  const na = Number(a)||0; const nb = Number(b)||0; return na - nb;
}

export function cmpDate(a,b){
  const da = parseDateAnySafe(a); const db = parseDateAnySafe(b);
  const ta = da ? da.getTime() : 0; const tb = db ? db.getTime() : 0; return ta - tb;
}

export function arrow(dir){ return dir==='asc' ? '▲' : '▼'; }

window.adminValidation = { parseDateAnySafe, cmpStr, cmpNum, cmpDate, arrow };
