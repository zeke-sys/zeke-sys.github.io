// article.js - client-only reactions (localStorage). No server or comments.
document.addEventListener('DOMContentLoaded', () => {
  const pageKey = window.location.pathname.split('/').pop() || 'index.html';
  const reactionsKey = `reactions:${pageKey}`;

  function loadReactions() {
    try { return JSON.parse(localStorage.getItem(reactionsKey)) || {}; } catch (e) { return {}; }
  }

  function saveReactions(obj) { localStorage.setItem(reactionsKey, JSON.stringify(obj)); }

  const reactionButtons = Array.from(document.querySelectorAll('.reaction-btn'));

  function renderReactions() {
    const data = loadReactions();
    reactionButtons.forEach(btn => {
      const name = btn.dataset.name;
      const count = data[name] || 0;
      const span = btn.querySelector('.count');
      if (span) span.textContent = count;
    });
  }

  reactionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const data = loadReactions();
      data[name] = (data[name] || 0) + 1;
      saveReactions(data);
      renderReactions();
    });
  });

  // Emoji picker (client-only)
  const emojis = ['👍','❤️','🎉','🔥','👀','🤔'];
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.style.display = 'flex';
  picker.style.gap = '8px';
  picker.style.marginTop = '6px';

  emojis.forEach(e => {
    const code = 'emoji_' + e.codePointAt(0).toString(16);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reaction-picker-btn';
    b.textContent = e;
    b.style.padding = '6px 10px';
    b.addEventListener('click', () => {
      const data = loadReactions();
      data[code] = (data[code] || 0) + 1;
      saveReactions(data);
      // update any matching buttons
      document.querySelectorAll(`.reaction-btn[data-name="${code}"]`).forEach(btn => {
        const span = btn.querySelector('.count'); if (span) span.textContent = data[code];
      });
      renderReactions();
    });
    picker.appendChild(b);
  });

  const area = document.querySelector('.reactions'); if (area) area.appendChild(picker);

  renderReactions();
  // Replace any existing comments UI with a static notice (matches admin.html)
  const commentSections = document.querySelectorAll('section.comments');
  if (commentSections && commentSections.length) {
    const noticeHTML = `
      <h3>Comments</h3>
      <div class="comment notice">
        <p>Comments have been removed. Emoji reactions are client-only and stored in your browser.</p>
        <p>If you'd like comments restored, email <a href="mailto:zek3.isaac@gmail.com">zek3.isaac@gmail.com</a>.</p>
      </div>
    `;
    commentSections.forEach(s => { s.innerHTML = noticeHTML; });
  }
});
