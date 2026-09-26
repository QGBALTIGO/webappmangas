/* Account linking is explicit; only signed Telegram requests reach the bridge. */
(() => {
  const request = (path='',method='GET',body) => api('/api/aninexus'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  let connection=null, checking=false;
  function message(text){const el=document.getElementById('anxConnectionStatus');if(el)el.textContent=text;}
  async function refresh(){
    if(checking)return;checking=true;
    try{connection=await request();renderConnection();}
    catch{message('Não foi possível verificar a conexão. Tente novamente.');}
    finally{checking=false;}
  }
  function renderConnection(){
    let box=document.getElementById('anxConnectBox');
    if(!box){box=document.createElement('section');box.id='anxConnectBox';box.className='anx-connect';document.getElementById('profileInfoSection')?.before(box);}
    const connected=connection?.connected;
    if(connection?.available===false){
      box.innerHTML='<h2>Sua leitura no AniNexus</h2><p>A conexão está temporariamente indisponível enquanto o AniNexus é atualizado. Seus favoritos e sua leitura continuam salvos aqui.</p><button class="btn btn-ghost" id="anxRetry">Verificar disponibilidade</button><div class="anx-status" id="anxConnectionStatus" role="status">Nenhuma alteração será enviada sem sua autorização.</div>';
      document.getElementById('anxRetry').onclick=refresh;return;
    }
    box.innerHTML=`<h2>Sua leitura no AniNexus</h2><p>${connected?`Conectado a ${esc(connection.name||'sua conta')}. Novos favoritos e capítulos concluídos são enviados automaticamente.`:'Conecte sua conta para enviar favoritos, status e progresso de leitura. Você autoriza a conexão no próprio AniNexus.'}</p>
      <button class="btn btn-primary" id="anxConnectAction">${connected?'Abrir AniNexus':'Conectar AniNexus'}</button>
      ${connected?'<button class="btn btn-ghost" id="anxImport">Enviar favoritos atuais</button><button class="btn btn-ghost" id="anxDisconnect">Desconectar</button>':'<button class="btn btn-ghost" id="anxCheck">Verificar conexão</button>'}
      <div id="anxConnectionStatus" class="anx-status" role="status">${connected?(connection.pending?`${connection.pending} atualização(ões) aguardando envio.`:'Sincronização ativa.'):connection?.pendingApproval?'Autorize no AniNexus e toque em Verificar conexão.':'Seus dados continuam salvos no webapp.'}</div>`;
    document.getElementById('anxConnectAction').onclick=async()=>{
      if(connected){openExternal('https://aninexus.com.br');return;}
      if(!hasTelegramAuth()){message('Abra este webapp pelo bot no Telegram para conectar sua conta.');return;}
      const btn=document.getElementById('anxConnectAction');btn.disabled=true;
      try{const result=await request('/connect','POST',{});openExternal(result.url);connection={pendingApproval:true};message('Autorize a conexão no AniNexus e volte para verificar.');}
      catch{message('Não foi possível iniciar a conexão. Tente novamente.');}
      finally{btn.disabled=false;}
    };
    document.getElementById('anxCheck')?.addEventListener('click',refresh);
    document.getElementById('anxImport')?.addEventListener('click',async()=>{try{const r=await request('/import-favorites','POST',{});message(`${r.queued} favorito(s) na fila de sincronização.`);}catch{message('Não foi possível enviar os favoritos agora.');}});
    document.getElementById('anxDisconnect')?.addEventListener('click',async()=>{if(!confirm('Desconectar do AniNexus? Os dados já enviados serão mantidos.'))return;try{await request('','DELETE');connection=null;renderConnection();}catch{message('Não foi possível revogar a conexão. Tente novamente.');}});
  }
  function openExternal(url){if(tg?.openLink)tg.openLink(url);else window.open(url,'_blank','noopener,noreferrer');}
  const originalProfile=openProfilePage;
  openProfilePage=function(...args){const result=originalProfile(...args);renderConnection();if(hasTelegramAuth())refresh();return result;};
  const originalDetail=renderDetail;
  renderDetail=function(bundle,...args){
    const result=originalDetail(bundle,...args);
    const host=document.querySelector('#detailPage .detail-body');
    if(host){
      const control=document.createElement('div');control.className='anx-reading';
      control.innerHTML='<label for="anxReadingStatus">Adicionar à lista do AniNexus</label><select id="anxReadingStatus"><option value="">Escolher status de leitura</option><option value="CURRENT">Estou lendo</option><option value="PLANNING">Quero ler</option><option value="COMPLETED">Concluído</option><option value="PAUSED">Em pausa</option><option value="DROPPED">Abandonei</option></select><small class="anx-status" id="anxReadingFeedback"></small>';
      host.prepend(control);
      control.querySelector('select').onchange=async event=>{
        if(!event.target.value)return;event.target.disabled=true;
        const status=control.querySelector('small');
        try{await request('/reading','POST',{title_id:bundle.title_id,status:event.target.value});status.textContent='Salvo na fila de sincronização com o AniNexus.';}
        catch(error){status.textContent=error.status===409||error.status===401?'Conecte sua conta em Perfil → AniNexus.':'Não foi possível salvar. Tente novamente.';event.target.value='';}
        finally{event.target.disabled=false;}
      };
    }
    return result;
  };
  if(state.currentPage==='profilePage'){renderConnection();if(hasTelegramAuth())refresh();}
  if(state.currentPage==='detailPage'&&state.currentTitleBundle)renderDetail(state.currentTitleBundle);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.currentPage==='profilePage'&&hasTelegramAuth())refresh();});
})();
