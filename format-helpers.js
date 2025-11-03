// loader to format dates italian and step control added
(function(){
  window.formatItalianDateTime = function(dateISO, time){
    try{ const d=new Date(dateISO); return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) + (time?` ${time}`:''); }catch{return `${dateISO} ${time||''}`}
  }
})();
