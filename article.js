// article.js - handles reactions (likes/emoji) and comments using localStorage
document.addEventListener('DOMContentLoaded', () => {
  const pageKey = window.location.pathname.split('/').pop() || 'index.html';

  // API base: when serving static files from another dev server (e.g. Live Server on :5500)
  // point API calls to localhost:3000 where the Node server runs during development.
  const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0') && (window.location.port && window.location.port !== '3000') ? 'http://localhost:3000' : '';

  // If we're running on GitHub Pages (or other static host) avoid probing /api endpoints
  // because they don't exist there and browsers will log 404s in the console.
  const IS_STATIC_HOST = window.location.hostname.endsWith('.github.io') || window.location.hostname === 'zeke-sys.github.io';

  const apiAvailable = async () => {
    if (IS_STATIC_HOST) return false;
    try { const r = await fetch(API_BASE + '/api/reactions?page='+encodeURIComponent(pageKey)); return r.ok; } catch(e){ return false; }
  };

  // Reactions: try server, fallback to localStorage
  const reactionButtons = document.querySelectorAll('.reaction-btn');
  const reactionsKey = `reactions:${pageKey}`;

  function loadLocalReactions() {
    try { return JSON.parse(localStorage.getItem(reactionsKey)) || {}; } catch(e){return {};}
  }

  function saveLocalReactions(obj) { localStorage.setItem(reactionsKey, JSON.stringify(obj)); }

  async function fetchReactionsFromServer() {
    try {
      const r = await fetch(API_BASE + '/api/reactions?page='+encodeURIComponent(pageKey));
      if(!r.ok) throw new Error('no');
      return await r.json();
    } catch(e){ return null; }
  }

  async function incrementReactionServer(name){
    try{
      const r = await fetch(API_BASE + '/api/reactions', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:pageKey,name})});
      if(!r.ok) throw new Error('bad');
      const j = await r.json();
      return j.count || null;
    }catch(e){return null}
  }

  async function renderReactions(){
    const server = await apiAvailable();
    let data = {};
    if(server){
      const s = await fetchReactionsFromServer(); if(s) data = s;
    } else { data = loadLocalReactions(); }
    reactionButtons.forEach(btn => {
      const name = btn.dataset.name;
      const count = data[name] || 0;
      btn.querySelector('.count').textContent = count;
    });
  }

  reactionButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.name;
      const server = await apiAvailable();
      if(server){
        const newCount = await incrementReactionServer(name);
        if(newCount !== null){ btn.querySelector('.count').textContent = newCount; return; }
      }
      const data = loadLocalReactions();
      data[name] = (data[name] || 0) + 1;
      saveLocalReactions(data);
      renderReactions();
    });
  });

  renderReactions();

  // Comments: try server, fallback to localStorage
  const commentsForm = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');
  const commentsKey = `comments:${pageKey}`;

  function loadLocalComments(){
    try { return JSON.parse(localStorage.getItem(commentsKey)) || []; } catch(e){ return []; }
  }
  function saveLocalComments(arr){ localStorage.setItem(commentsKey, JSON.stringify(arr)); }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function fetchCommentsFromServer(){
    try{ const r = await fetch(API_BASE + '/api/comments?page='+encodeURIComponent(pageKey)); if(!r.ok) throw new Error('bad'); return await r.json(); } catch(e){ return null; }
  }

  function renderCommentsFromArray(items){
    if(!commentsList) return;
    commentsList.innerHTML = '';
    items.slice().reverse().forEach(c => {
      const el = document.createElement('div');
      el.className = 'comment';
      const email = c.email || '';
      const avatarUrl = email ? ('https://www.gravatar.com/avatar/'+md5(email.trim().toLowerCase())+'?d=identicon&s=48') : ('https://www.gravatar.com/avatar/?d=identicon&s=48');
      const html = `
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${avatarUrl}" width="48" height="48" style="border-radius:6px;" alt="avatar" />
          <div style="flex:1">
            <div class="comment-meta"><strong>${escapeHtml(c.name||'Anonymous')}</strong> <span class="time">${escapeHtml(c.time||'')}</span></div>
            <div class="comment-body">${DOMPurify.sanitize(marked.parse(c.text||''))}</div>
          </div>
        </div>
      `;
      el.innerHTML = html;
      commentsList.appendChild(el);
    });
  }

  async function renderComments(){
    const server = await apiAvailable();
    if(server){
      const s = await fetchCommentsFromServer(); if(s) { renderCommentsFromArray(s); return; }
    }
    const items = loadLocalComments(); renderCommentsFromArray(items);
  }

  async function postCommentToServer(name, text, honeypot, email, recaptchaToken){
    try{
      const body = { page: pageKey, name, text, honeypot };
      if(email) body.email = email;
      if(recaptchaToken) body.recaptchaToken = recaptchaToken;
      const r = await fetch(API_BASE + '/api/comments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok) return await r.json();
      return await r.json();
    }catch(e){return null}
  }

  if(commentsForm){
    commentsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (commentsForm.querySelector('#comment-name')||{}).value.trim();
      const email = (commentsForm.querySelector('#comment-email')||{}).value.trim();
      const text = (commentsForm.querySelector('#comment-text')||{}).value.trim();
      if(!text) return;
      const honeypot = (commentsForm.querySelector('#comment-hp')||{}).value || '';
      const server = await apiAvailable();
      if(server){
        // try to get recaptcha token if site key present
        let recaptchaToken = '';
        try{
          const siteKeyMeta = document.querySelector('meta[name="recaptcha-site-key"]');
          const siteKey = siteKeyMeta && siteKeyMeta.content;
          if(siteKey && window.grecaptcha && grecaptcha.execute){
            recaptchaToken = await grecaptcha.execute(siteKey, {action:'submit'});
          }
        }catch(e){}
        const res = await postCommentToServer(name, text, honeypot, email, recaptchaToken);
        if(res && res.awaitingModeration){
          // show notice
          const info = document.createElement('div'); info.style.marginTop='8px'; info.style.color='var(--muted)'; info.textContent = 'Thanks — your comment is submitted and awaiting moderation.';
          commentsForm.appendChild(info);
          commentsForm.reset();
          return;
        }
      }
      // fallback: save locally and render
      const items = loadLocalComments();
      const now = new Date();
      items.push({ name: name || 'Anonymous', email: email || '', text, time: now.toLocaleString() });
      saveLocalComments(items);
      commentsForm.reset();
      renderComments();
    });
  }

  renderComments();
});

// Markdown preview and emoji picker
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.querySelector('#comment-text');
  if(!textarea) return;
  const preview = document.createElement('div'); preview.className='comment-preview'; preview.style.marginTop='8px'; preview.style.padding='8px'; preview.style.border='1px dashed rgba(255,255,255,0.04)';
  textarea.parentNode.insertBefore(preview, textarea.nextSibling);
  const doPreview = () => { try{ preview.innerHTML = DOMPurify.sanitize(marked.parse(textarea.value || '')); }catch(e){ preview.textContent = textarea.value; } };
  textarea.addEventListener('input', doPreview);
  doPreview();

  // Emoji picker for reactions
  const picker = document.createElement('div'); picker.style.display='flex'; picker.style.gap='8px'; picker.style.marginTop='6px';
  const emojis = ['👍','❤️','🎉','🔥','👀','🤔'];
  emojis.forEach(e=>{ const b = document.createElement('button'); b.type='button'; b.className='reaction-picker-btn'; b.dataset.emoji = e; b.innerHTML = `${e}`; b.style.padding='6px 10px'; b.addEventListener('click', async ()=>{
      const name = 'emoji_' + e.codePointAt(0).toString(16);
      const server = await apiAvailable();
      if(server){
        await fetch(API_BASE + '/api/reactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:window.location.pathname.split('/').pop(),name})});
      const r = await fetch(API_BASE + '/api/reactions?page='+encodeURIComponent(window.location.pathname.split('/').pop()));
        const j = await r.json();
        // update counts in UI
        document.querySelectorAll(`.reaction-btn[data-name="${name}"]`).forEach(btn=>{ btn.querySelector('.count').textContent = j[name] || 0; });
      } else {
        const key = 'reactions:'+window.location.pathname.split('/').pop(); const d = JSON.parse(localStorage.getItem(key)||'{}'); d[name] = (d[name]||0)+1; localStorage.setItem(key, JSON.stringify(d));
        document.querySelectorAll(`.reaction-btn[data-name="${name}"]`).forEach(btn=>{ btn.querySelector('.count').textContent = d[name]; });
      }
    }); picker.appendChild(b); });
  const area = document.querySelector('.reactions'); if(area) area.appendChild(picker);
});
