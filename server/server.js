// load local .env in development (ignored by .gitignore)
try{ require('dotenv').config(); }catch(e){}
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const REACTIONS_FILE = path.join(DATA_DIR, 'reactions.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme_demo_token';
const SESSIONS_FILE = path.join(DATA_DIR, 'admin-sessions.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

// simple in-memory admin session tokens (token -> {user, expires})
const adminSessions = new Map();

// rate limit settings configurable via env
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || String(60 * 1000), 10); // 1 minute
const RATE_MAX = parseInt(process.env.RATE_MAX || '10', 10);

app.use(cors());
app.use(express.json());

// simple request logging for debugging
app.use((req, res, next)=>{
  try{ console.log('[req]', req.method, req.path); }catch(e){}
  next();
});

// serve static files (articles, assets) from repo root
app.use(express.static(path.join(__dirname, '..')));

// basic rate limiting for comment submissions
const limiter = rateLimit({ windowMs: RATE_WINDOW_MS, max: RATE_MAX });
app.use('/api/comments', limiter);

async function readJSON(file, fallback) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text || 'null') || fallback;
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(file, obj){
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
}

// load persisted admin sessions on startup
(async function loadSessions(){
  try{
    const s = await readJSON(SESSIONS_FILE, {});
    Object.keys(s).forEach(token => {
      const rec = s[token];
      if(rec && rec.expires && rec.expires > Date.now()) adminSessions.set(token, rec);
    });
  }catch(e){ }
})();

// ensure auth hashed password persisted (if not present, hash ADMIN_PASS and save)
(async function ensureAuth(){
  try{
    const auth = await readJSON(AUTH_FILE, null);
    const bcrypt = require('bcryptjs');
    if(!auth || !auth.hash){
      const hash = bcrypt.hashSync(ADMIN_PASS, 10);
      await writeJSON(AUTH_FILE, { user: ADMIN_USER, hash });
      console.log('Wrote initial auth hash to', AUTH_FILE);
    }
  }catch(e){ console.error('auth init error', e); }
})();

// GET reactions for page
app.get('/api/reactions', async (req, res) => {
  const page = req.query.page || 'index';
  const reactions = await readJSON(REACTIONS_FILE, {});
  res.json(reactions[page] || {});
});

// POST reaction increment
app.post('/api/reactions', async (req, res) => {
  const { page, name } = req.body || {};
  if (!page || !name) return res.status(400).json({ error: 'invalid' });
  const reactions = await readJSON(REACTIONS_FILE, {});
  reactions[page] = reactions[page] || {};
  reactions[page][name] = (reactions[page][name] || 0) + 1;
  await writeJSON(REACTIONS_FILE, reactions);
  res.json({ ok: true, count: reactions[page][name] });
});

// GET comments (only approved by default)
app.get('/api/comments', async (req, res) => {
  const page = req.query.page || 'index';
  const approvedOnly = req.query.approved !== 'false';
  const all = await readJSON(COMMENTS_FILE, {});
  const list = (all[page] || []).filter(c => !approvedOnly || c.approved === true);
  res.json(list);
});

// Simple word filter (very small sample list)
const BAD_WORDS = (process.env.BAD_WORDS || 'spamword1,viagra,casino').split(',').map(s=>s.trim()).filter(Boolean);
function containsBadWords(s){
  const low = (s||'').toLowerCase();
  return BAD_WORDS.some(b => low.includes(b));
}

// reCAPTCHA verification if configured (uses global fetch or undici fallback)
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
const RECAPTCHA_THRESHOLD = parseFloat(process.env.RECAPTCHA_THRESHOLD || '0.5');

// optional email verification and per-ip+email throttling
const ENABLE_EMAIL_VERIFICATION = (process.env.ENABLE_EMAIL_VERIFICATION || 'false') === 'true';
const VERIFY_FILE = path.join(DATA_DIR, 'verify.json');
const IMPORT_AUDIT_FILE = path.join(DATA_DIR, 'import-audit.json');
const EMAIL_RATE_WINDOW_MS = parseInt(process.env.EMAIL_RATE_WINDOW_MS || String(60 * 60 * 1000), 10); // 1 hour
const EMAIL_RATE_MAX = parseInt(process.env.EMAIL_RATE_MAX || '10', 10);
const emailRateMap = new Map(); // key -> [timestamps]
async function verifyRecaptcha(token, remoteip){
  if(!RECAPTCHA_SECRET) return { success: true, note: 'recaptcha not configured' };
  let fetchImpl = globalThis.fetch;
  if(!fetchImpl){
    try{ fetchImpl = require('undici').fetch; }catch(e){ }
  }
  if(!fetchImpl) return { success: false, error: 'fetch_not_available' };
  try{
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET);
    params.append('response', token);
    if(remoteip) params.append('remoteip', remoteip);
    const resp = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    return await resp.json();
  }catch(e){
    return { success: false, error: 'recaptcha-fail' };
  }
}

// POST new comment
app.post('/api/comments', async (req, res) => {
  const { page, name, text, honeypot, email, recaptchaToken } = req.body || {};
  if (honeypot) return res.status(400).json({ error: 'spam' });
  if (!page || !text) return res.status(400).json({ error: 'invalid' });
  if (containsBadWords(text) || containsBadWords(name) || containsBadWords(email)) return res.status(400).json({ error: 'profanity' });

  // per-IP+email throttling
  try{
    const ip = req.ip || req.connection.remoteAddress || '';
    const key = ip + '|' + (email||'');
    const now = Date.now();
    const arr = emailRateMap.get(key) || [];
    const windowStart = now - EMAIL_RATE_WINDOW_MS;
    const recent = arr.filter(ts => ts > windowStart);
    if(recent.length >= EMAIL_RATE_MAX) return res.status(429).json({ error: 'rate_limited' });
    recent.push(now);
    emailRateMap.set(key, recent);
  }catch(e){}

  // verify recaptcha if configured
  if(RECAPTCHA_SECRET){
    const result = await verifyRecaptcha(recaptchaToken, req.ip);
    if(!result || !result.success){
      return res.status(400).json({ error: 'recaptcha_failed', details: result });
    }
    // if score available and below threshold, flag the comment for manual review
    if(typeof result.score === 'number' && result.score < RECAPTCHA_THRESHOLD){
      // still save but mark flagged
      const all = await readJSON(COMMENTS_FILE, {});
      all[page] = all[page] || [];
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      const item = { id, name: name || 'Anonymous', email: email || '', text, time: new Date().toISOString(), approved: false, flagged: true, recaptchaScore: result.score };
      all[page].push(item);
      await writeJSON(COMMENTS_FILE, all);
      return res.json({ ok: true, awaitingModeration: true, flagged: true });
    }
  }

  // optional email verification flow
  if(ENABLE_EMAIL_VERIFICATION && email){
    const all = await readJSON(COMMENTS_FILE, {});
    all[page] = all[page] || [];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const item = { id, name: name || 'Anonymous', email: email || '', text, time: new Date().toISOString(), approved: false, verified: false };
    all[page].push(item);
    await writeJSON(COMMENTS_FILE, all);
    // create verification token
    const token = require('crypto').randomBytes(18).toString('hex');
    const verify = await readJSON(VERIFY_FILE, {});
    verify[token] = { page, id, email, expires: Date.now() + (1000 * 60 * 60 * 24) }; // 24h
    await writeJSON(VERIFY_FILE, verify);
    // in production send email; here we log link for demo only in non-production
    if((process.env.NODE_ENV || 'development') !== 'production'){
      console.log(`Email verification link: http://localhost:${process.env.PORT||3000}/api/verify-email?token=${token}`);
    }
    return res.json({ ok: true, awaitingVerification: true });
  }

  const all = await readJSON(COMMENTS_FILE, {});
  all[page] = all[page] || [];
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const item = { id, name: name || 'Anonymous', email: email || '', text, time: new Date().toISOString(), approved: false };
  all[page].push(item);
  await writeJSON(COMMENTS_FILE, all);
  res.json({ ok: true, awaitingModeration: true });
});

// Admin endpoints (token-based basic protection for demo only)
// Admin: simple login to obtain short-lived token
app.post('/api/admin/login', async (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'missing' });
  // verify against stored hash
  const bcrypt = require('bcryptjs');
  const auth = await readJSON(AUTH_FILE, null);
  const storedUser = (auth && auth.user) ? auth.user : ADMIN_USER;
  const storedHash = (auth && auth.hash) ? auth.hash : null;
  if(!storedHash || user !== storedUser || !bcrypt.compareSync(pass, storedHash)) return res.status(401).json({ error: 'invalid' });
  const token = require('crypto').randomBytes(24).toString('hex');
  const expires = Date.now() + (parseInt(process.env.ADMIN_SESSION_MS || String(1000 * 60 * 60), 10)); // default 1h
  adminSessions.set(token, { user, expires });
  // persist sessions
  (async ()=>{ try{ const obj = {}; adminSessions.forEach((v,k)=>{ obj[k]=v }); await writeJSON(SESSIONS_FILE, obj); }catch(e){} })();
  res.json({ ok: true, token, expires });
});

// admin logout
app.post('/api/admin/logout', async (req, res) => {
  const auth = (req.headers.authorization || '').split(' ');
  const token = auth[0] === 'Bearer' ? auth[1] : (req.query.token || '');
  if(token && adminSessions.has(token)){
    adminSessions.delete(token);
    try{ const obj = {}; adminSessions.forEach((v,k)=>{ obj[k]=v }); await writeJSON(SESSIONS_FILE, obj); }catch(e){}
  }
  res.json({ ok: true });
});

// change admin password (requires admin token)
app.post('/api/admin/change-password', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const { current, next } = req.body || {};
  if (!current || !next) return res.status(400).json({ error: 'missing' });
  try{
    const bcrypt = require('bcryptjs');
    const auth = await readJSON(AUTH_FILE, null);
    const storedHash = (auth && auth.hash) ? auth.hash : null;
    if(!storedHash || !bcrypt.compareSync(current, storedHash)) return res.status(401).json({ error: 'invalid_current' });
    const newHash = bcrypt.hashSync(next, 10);
    await writeJSON(AUTH_FILE, { user: auth.user || ADMIN_USER, hash: newHash });
    return res.json({ ok: true });
  }catch(e){ return res.status(500).json({ error: 'server_error' }); }
});

// rotate admin password and invalidate all sessions (requires admin token and current password)
app.post('/api/admin/rotate-password', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const { current, newPassword } = req.body || {};
  if (!current || !newPassword) return res.status(400).json({ error: 'missing' });
  try{
    const bcrypt = require('bcryptjs');
    const auth = await readJSON(AUTH_FILE, null) || {};
    const storedHash = (auth && auth.hash) ? auth.hash : null;
    if(!storedHash || !bcrypt.compareSync(current, storedHash)) return res.status(401).json({ error: 'invalid_current' });
    const newHash = bcrypt.hashSync(newPassword, 10);
    await writeJSON(AUTH_FILE, { user: auth.user || ADMIN_USER, hash: newHash });
    // invalidate all existing admin sessions
    adminSessions.clear();
    try{ await writeJSON(SESSIONS_FILE, {}); }catch(e){}
    if((process.env.NODE_ENV || 'development') !== 'production') console.log('Admin password rotated and sessions invalidated');
    return res.json({ ok: true });
  }catch(e){ return res.status(500).json({ error: 'server_error' }); }
});

// email verification endpoint (demo)
app.get('/api/verify-email', async (req, res) => {
  const token = req.query.token;
  if(!token) return res.status(400).send('missing token');
  const verify = await readJSON(VERIFY_FILE, {});
  const rec = verify[token];
  if(!rec) return res.status(404).send('invalid or expired');
  if(rec.expires < Date.now()) { delete verify[token]; await writeJSON(VERIFY_FILE, verify); return res.status(410).send('expired'); }
  // mark comment as verified
  const all = await readJSON(COMMENTS_FILE, {});
  const page = rec.page;
  const id = rec.id;
  (all[page] || []).forEach(c => { if(c.id === id) c.verified = true; });
  await writeJSON(COMMENTS_FILE, all);
  delete verify[token];
  await writeJSON(VERIFY_FILE, verify);
  res.send('Email verified — awaiting moderation.');
});

function checkAdminToken(req){
  // Bearer header or query param
  const auth = (req.headers.authorization || '').split(' ');
  const token = auth[0] === 'Bearer' ? auth[1] : (req.query.token || '');
  if(!token) return false;
  const s = adminSessions.get(token);
  if(!s) return false;
  if(s.expires < Date.now()){ adminSessions.delete(token); return false; }
  return true;
}

app.get('/api/admin/comments', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const all = await readJSON(COMMENTS_FILE, {});
  res.json(all);
});

app.post('/api/admin/comments/:id/approve', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = req.params.id;
  const all = await readJSON(COMMENTS_FILE, {});
  let changed = false;
  // allow explicit approved:true/false in the request body, default to approving when omitted
  const hasApproved = req.body && Object.prototype.hasOwnProperty.call(req.body, 'approved');
  const setApproved = hasApproved ? !!req.body.approved : true;
  Object.keys(all).forEach(page => {
    all[page] = (all[page] || []).map(c => { if (c.id === id) { changed = true; return { ...c, approved: setApproved }; } return c; });
  });
  if (changed) await writeJSON(COMMENTS_FILE, all);
  res.json({ ok: true });
});

// Admin bulk import comments (requires admin token)
// Accepts either: { page: 'page.html', comments: [ { id?, name, email, text, time? }, ... ] }
// or an array of the above objects. Imported comments are written with approved:false by default.
app.post('/api/admin/import-comments', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const body = req.body;
  if(!body) return res.status(400).json({ error: 'missing_body' });
  const preview = (req.query.preview === 'true') || (body && body.preview === true);
  // helper to get admin user performing the action
  function getAdminUserFromReq(r){ const a=(r.headers.authorization||'').split(' '); const tok = a[0]==='Bearer'?a[1]:(r.query.token||''); if(!tok) return null; const s = adminSessions.get(tok); return s? s.user : null; }
  try{
    // Accept several formats:
    // - Array of { page, comments }
    // - Single { page, comments }
    // - { pages: [...] } or { imports: [...] }
    // - Mapping { 'page.html': [ ... ], 'other.html': [ ... ] }
    let toProcess = null;
    if (Array.isArray(body)) toProcess = body;
    else if (body.pages) toProcess = body.pages;
    else if (body.imports) toProcess = body.imports;
    else if (body.page && body.comments) toProcess = [body];
    else {
      // detect mapping of page->array
      const keys = Object.keys(body||{});
      const looksLikeMap = keys.length && keys.every(k => Array.isArray(body[k]));
      if (looksLikeMap) {
        toProcess = keys.map(k=>({ page: k, comments: body[k] }));
      }
    }
    if(!toProcess) return res.status(400).json({ error: 'invalid_format' });
    if(!toProcess) return res.status(400).json({ error: 'invalid_format' });
    const all = await readJSON(COMMENTS_FILE, {});
    const summary = {};
    // build existing dedupe set per page
    const existingMap = {};
    Object.keys(all).forEach(p => {
      existingMap[p] = new Set((all[p]||[]).map(x => ((x.email||'').trim().toLowerCase()) + '|' + (x.text||'')));
    });
    const previewPages = {};
    for(const bucket of toProcess){
      const page = bucket.page;
      const comments = bucket.comments || bucket.items || [];
      if(!page || !Array.isArray(comments)) continue;
      all[page] = all[page] || [];
      summary[page] = summary[page] || { imported:0, skipped:0 };
      previewPages[page] = previewPages[page] || [];
      // limit items per page for safety
      const limit = 1000;
      for(const c of comments.slice(0, limit)){
        const name = (c.name||'Anonymous').toString().slice(0,200);
        const email = (c.email||'').toString().slice(0,200);
        const text = (c.text||'').toString().slice(0,2000);
        const time = c.time || new Date().toISOString();
        const key = (email||'').trim().toLowerCase() + '|' + text;
        const exists = (existingMap[page] && existingMap[page].has(key));
        const id = c.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
        const proposed = { id, name, email, text, time, exists };
        previewPages[page].push(proposed);
        if(exists){ summary[page].skipped++; continue; }
        // if not preview, apply
        if(!preview){
          const item = { id, name, email, text, time, approved: false };
          all[page].push(item);
          existingMap[page] = existingMap[page] || new Set(); existingMap[page].add(key);
          summary[page].imported++;
        }
      }
    }
    if(preview){
      // return detailed preview items so admin can pick
      const pagesOut = Object.keys(previewPages).map(p => ({ page: p, items: previewPages[p], summary: summary[p] || { imported:0, skipped: previewPages[p].length } }));
      return res.json({ ok: true, preview: true, pages: pagesOut });
    }
    await writeJSON(COMMENTS_FILE, all);
    // audit log entry
    try{
      const audit = await readJSON(IMPORT_AUDIT_FILE, []);
      audit.push({ time: new Date().toISOString(), by: getAdminUserFromReq(req) || 'unknown', summary });
      await writeJSON(IMPORT_AUDIT_FILE, audit);
    }catch(e){ console.error('audit log failed', e); }
    if((process.env.NODE_ENV || 'development') !== 'production') console.log('Imported comments summary:', summary);
    return res.json({ ok: true, summary });
  }catch(e){ console.error('import error', e); return res.status(500).json({ error: 'server_error' }); }
});

app.delete('/api/admin/comments/:id', async (req, res) => {
  if (!checkAdminToken(req)) return res.status(401).json({ error: 'unauthorized' });
  const id = req.params.id;
  const all = await readJSON(COMMENTS_FILE, {});
  let changed = false;
  Object.keys(all).forEach(page => {
    const before = (all[page] || []).length;
    all[page] = (all[page] || []).filter(c => c.id !== id);
    if (all[page].length !== before) changed = true;
  });
  if (changed) await writeJSON(COMMENTS_FILE, all);
  res.json({ ok: true });
});

// Admin UI (simple)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Comments API listening on http://localhost:${PORT}`));
