/**
 * submitBooking completo: invio dati autisti + autocompilazione CF
 */
(function(){
  async function autocompleteByCF(inputIdPrefix){
    const cfEl=document.getElementById(inputIdPrefix+'CF');
    if(!cfEl) return; const cf=cfEl.value.trim().toUpperCase();
    if(cf.length!==16) return;
    try{
      const res=await callAPI('autocompletaCliente',{ cf });
      if(res.success&&res.data){
        const d=res.data; const set=(id,val)=>{const el=document.getElementById(inputIdPrefix+id); if(el&&!el.value) el.value=val||''};
        set('NomeCompleto',d.NomeCompleto); set('DataNascita',d.DataNascita); set('LuogoNascita',d.LuogoNascita);
        set('Via',d.Via); set('Civico',d.Civico); set('Comune',d.Comune); set('Patente',d.Patente); set('ScadenzaPatente',d.ScadenzaPatente);
        if(inputIdPrefix==='drv1_'){ set('Telefono',d.Telefono); set('Email',d.Email); }
        showToast('Dati autista compilati automaticamente','success');
      }
    }catch{}
  }

  window.bindCFHandlers=function(){
    ['drv1_','drv2_','drv3_'].forEach(p=>{
      const el=document.getElementById(p+'CF'); if(el){ el.addEventListener('blur',()=>autocompleteByCF(p)); el.addEventListener('change',()=>autocompleteByCF(p)); }
    });
  }

  window.submitBooking=async function(){
    try{
      const g=(p,id)=>document.getElementById(p+id)?.value?.trim()||'';
      const payload={
        targa: (window.selectedVehicle?.Targa)||'',
        dataInizio: searchParams.dataInizio, oraInizio: searchParams.oraInizio,
        dataFine: searchParams.dataFine, oraFine: searchParams.oraFine,
        destinazione: searchParams.destinazione||'',
        drv1_CF:g('drv1_','CF'), drv1_NomeCompleto:g('drv1_','NomeCompleto'), drv1_DataNascita:g('drv1_','DataNascita'), drv1_LuogoNascita:g('drv1_','LuogoNascita'), drv1_Via:g('drv1_','Via'), drv1_Civico:g('drv1_','Civico'), drv1_Comune:g('drv1_','Comune'), drv1_Patente:g('drv1_','Patente'), drv1_ScadenzaPatente:g('drv1_','ScadenzaPatente'), drv1_Telefono:g('drv1_','Telefono'), drv1_Email:g('drv1_','Email'),
        drv2_CF:g('drv2_','CF'), drv2_NomeCompleto:g('drv2_','NomeCompleto'), drv2_DataNascita:g('drv2_','DataNascita'), drv2_LuogoNascita:g('drv2_','LuogoNascita'), drv2_Via:g('drv2_','Via'), drv2_Civico:g('drv2_','Civico'), drv2_Comune:g('drv2_','Comune'), drv2_Patente:g('drv2_','Patente'), drv2_ScadenzaPatente:g('drv2_','ScadenzaPatente'),
        drv3_CF:g('drv3_','CF'), drv3_NomeCompleto:g('drv3_','NomeCompleto'), drv3_DataNascita:g('drv3_','DataNascita'), drv3_LuogoNascita:g('drv3_','LuogoNascita'), drv3_Via:g('drv3_','Via'), drv3_Civico:g('drv3_','Civico'), drv3_Comune:g('drv3_','Comune'), drv3_Patente:g('drv3_','Patente'), drv3_ScadenzaPatente:g('drv3_','ScadenzaPatente')
      };
      showLoader(true,'Invio prenotazione...');
      const res=await callAPI('creaPrenotazione', payload);
      if(res.success){
        showToast('Prenotazione inviata: '+res.data.id,'success');
        showSuccessPage(res.data.id);
      }else{
        showToast(res.message||'Errore invio prenotazione','error');
      }
    }catch(e){ showToast('Errore di rete','error'); }
    finally{ showLoader(false); }
  }

  window.showSuccessPage=function(id){
    const root=document.querySelector('.container');
    if(!root) return;
    root.innerHTML=`
      <div class="glass-card p-5 text-center">
        <h3 class="fw-bold mb-1">Prenotazione inviata!</h3>
        <p class="text-muted">ID: <code>${id}</code> — Stato: <span class="badge bg-secondary">Da Confermare</span></p>
        <div class="alert alert-info text-start mt-4">
          <strong>Suggerimento:</strong> la prossima volta usa la sezione "Sei già cliente?" per accedere più velocemente, gestire e ripetere le tue prenotazioni.
        </div>
        <div class="d-flex gap-2 justify-content-center mt-3">
          <a href="index.html" class="btn btn-outline-light">Torna alla Home</a>
          <a href="#" class="btn btn-premium">Area Cliente</a>
        </div>
      </div>`;
  }
})();
