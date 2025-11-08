/**
 * booking-submit.js v8.4: CF-first con "Data inizio validità patente", submit completo, pagina successo con email
 */
(function(){
  // Auto-completamento per CF
  async function autocompleteByCF(inputIdPrefix){
    const cfEl=document.getElementById(inputIdPrefix+'CF');
    if(!cfEl) return; const cf=cfEl.value.trim().toUpperCase();
    if(cf.length!==16) return;
    try{
      const res=await callAPI('autocompletaCliente',{ cf });
      if(res.success&&res.data){
        const d=res.data;
        const set=(id,val)=>{const el=document.getElementById(inputIdPrefix+id); if(el&&!el.value) el.value=val||''};
        set('Nome',d.Nome); set('DataNascita',d.DataNascita); set('LuogoNascita',d.LuogoNascita);
        set('ComuneResidenza',d.ComuneResidenza); set('ViaResidenza',d.ViaResidenza); set('CivicoResidenza',d.CivicoResidenza);
        set('NumeroPatente',d.NumeroPatente); set('DataInizioPatente',d.DataInizioPatente); set('ScadenzaPatente',d.ScadenzaPatente);
        if(inputIdPrefix==='drv1_'){ set('Cellulare',d.Cellulare); set('Email',d.Email); }
        showToast('Dati autista compilati automaticamente','success');
      }
    }catch{}
  }

  // Binding CF handlers
  window.bindCFHandlers=function(){
    ['drv1_','drv2_','drv3_'].forEach(p=>{
      const el=document.getElementById(p+'CF');
      if(el){
        el.addEventListener('blur',()=>autocompleteByCF(p));
        el.addEventListener('change',()=>autocompleteByCF(p));
      }
    });
  }

  // Submit booking completo
  window.submitBooking=async function(){
    try{
      const g=(p,id)=>document.getElementById(p+id)?.value?.trim()||'';
      // Validazione base
      if(!g('drv1_','CF')||!g('drv1_','Nome')){showToast('Completare i dati dell\'autista principale','error'); return}
      
      const payload={
        targa: (window.selectedVehicle?.Targa)||'',
        dataInizio: searchParams.dataInizio, oraInizio: searchParams.oraInizio,
        dataFine: searchParams.dataFine, oraFine: searchParams.oraFine,
        destinazione: searchParams.destinazione||'',
        // Driver 1 (completo con tel/email)
        drv1_CF:g('drv1_','CF'), drv1_Nome:g('drv1_','Nome'), drv1_DataNascita:g('drv1_','DataNascita'), drv1_LuogoNascita:g('drv1_','LuogoNascita'),
        drv1_ComuneResidenza:g('drv1_','ComuneResidenza'), drv1_ViaResidenza:g('drv1_','ViaResidenza'), drv1_CivicoResidenza:g('drv1_','CivicoResidenza'),
        drv1_NumeroPatente:g('drv1_','NumeroPatente'), drv1_DataInizioPatente:g('drv1_','DataInizioPatente'), drv1_ScadenzaPatente:g('drv1_','ScadenzaPatente'),
        drv1_Cellulare:g('drv1_','Cellulare'), drv1_Email:g('drv1_','Email'),
        // Driver 2 (senza tel/email)
        drv2_CF:g('drv2_','CF'), drv2_Nome:g('drv2_','Nome'), drv2_DataNascita:g('drv2_','DataNascita'), drv2_LuogoNascita:g('drv2_','LuogoNascita'),
        drv2_ComuneResidenza:g('drv2_','ComuneResidenza'), drv2_ViaResidenza:g('drv2_','ViaResidenza'), drv2_CivicoResidenza:g('drv2_','CivicoResidenza'),
        drv2_NumeroPatente:g('drv2_','NumeroPatente'), drv2_DataInizioPatente:g('drv2_','DataInizioPatente'), drv2_ScadenzaPatente:g('drv2_','ScadenzaPatente'),
        // Driver 3 (senza tel/email)
        drv3_CF:g('drv3_','CF'), drv3_Nome:g('drv3_','Nome'), drv3_DataNascita:g('drv3_','DataNascita'), drv3_LuogoNascita:g('drv3_','LuogoNascita'),
        drv3_ComuneResidenza:g('drv3_','ComuneResidenza'), drv3_ViaResidenza:g('drv3_','ViaResidenza'), drv3_CivicoResidenza:g('drv3_','CivicoResidenza'),
        drv3_NumeroPatente:g('drv3_','NumeroPatente'), drv3_DataInizioPatente:g('drv3_','DataInizioPatente'), drv3_ScadenzaPatente:g('drv3_','ScadenzaPatente')
      };
      
      showLoader(true,'Invio prenotazione...');
      const res=await callAPI('creaPrenotazione', payload);
      if(res.success){
        showToast('Prenotazione creata: '+res.data.id,'success');
        showSuccessPage(res.data.id, payload.drv1_Email);
      }else{
        showToast(res.message||'Errore creazione','error');
      }
    }catch(e){ 
      console.error('Errore submit:',e);
      showToast('Errore di rete','error'); 
    }finally{ 
      showLoader(false); 
    }
  }

  // Pagina successo con sezione email
  window.showSuccessPage=function(id, currentEmail){
    const root=document.querySelector('.container');
    if(!root) return;
    root.innerHTML=`
      <div class="glass-card p-5">
        <div class="text-center mb-4">
          <h3 class="fw-bold mb-2">✨ Prenotazione creata!</h3>
          <p class="text-muted mb-1">ID: <code class="bg-light px-2 py-1 rounded">${id}</code></p>
          <span class="badge bg-secondary fs-6">Da Confermare</span>
        </div>
        
        ${!currentEmail ? `
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading mb-3">📧 Vuoi ricevere aggiornamenti via email?</h5>
          <p class="mb-3">Se inserisci la tua email riceverai:</p>
          <ul class="mb-3">
            <li>Riepilogo immediato della prenotazione</li>
            <li>Conferma quando un admin approverà la prenotazione</li>
            <li>Promemoria automatico 3 giorni prima della partenza</li>
          </ul>
          <div class="input-group mb-3">
            <input type="email" class="form-control" id="summaryEmail" placeholder="La tua email">
            <button class="btn btn-outline-primary" type="button" onclick="sendSummaryEmail('${id}')">
              <i class="fas fa-paper-plane me-1"></i>Invia Riepilogo
            </button>
          </div>
        </div>
        ` : ''}
        
        <div class="alert alert-success text-start mb-4">
          <h5 class="alert-heading">💡 Suggerimento per il futuro:</h5>
          <p class="mb-0">La prossima volta usa la sezione <strong>"Sei già cliente?"</strong> dalla homepage per accedere più velocemente alle tue prenotazioni e ripetere un ordine!</p>
        </div>
        
        <div class="d-flex gap-2 justify-content-center">
          <a href="index.html" class="btn btn-outline-light">
            <i class="fas fa-home me-1"></i>Torna alla Home
          </a>
          <a href="admin.html?mode=client" class="btn btn-premium">
            <i class="fas fa-user me-1"></i>Area Cliente
          </a>
        </div>
      </div>`;
  }

  // Invio riepilogo email
  window.sendSummaryEmail=async function(bookingId){
    const emailEl=document.getElementById('summaryEmail');
    const email=emailEl?.value?.trim();
    if(!email||!email.includes('@')){showToast('Inserisci un\'email valida','error'); return}
    
    try{
      showLoader(true,'Invio riepilogo...');
      const res=await callAPI('inviaRiepilogo',{idPrenotazione:bookingId,email});
      if(res.success){
        showToast('Riepilogo inviato a '+email,'success');
        emailEl.style.display='none';
        emailEl.nextElementSibling.innerHTML='<i class="fas fa-check text-success"></i> Inviato!';
      }else{
        showToast(res.message||'Errore invio','error');
      }
    }catch(e){
      showToast('Errore di rete','error');
    }finally{
      showLoader(false);
    }
  }
})();
