/* A failed page is explicit, never silently treated as a completed download. */
(() => {
  document.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches('.reader-page-item img')) return;
    const article = image.closest('.reader-page-item');
    if (article.querySelector('.reader-page-recovery')) return;
    const panel = document.createElement('div');
    panel.className = 'reader-page-recovery';
    panel.setAttribute('role', 'status');
    Object.assign(panel.style, {position:'relative',zIndex:'11',lineHeight:'1.5',width:'100%',padding:'32px 20px',background:'#17191f',color:'#f0f1f4',textAlign:'center',minHeight:'140px'});
    const text = document.createElement('p');
    text.textContent = 'Esta página não carregou. Seu progresso foi preservado.';
    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.type = 'button';
    button.textContent = 'Tentar carregar a página';
    panel.append(text, button);
    article.append(panel);
    image.hidden = true;
    image.style.display = 'none';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const response = await fetch(image.src, {cache:'no-store'});
        if (!response.ok) {
          const wait = Math.max(1, Number(response.headers.get('Retry-After')) || 20);
          text.textContent = response.status === 503
            ? 'A fonte pediu uma pausa. Você poderá tentar novamente em aproximadamente ' + Math.ceil(wait / 60) + ' minuto(s).'
            : 'A página ainda não está disponível na fonte. Aguarde antes de tentar novamente.';
          button.textContent = 'Aguardando a fonte';
          setTimeout(() => {
            if (!panel.isConnected) return;
            button.disabled = false;
            button.textContent = 'Tentar carregar a página';
          }, wait * 1000);
          return;
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('invalid image');
        const source = URL.createObjectURL(blob);
        image.addEventListener('load', () => {
          URL.revokeObjectURL(source);
          image.hidden = false;
          image.style.display = '';
          panel.remove();
        }, {once:true});
        image.addEventListener('error', () => {
          URL.revokeObjectURL(source);
          button.disabled = false;
          text.textContent = 'A fonte retornou uma imagem incompleta. Tente novamente mais tarde.';
        }, {once:true});
        image.src = source;
      } catch (_) {
        text.textContent = 'Não foi possível conectar. Confira sua conexão e tente novamente.';
        button.disabled = false;
      }
    });
  }, true);
})();
