/* =============================================================
   灵感库 PromptVault — 应用逻辑
   零依赖 · 纯前端 · 数据只存在你自己的设备上
   ============================================================= */
(function () {
  'use strict';

  /* ==========================================================
     1. 基础工具
     ========================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const debounce = (fn, ms) => {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };
  const DAY = 86400000;

  function fmtAgo(ts) {
    if (!ts) return '';
    const d = Date.now() - ts;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    if (d < DAY) return Math.floor(d / 3600000) + ' 小时前';
    if (d < DAY * 7) return Math.floor(d / DAY) + ' 天前';
    const dt = new Date(ts);
    return (dt.getMonth() + 1) + '/' + dt.getDate();
  }
  function fmtSize(b) {
    if (!b) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  /* 变量提取：{{变量名}} */
  const VAR_RE = /\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g;
  function extractVars(text) {
    const out = [];
    String(text || '').replace(VAR_RE, (m, name) => {
      if (out.indexOf(name) === -1) out.push(name);
      return m;
    });
    return out;
  }

  /* 剪贴板（含 file:// 兜底） */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 继续走兜底 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ==========================================================
     2. 图标
     ========================================================== */
  const ICO = {
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4"/><path d="M5 19h14"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4l4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V5m0 0L8 9m4-4l4 4"/><path d="M5 19h14"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4m0 3v.5"/></svg>',
    install: '<svg viewBox="0 0 24 24"><path d="M12 4v10m0 0l-4-4m4 4l4-4"/><path d="M5 18v2h14v-2"/></svg>',
    filter: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'
  };

  /* ==========================================================
     3. 存储层
     ========================================================== */
  const K = { prompts: 'pv.prompts.v1', settings: 'pv.settings.v1', seeded: 'pv.seeded.v1' };
  const DEF_SETTINGS = { theme: 'auto', layout: 'grid', sort: 'recent', view: 'prompts' };

  const LS = {
    get(k, def) {
      try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { Toast('存储空间不足，请先清理部分数据', 'err'); return false; }
    }
  };

  /* ---- IndexedDB（图片二进制）---- */
  const DB_NAME = 'promptvault', DB_VER = 1;
  const ImgStore = {
    mode: 'idb',
    db: null,

    async init() {
      if (!window.indexedDB) { this.mode = 'ls'; return; }
      try {
        this.db = await new Promise((res, rej) => {
          const req = indexedDB.open(DB_NAME, DB_VER);
          req.onupgradeneeded = () => {
            const d = req.result;
            if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('blob')) d.createObjectStore('blob');
          };
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error || new Error('idb open failed'));
          req.onblocked = () => rej(new Error('idb blocked'));
          setTimeout(() => rej(new Error('idb timeout')), 4000);
        });
        this.mode = 'idb';
      } catch (e) {
        this.mode = 'ls';
        console.warn('[PromptVault] IndexedDB 不可用，回退到 localStorage', e);
      }
    },

    _tx(store, mode) { return this.db.transaction(store, mode).objectStore(store); },

    async put(id, rec, blob) {
      if (this.mode === 'ls') {
        const dataUrl = await blobToDataURL(blob);
        if (!LS.set('pv.img.meta.' + id, rec)) throw new Error('quota');
        // 直接写字符串，避免 JSON 二次转义
        localStorage.setItem('pv.img.data.' + id, dataUrl);
        return;
      }
      await new Promise((res, rej) => {
        const tx = this.db.transaction(['meta', 'blob'], 'readwrite');
        tx.objectStore('meta').put(Object.assign({ id }, rec));
        tx.objectStore('blob').put(blob, id);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    },

    async all() {
      if (this.mode === 'ls') {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf('pv.img.meta.') === 0) {
            const rec = LS.get(k, null);
            if (rec) out.push(rec);
          }
        }
        return out;
      }
      return await new Promise((res, rej) => {
        const req = this._tx('meta', 'readonly').getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    },

    async getBlob(id) {
      if (this.mode === 'ls') {
        const s = localStorage.getItem('pv.img.data.' + id);
        return s ? dataURLtoBlob(s) : null;
      }
      return await new Promise((res, rej) => {
        const req = this._tx('blob', 'readonly').get(id);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });
    },

    async del(id) {
      if (this.mode === 'ls') {
        localStorage.removeItem('pv.img.meta.' + id);
        localStorage.removeItem('pv.img.data.' + id);
        return;
      }
      await new Promise((res, rej) => {
        const tx = this.db.transaction(['meta', 'blob'], 'readwrite');
        tx.objectStore('meta').delete(id);
        tx.objectStore('blob').delete(id);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    },

    async clear() {
      if (this.mode === 'ls') {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf('pv.img.') === 0) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
        return;
      }
      await new Promise((res, rej) => {
        const tx = this.db.transaction(['meta', 'blob'], 'readwrite');
        tx.objectStore('meta').clear();
        tx.objectStore('blob').clear();
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    }
  };

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  /* 保存文件：浏览器用 <a download>；安卓 App（WebView）不支持 blob 下载，
     改走原生桥 AndroidSaver.save，由 Java 侧写进系统「下载」目录。 */
  function saveBlob(blob, filename) {
    if (window.AndroidSaver && typeof window.AndroidSaver.save === 'function') {
      blobToDataURL(blob).then((dataUrl) => {
        try { window.AndroidSaver.save(String(dataUrl), filename); }
        catch (e) { Toast('保存失败'); }
      }).catch(() => Toast('保存失败'));
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function dataURLtoBlob(dataUrl) {
    const parts = String(dataUrl).split(',');
    const mime = (parts[0].match(/:(.*?);/) || [, 'image/webp'])[1];
    const bin = atob(parts[1] || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ==========================================================
     4. 状态
     ========================================================== */
  let prompts = [];
  let images = [];          // 仅元数据 + thumb
  let settings = Object.assign({}, DEF_SETTINGS);
  const ui = { view: 'prompts', q: '', cat: 'all', tag: null, list: false };
  let deferredPrompt = null;
  let lbUrl = null;

  /* ==========================================================
     5. Toast
     ========================================================== */
  const toastBox = $('#toasts');
  function ToastAction(msg, label, onAct, ms) {
    const el = document.createElement('div');
    el.className = 'toast act';
    el.innerHTML = '<span>' + esc(msg) + '</span><button class="t-act">' + esc(label) + '</button>';
    toastBox.appendChild(el);
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    };
    el.querySelector('.t-act').onclick = () => { close(); onAct && onAct(); };
    setTimeout(close, ms || 4200);
    return el;
  }

  function Toast(msg, kind) {
    kind = kind || 'ok';
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = (kind === 'ok' ? ICO.check : ICO.warn) + '<span>' + esc(msg) + '</span>';
    toastBox.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    }, 1900);
  }

  /* ==========================================================
     6. 图片压缩
     ========================================================== */
  let webpOK = null;
  function canWebp() {
    if (webpOK !== null) return webpOK;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      webpOK = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { webpOK = false; }
    return webpOK;
  }

  function loadBitmap(file) {
    return new Promise((res, rej) => {
      if (window.createImageBitmap) {
        createImageBitmap(file).then(res).catch(() => fallback());
      } else fallback();
      function fallback() {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
        img.src = url;
      }
    });
  }

  async function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1800;
    quality = quality || 0.86;
    const src = await loadBitmap(file);
    const w0 = src.width || src.naturalWidth || 1;
    const h0 = src.height || src.naturalHeight || 1;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    if (src.close) { try { src.close(); } catch (e) { } }

    const type = canWebp() ? 'image/webp' : 'image/jpeg';
    let blob = await new Promise((r) => cv.toBlob(r, type, quality));
    if (!blob) blob = file;                     // 极端情况退回原图

    // 缩略图
    const tScale = Math.min(1, 620 / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * tScale));
    const th = Math.max(1, Math.round(h * tScale));
    const tc = document.createElement('canvas');
    tc.width = tw; tc.height = th;
    const tctx = tc.getContext('2d');
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(cv, 0, 0, tw, th);
    const thumb = tc.toDataURL(type, 0.72);

    return { blob, thumb, w, h, mime: type };
  }

  /* ==========================================================
     7. 加载 / 保存
     ========================================================== */
  function loadAll() {
    prompts = LS.get(K.prompts, []);
    if (!Array.isArray(prompts)) prompts = [];
    settings = Object.assign({}, DEF_SETTINGS, LS.get(K.settings, {}));
  }

  const savePrompts = () => LS.set(K.prompts, prompts);
  const saveSettings = () => LS.set(K.settings, settings);

  async function loadImages() {
    try {
      const rows = await ImgStore.all();
      rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      images = rows;
    } catch (e) {
      console.warn(e);
      images = [];
    }
    $('#cImages').textContent = images.length;
  }

  /* ==========================================================
     8. 主题
     ========================================================== */
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const t = settings.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : settings.theme;
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0b0c10' : '#f4f4f8');
    // APK 外壳：让状态栏/导航栏跟着主题走
    try { if (window.AndroidChrome) window.AndroidChrome.setTheme(t === 'dark'); } catch (e) { }
  }
  mqDark.addEventListener && mqDark.addEventListener('change', () => {
    if (settings.theme === 'auto') applyTheme();
  });

  /* 申请持久化存储：避免浏览器在空间紧张时把整个库清掉 */
  let persistGranted = null;
  function ensurePersist() {
    if (!(navigator.storage && navigator.storage.persist)) { persistGranted = false; return; }
    navigator.storage.persisted().then((has) => {
      if (has) { persistGranted = true; return null; }
      return navigator.storage.persist().then((ok) => { persistGranted = !!ok; });
    }).catch(() => { persistGranted = false; });
  }

  /* ==========================================================
     9. 渲染
     ========================================================== */
  const VIEWS = { prompts: '提示词', images: '图片库', fav: '收藏', settings: '设置' };

  function currentPrompts() {
    let list = prompts.slice();
    if (ui.view === 'fav') list = list.filter((p) => p.fav);
    if (ui.cat !== 'all') list = list.filter((p) => (p.cat || '未分类') === ui.cat);
    if (ui.tag) list = list.filter((p) => (p.tags || []).indexOf(ui.tag) !== -1);
    if (ui.q) {
      const words = qWords(ui.q);
      list = list.filter((p) => {
        const hay = ((p.title || '') + ' ' + (p.body || '') + ' ' + (p.cat || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    return sortList(list);
  }
  function currentImages() {
    let list = images.slice();
    if (ui.view === 'fav') list = list.filter((p) => p.fav);
    if (ui.tag) list = list.filter((p) => (p.tags || []).indexOf(ui.tag) !== -1);
    if (ui.q) {
      const words = qWords(ui.q);
      list = list.filter((p) => {
        const hay = ((p.title || '') + ' ' + (p.note || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    return sortList(list);
  }

  function qWords(q) {
    return String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  }

  function sortList(list) {
    const s = settings.sort;
    const arr = list.slice();
    if (s === 'name') arr.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh'));
    else if (s === 'created') arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    else if (s === 'uses') arr.sort((a, b) => (b.uses || 0) - (a.uses || 0));
    else arr.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return arr;
  }

  const APP_VER = '1.0.3';

  const SORT_NAME = { recent: '最近修改', created: '最近创建', name: '按名称', uses: '最常使用' };

  function render() {
    renderCounts();
    renderNav();
    renderFacets();
    renderHead();
    renderContent();
  }

  function renderCounts() {
    $('#cPrompts').textContent = prompts.length;
    $('#cImages').textContent = images.length;
    $('#cFav').textContent = prompts.filter((p) => p.fav).length + images.filter((p) => p.fav).length;
  }

  function renderNav() {
    $$('#viewNav .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
    $$('#tabbar .tab').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  }

  function facetData() {
    const cats = new Map();
    const tags = new Map();
    const pool = ui.view === 'images' ? images : prompts;
    pool.forEach((p) => {
      if (ui.view !== 'images') {
        const c = p.cat || '未分类';
        cats.set(c, (cats.get(c) || 0) + 1);
      }
      (p.tags || []).forEach((t) => tags.set(t, (tags.get(t) || 0) + 1));
    });
    return { cats: [...cats.entries()].sort((a, b) => b[1] - a[1]), tags: [...tags.entries()].sort((a, b) => b[1] - a[1]) };
  }

  function renderFacets() {
    const { cats, tags } = facetData();
    const catBox = $('#catList');
    if (ui.view === 'images') {
      $('#catBlock').style.display = 'none';
      catBox.innerHTML = '';
    } else {
      $('#catBlock').style.display = '';
      catBox.innerHTML = [['all', '全部']].concat(cats).map(([c, n]) =>
        `<button class="chip ${ui.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c === 'all' ? '全部' : c)}<span class="n">${c === 'all' ? prompts.length : n}</span></button>`
      ).join('');
    }
    $('#tagList').innerHTML = tags.length
      ? tags.slice(0, 24).map(([t, n]) =>
        `<button class="chip ${ui.tag === t ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}<span class="n">${n}</span></button>`).join('')
      : '<span style="font-size:12px;color:var(--text-3)">还没有标签</span>';

    // 手机端横向筛选条
    const parts = [`<button class="chip ${!ui.cat && !ui.tag ? 'on' : ''}" data-cat="all" data-tag="">全部</button>`];
    if (ui.view !== 'images') {
      cats.forEach(([c]) => parts.push(`<button class="chip ${ui.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`));
    }
    tags.slice(0, 12).forEach(([t]) => parts.push(`<button class="chip ${ui.tag === t ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`));
    $('#filterBar').innerHTML = parts.join('');

    $('#sideFoot').innerHTML = `本地存储 · 不上传云端<br>共 ${prompts.length} 条提示词 / ${images.length} 张图片`;
  }

  function renderHead() {
    const t = $('#viewTitle'), s = $('#viewSub');
    if (ui.view === 'settings') { t.textContent = '设置'; s.textContent = '外观、数据与安装'; return; }
    if (ui.view === 'images') {
      t.textContent = '图片库';
      s.textContent = currentImages().length + ' 张 · 拖拽或 Ctrl+V 可直接添加';
    } else if (ui.view === 'fav') {
      t.textContent = '收藏';
      s.textContent = (currentPrompts().length + currentImages().length) + ' 项';
    } else {
      t.textContent = ui.cat !== 'all' ? ui.cat : '提示词';
      s.textContent = currentPrompts().length + ' 条 · ' + SORT_NAME[settings.sort];
    }
  }

  function renderContent() {
    const box = $('#content');
    box.classList.toggle('list', settings.layout === 'list');

    if (ui.view === 'settings') { box.innerHTML = settingsHTML(); bindSettings(); return; }

    if (ui.view === 'images') {
      const list = currentImages();
      box.innerHTML = list.length ? `<div class="masonry">${list.map(imageCard).join('')}</div>` : emptyImages();
      return;
    }

    if (ui.view === 'fav') {
      const ps = currentPrompts(), is = currentImages();
      if (!ps.length && !is.length) { box.innerHTML = emptyFav(); return; }
      let html = '';
      if (ps.length) html += `<div class="grid">${ps.map(promptCard).join('')}</div>`;
      if (is.length) html += `<div class="sec-title">收藏的图片</div><div class="masonry">${is.map(imageCard).join('')}</div>`;
      box.innerHTML = html;
      return;
    }

    const list = currentPrompts();
    box.innerHTML = list.length ? `<div class="grid">${list.map(promptCard).join('')}</div>` : emptyPrompts();
  }

  /* ---------- 卡片 ---------- */
  function promptCard(p) {
    const vars = extractVars(p.body);
    const isCode = /^\s*(公共|public|function|const |let |import |#include|def |class |> |\$ )/m.test(p.body || '');
    return `<article class="p-card" data-id="${p.id}">
      <div class="p-top">
        <span class="cat">${esc(p.cat || '未分类')}</span>
        ${vars.length ? `<span class="tag" style="background:var(--accent-soft);color:var(--accent)">${vars.length} 个变量</span>` : ''}
        ${(() => { const n = images.filter((i) => i.promptId === p.id).length; return n ? `<span class="tag">${n} 张图</span>` : ''; })()}
        <span class="sp"></span>
        <button class="mini fav ${p.fav ? 'on' : ''}" data-act="fav" aria-label="收藏">${ICO.star}</button>
      </div>
      <h3 class="p-title">${esc(p.title || '未命名')}</h3>
      <p class="p-body${isCode ? ' mono' : ''}">${esc(p.body || '')}</p>
      ${(p.tags && p.tags.length) ? `<div class="tags">${p.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="p-foot">
        <div class="meta">
          ${p.uses ? `<span>用过 ${p.uses} 次</span>` : ''}
          <span>${fmtAgo(p.updatedAt || p.createdAt)}</span>
        </div>
        <div class="p-actions">
          <button class="copy-btn" data-act="copy">${ICO.copy}<span>复制</span></button>
          <button class="mini p-edit" data-act="edit" aria-label="编辑">${ICO.edit}</button>
          <button class="mini p-del" data-act="del" aria-label="删除">${ICO.trash}</button>
          <button class="mini p-more" data-act="more" aria-label="更多">${ICO.more}</button>
        </div>
      </div>
    </article>`;
  }

  function imageCard(img) {
    return `<button class="i-card" data-id="${img.id}">
      <img src="${img.thumb || ''}" alt="${esc(img.title || '')}" loading="lazy" decoding="async">
      ${img.fav ? `<span class="i-badge">${ICO.star}</span>` : ''}
      ${img.title ? `<span class="i-cap">${esc(img.title)}</span>` : ''}
    </button>`;
  }

  /* ---------- 空状态 ---------- */
  function emptyPrompts() {
    const searching = ui.q || ui.tag || ui.cat !== 'all';
    if (searching) {
      return `<div class="empty"><div class="e-ico">${ICO.filter}</div>
        <h3>没有找到匹配的提示词</h3><p>换个关键词，或清除筛选条件再试试。</p>
        <div class="e-actions"><button class="btn" data-act="clearFilter">清除筛选</button></div></div>`;
    }
    return `<div class="empty"><div class="e-ico">${ICO.spark}</div>
      <h3>把你的第一条提示词放进来</h3>
      <p>收藏好用的提示词，下次一键复制。带 {{变量}} 的提示词复制时会弹出填写框。</p>
      <div class="e-actions">
        <button class="btn primary" data-act="new">${ICO.plus}新建提示词</button>
        <button class="btn" data-act="loadSamples">${ICO.doc}载入示例</button>
      </div></div>`;
  }
  function emptyImages() {
    return `<div class="empty"><div class="e-ico">${ICO.image}</div>
      <h3>图片库还是空的</h3>
      <p>把图片拖进来、粘贴（Ctrl+V / 长按粘贴）或者点下面的按钮选择。图片只存在本机。</p>
      <div class="e-actions"><button class="btn primary" data-act="addImages">${ICO.upload}选择图片</button></div></div>`;
  }
  function emptyFav() {
    return `<div class="empty"><div class="e-ico">${ICO.star}</div>
      <h3>还没有收藏</h3><p>点卡片右上角的星标，重要的东西就会聚集到这里。</p></div>`;
  }

  /* ---------- 设置页 ---------- */
  function settingsHTML() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const themeBtn = (v, l) => `<button data-theme-set="${v}" class="${settings.theme === v ? 'on' : ''}">${l}</button>`;
    const layBtn = (v, l) => `<button data-lay-set="${v}" class="${settings.layout === v ? 'on' : ''}">${l}</button>`;

    return `<div class="set-wrap">

      <div class="set-card">
        <h3>外观</h3>
        <div class="set-row">
          <div class="sr-main"><b>主题</b><small>跟随系统会随手机深色模式自动切换</small></div>
          <div class="sr-side"><div class="seg">${themeBtn('auto', '自动')}${themeBtn('light', '浅色')}${themeBtn('dark', '深色')}</div></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>默认布局</b><small>卡片视图更好看，列表视图更省空间</small></div>
          <div class="sr-side"><div class="seg">${layBtn('grid', '卡片')}${layBtn('list', '列表')}</div></div>
        </div>
      </div>

      <div class="set-card">
        <h3>安装到手机</h3>
        <div class="set-row">
          <div class="sr-main">
            <b>${standalone ? '已安装为 App ✓' : '添加到主屏幕'}</b>
            <small>${standalone ? '你现在用的是独立 App 窗口，可离线使用。' : '安装后像普通 App 一样有图标、全屏打开，断网也能用。'}</small>
          </div>
          <div class="sr-side">
            ${standalone ? '' : `<button class="btn primary sm" id="setInstall">${ICO.install}安装</button>`}
          </div>
        </div>
        ${standalone ? '' : `<div class="set-row" style="border-top:0;padding-top:0">
          <div class="sr-main"><small>安卓 Chrome：右上角 ⋮ →「添加到主屏幕 / 安装应用」。<br>iPhone Safari：底部分享 →「添加到主屏幕」。</small></div>
        </div>`}
      </div>

      <div class="set-card">
        <h3>数据</h3>
        <div class="stat-grid">
          <div class="stat"><b>${prompts.length}</b><small>提示词</small></div>
          <div class="stat"><b>${images.length}</b><small>图片</small></div>
          <div class="stat"><b>${fmtSize(images.reduce((s, i) => s + (i.size || 0), 0))}</b><small>图片体积</small></div>
          <div class="stat"><b id="usageNum">—</b><small>已用空间</small></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>存储保护</b><small>开启后浏览器不会在空间紧张时自动清空你的库</small></div>
          <div class="sr-side"><span class="badge" id="persistState">检测中</span></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>导出备份</b><small>生成一个 .json 文件，含全部提示词和图片，可换手机恢复</small></div>
          <div class="sr-side"><button class="btn sm" id="btnExport">${ICO.download}导出</button></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>导入备份</b><small>从之前导出的 .json 恢复，重复项会自动跳过</small></div>
          <div class="sr-side"><button class="btn sm" id="btnImport">${ICO.upload}导入</button></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>载入示例内容</b><small>补一批精选提示词，方便先上手</small></div>
          <div class="sr-side"><button class="btn sm" id="btnSamples">${ICO.spark}载入</button></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b>清除变量记忆</b><small>已记住 ${Object.keys(readVarMemory()).length} 条提示词填过的变量值</small></div>
          <div class="sr-side"><button class="btn sm" id="btnForgetVars">清除</button></div>
        </div>
        <div class="set-row">
          <div class="sr-main"><b style="color:var(--danger)">清空全部数据</b><small>不可恢复，建议先导出备份</small></div>
          <div class="sr-side"><button class="btn sm danger" id="btnWipe">清空</button></div>
        </div>
      </div>

      <div class="set-card">
        <h3>关于</h3>
        <div class="set-row">
          <div class="sr-main"><b>灵感库 PromptVault</b><small>纯本地存储 · 无账号 · 不上传任何内容<br>版本 ${APP_VER} · ${navigator.userAgent.indexOf('wv') > -1 ? '安卓 App' : '网页版'}</small></div>
          <div class="sr-side"><span class="badge">${prompts.length + images.length} 项</span></div>
        </div>
        <div class="about">
          <b style="color:var(--text-2)">快捷键</b><br>
          <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> 搜索 · <kbd>N</kbd> 新建 · <kbd>Esc</kbd> 关闭 · <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴图片<br><br>
          <b style="color:var(--text-2)">提示词变量</b><br>
          在内容里写 <code style="color:var(--accent)">{{主题}}</code>，复制时会弹出填写框，自动替换后复制；填过的值会记住，下次自动带入。
        </div>
      </div>
    </div>`;
  }

  function bindSettings() {
    $$('[data-theme-set]').forEach((b) => b.onclick = () => {
      settings.theme = b.dataset.themeSet; saveSettings(); applyTheme(); renderContent(); bindSettings();
    });
    $$('[data-lay-set]').forEach((b) => b.onclick = () => {
      settings.layout = b.dataset.laySet; saveSettings(); renderContent(); bindSettings();
    });
    const si = $('#setInstall'); if (si) si.onclick = doInstall;
    $('#btnExport').onclick = exportAll;
    $('#btnImport').onclick = () => $('#pickJson').click();
    $('#btnSamples').onclick = () => { seedPrompts(true); render(); Toast('示例已载入'); };
    $('#btnWipe').onclick = () => confirmSheet('清空全部数据？', '提示词、图片、设置都会删除，且无法恢复。', '确认清空', async () => {
      prompts = []; images = []; settings = Object.assign({}, DEF_SETTINGS);
      localStorage.removeItem(K.prompts); localStorage.removeItem(K.settings);
      await ImgStore.clear();
      applyTheme(); render(); Toast('已清空');
    });
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((e) => {
        const n = $('#usageNum');
        if (n) n.textContent = fmtSize(e.usage || 0);
      }).catch(() => { });
    }
    // 存储保护状态（真正的申请在 boot 里做）
    const forgetVars = $('#btnForgetVars');
    if (forgetVars) forgetVars.onclick = () => {
      try { localStorage.removeItem(VAR_MEM_KEY); } catch (e) {}
      Toast('已清除变量记忆');
      render();
    };
    const badge = $('#persistState');
    if (badge) {
      if (!(navigator.storage && navigator.storage.persist)) badge.textContent = '不支持';
      else if (persistGranted === true) badge.textContent = '已保护';
      else if (persistGranted === false) badge.textContent = '未保护';
      else navigator.storage.persisted().then((has) => {
        badge.textContent = has ? '已保护' : '申请中';
      }).catch(() => { });
    }
  }

  /* ==========================================================
     10. 编辑提示词
     ========================================================== */
  function openEditor(id) {
    const p = id ? prompts.find((x) => x.id === id) : null;
    const cats = [...new Set(prompts.map((x) => x.cat).filter(Boolean))];
    const editing = !!p;

    openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head">
        <h2>${editing ? '编辑提示词' : '新建提示词'}</h2>
        <button class="icon-btn" data-close>${ICO.close}</button>
      </div>
      <div class="sheet-body">
        <div class="field">
          <label>标题</label>
          <input class="input" id="fTitle" placeholder="例如：电影感人像摄影" value="${esc(p ? p.title : '')}" maxlength="80">
        </div>
        <div class="field">
          <label>内容 <span class="hint">用 {{变量}} 做可替换位置</span></label>
          <textarea class="area" id="fBody" placeholder="在这里粘贴提示词…&#10;&#10;例如：一位{{年龄}}岁{{性别}}，在北京胡同里…">${esc(p ? p.body : '')}</textarea>
          <div class="counter" id="fCount">0 字</div>
        </div>
        <div class="row2">
          <div class="field">
            <label>分类</label>
            <input class="input" id="fCat" list="catOptions" placeholder="未分类" value="${esc(p ? (p.cat || '') : '')}" maxlength="20">
            <datalist id="catOptions">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
          </div>
          <div class="field">
            <label>标签</label>
            <input class="input" id="fTags" placeholder="逗号分隔，如：摄影,胶片" value="${esc(p ? (p.tags || []).join(',') : '')}" maxlength="120">
          </div>
        </div>
      </div>
      <div class="sheet-foot">
        ${editing ? `<button class="btn danger" id="fDel" style="flex:0 0 auto;padding:0 14px">${ICO.trash}</button>` : ''}
        <button class="btn" data-close>取消</button>
        <button class="btn primary" id="fSave">保存</button>
      </div>
    `);

    const body = $('#fBody'), count = $('#fCount');
    const upd = () => { count.textContent = body.value.length + ' 字'; };
    body.addEventListener('input', upd); upd();
    setTimeout(() => (editing ? body : $('#fTitle')).focus(), 260);

    $('#fSave').onclick = () => {
      const title = $('#fTitle').value.trim();
      const text = body.value.trim();
      if (!text) { Toast('内容不能为空', 'err'); body.focus(); return; }
      const cat = $('#fCat').value.trim() || '未分类';
      const tags = $('#fTags').value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
      const now = Date.now();

      if (editing) {
        Object.assign(p, { title: title || '未命名', body: text, cat, tags, updatedAt: now });
      } else {
        prompts.unshift({
          id: uid(), title: title || '未命名', body: text, cat, tags,
          fav: false, uses: 0, createdAt: now, updatedAt: now
        });
      }
      savePrompts(); closeSheet(); render(); Toast(editing ? '已保存' : '已添加');
    };

    const del = $('#fDel');
    if (del) del.onclick = () => { closeSheet(); deletePrompt(p); };
  }

  /* ==========================================================
     11. 复制 / 变量填充
     ========================================================== */
  async function doCopy(p, btn) {
    const vars = extractVars(p.body);
    if (vars.length) { openVarSheet(p, btn); return; }
    const ok = await copyText(p.body);
    finishCopy(p, btn, ok);
  }

  function finishCopy(p, btn, ok) {
    if (ok) {
      p.uses = (p.uses || 0) + 1;
      savePrompts();
      // 就地刷新「用过 N 次」，避免整页重排
      const meta = document.querySelector('.p-card[data-id="' + p.id + '"] .meta');
      if (meta) {
        const first = meta.querySelector('span');
        if (first && first.textContent.indexOf('用过') === 0) {
          first.textContent = '用过 ' + p.uses + ' 次';
        } else if (p.uses === 1) {
          meta.insertAdjacentHTML('afterbegin', '<span>用过 1 次</span>');
        }
      }
      if (btn) {
        const old = btn.innerHTML;
        btn.classList.add('done');
        btn.innerHTML = ICO.check + '<span>已复制</span>';
        setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = old; }, 1400);
      }
      Toast('已复制到剪贴板');
    } else {
      Toast('复制失败，请手动选择文本', 'err');
    }
  }

  /* ---------- 变量值记忆 ---------- */
  const VAR_MEM_KEY = 'pv.vars.v1';
  function readVarMemory() {
    try { return JSON.parse(localStorage.getItem(VAR_MEM_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function getVarMemory(promptId) {
    return readVarMemory()[promptId] || {};
  }
  function setVarMemory(promptId, map) {
    const all = readVarMemory();
    if (map && Object.keys(map).length) all[promptId] = map;
    else delete all[promptId];
    try { localStorage.setItem(VAR_MEM_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function openVarSheet(p, btn) {
    const vars = extractVars(p.body);
    const remembered = getVarMemory(p.id);
    const fields = vars.map((v, i) => `
      <div class="var-item">
        <label>${esc(v)}<code>{{${esc(v)}}}</code></label>
        <input class="input var-input" data-var="${esc(v)}" data-i="${i}"
          value="${esc(remembered[v] || '')}" placeholder="填写后自动替换">
      </div>`).join('');

    openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h2>填写变量</h2><button class="icon-btn" data-close>${ICO.close}</button></div>
      <div class="sheet-body">
        <p style="margin:0 0 12px;font-size:12.5px;color:var(--text-3)">这条提示词有 ${vars.length} 个可替换位置，填完点「复制」。${Object.keys(remembered).length ? ' 已带入上次填写的值，<button class="link-btn" id="varForget">清空</button>' : ''}</p>
        ${fields}
        <div class="field" style="margin-bottom:0">
          <label>预览</label>
          <div class="preview" id="varPreview"></div>
        </div>
      </div>
      <div class="sheet-foot">
        <button class="btn" data-close>取消</button>
        <button class="btn primary" id="varCopy">${ICO.copy}复制</button>
      </div>`, true);

    const inputs = $$('.var-input');
    const preview = $('#varPreview');
    const build = () => {
      const map = {};
      inputs.forEach((i) => { map[i.dataset.var] = i.value.trim(); });
      return String(p.body).replace(VAR_RE, (m, name) => {
        const v = map[name];
        return v ? v : m;
      });
    };
    const upd = () => {
      preview.textContent = build();
    };
    const forgetBtn = $('#varForget');
    if (forgetBtn) forgetBtn.onclick = () => {
      inputs.forEach((i) => { i.value = ''; });
      setVarMemory(p.id, {});
      upd();
    };
    inputs.forEach((i) => i.addEventListener('input', upd));
    upd();
    setTimeout(() => inputs[0] && inputs[0].focus(), 280);

    $('#varCopy').onclick = async () => {
      const text = build();
      const map = {};
      inputs.forEach((i) => { if (i.value.trim()) map[i.dataset.var] = i.value.trim(); });
      setVarMemory(p.id, map);
      const ok = await copyText(text);
      closeSheet();
      finishCopy(p, btn, ok);
    };
  }

  /* ==========================================================
     12. 图片
     ========================================================== */
  async function addImageFiles(files) {
    const arr = Array.prototype.slice.call(files).filter((f) => f && /^image\//.test(f.type));
    if (!arr.length) { Toast('没有可用的图片', 'err'); return; }
    Toast('正在处理 ' + arr.length + ' 张图片…');
    let done = 0, saved = 0;
    for (const file of arr) {
      try {
        const { blob, thumb, w, h, mime } = await compressImage(file, 1800, 0.86);
        const id = uid();
        const rec = {
          id, title: file.name ? file.name.replace(/\.[^.]+$/, '').slice(0, 60) : '',
          note: '', tags: [], fav: false,
          w, h, mime, size: blob.size, origSize: file.size,
          createdAt: Date.now(), updatedAt: Date.now(),
          thumb
        };
        await ImgStore.put(id, rec, blob);
        images.unshift(rec);
        done++; saved += Math.max(0, (file.size || 0) - (blob.size || 0));
      } catch (e) {
        console.warn(e);
        Toast('有一张图片处理失败', 'err');
      }
    }
    render();
    if (done) {
      const pct = saved > 0 ? Math.round((saved / (saved + images.reduce((s, i) => s + (i.size || 0), 0))) * 100) : 0;
      Toast('已添加 ' + done + ' 张' + (pct > 3 ? '，体积省了约 ' + pct + '%' : ''));
    }
  }

  function promptToText(p) {
    const t = (p.title || '未命名提示词').trim();
    return t + '\n\n' + String(p.body || '').trim() + '\n\n—— 来自「灵感库 PromptVault」';
  }

  async function sharePrompt(p) {
    const text = promptToText(p);
    if (navigator.share) {
      try { await navigator.share({ title: p.title || '提示词', text: text }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const ok = await copyText(text);
    Toast(ok ? '已复制，可粘贴发给朋友' : '复制失败', ok ? '' : 'err');
  }

  function deletePrompt(p) {
    const idx = prompts.findIndex((x) => x.id === p.id);
    if (idx < 0) return;
    prompts.splice(idx, 1);
    savePrompts(); render();
    ToastAction('已删除「' + (p.title || '未命名') + '」', '撤销', () => {
      prompts.splice(Math.min(idx, prompts.length), 0, p);
      savePrompts(); render(); Toast('已恢复');
    });
  }

  function openCardMenu(p) {
    const rows = [
      { k: 'preview', label: '查看全文', ico: ICO.doc },
      { k: 'copy', label: '复制内容', ico: ICO.copy },
      { k: 'share', label: '分享给朋友', ico: ICO.share },
      { k: 'edit', label: '编辑', ico: ICO.edit },
      { k: 'fav', label: p.fav ? '取消收藏' : '收藏', ico: ICO.star },
      { k: 'del', label: '删除', ico: ICO.trash, danger: true }
    ];
    const sheet = openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h2>${esc(p.title || '未命名提示词')}</h2><button class="icon-btn" data-close>${ICO.close}</button></div>
      <div class="sheet-body" style="padding:0 12px 8px">
        <div class="menu-list">
          ${rows.map((r) => `<button class="menu-row${r.danger ? ' danger' : ''}" data-k="${r.k}">${r.ico}<span>${r.label}</span></button>`).join('')}
        </div>
      </div>`, true);

    $$('[data-k]', sheet).forEach((b) => {
      b.onclick = async () => {
        const k = b.dataset.k;
        if (k === 'copy') { closeSheet(); return doCopy(p, null); }
        if (k === 'share') { closeSheet(); return sharePrompt(p); }
        if (k === 'edit') { closeSheet(); return openEditor(p.id); }
        if (k === 'preview') { closeSheet(); return openPreview(p); }
        if (k === 'fav') {
          p.fav = !p.fav; savePrompts(); renderCounts(); closeSheet();
          Toast(p.fav ? '已收藏' : '已取消收藏'); return;
        }
        if (k === 'del') {
          closeSheet();
          return deletePrompt(p);
        }
      };
    });
  }

  function openPromptPicker(img, onDone) {
    const list = prompts.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const rows = (arr) => arr.map((p) => `
      <button class="pick-row" data-pid="${p.id}">
        <span class="pk-cat">${esc(p.cat || '未分类')}</span>
        <span class="pk-title">${esc(p.title || '未命名提示词')}</span>
      </button>`).join('') || `<div class="pick-empty">没有匹配的提示词</div>`;

    const sheet = openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h2>关联提示词</h2><button class="icon-btn" data-close>${ICO.close}</button></div>
      <div class="sheet-body">
        <input class="input" id="pickQ" placeholder="搜索标题或内容…" style="margin-bottom:10px">
        <div class="pick-list" id="pickList">${rows(list)}</div>
      </div>`, true);

    const bindRows = () => {
      $$('[data-pid]', sheet).forEach((b) => {
        b.onclick = async () => {
          const p = prompts.find((x) => x.id === b.dataset.pid);
          if (!p) return;
          img.promptId = p.id;
          await saveImageMeta(img);
          closeSheet();
          Toast('已关联「' + (p.title || '提示词') + '」');
          if (onDone) onDone();
        };
      });
    };
    bindRows();

    const q = $('#pickQ', sheet);
    q.oninput = () => {
      const s = q.value.trim().toLowerCase();
      const arr = !s ? list : list.filter((p) =>
        (p.title || '').toLowerCase().includes(s) || (p.body || '').toLowerCase().includes(s));
      $('#pickList', sheet).innerHTML = rows(arr);
      bindRows();
    };
  }

  async function openLightbox(id) {
    const img = images.find((x) => x.id === id);
    if (!img) return;
    const blob = await ImgStore.getBlob(id);
    if (lbUrl) { URL.revokeObjectURL(lbUrl); lbUrl = null; }
    lbUrl = blob ? URL.createObjectURL(blob) : (img.thumb || '');

    const linked = img.promptId ? prompts.find((x) => x.id === img.promptId) : null;
    const linkHtml = linked
      ? `<span class="lb-from">来自提示词</span>
         <button class="chip-link" data-lb-prompt>${esc(linked.title || '未命名提示词')}</button>
         <button class="icon-btn" data-lb-unlink title="解除关联" style="width:26px;height:26px">${ICO.close}</button>`
      : `<button class="chip-link ghost" data-lb-link>＋ 关联一条提示词</button>`;

    const el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = `
      <div class="lb-top">
        <button class="icon-btn" data-lb-close>${ICO.close}</button>
        <div class="lb-title">${esc(img.title || '未命名图片')}</div>
        <button class="icon-btn" data-lb-fav title="收藏" style="${img.fav ? 'color:#f0a92b' : ''}">${ICO.star}</button>
      </div>
      <div class="lb-stage"><img alt="${esc(img.title || '')}" src="${lbUrl}"></div>
      <div class="lb-info">
        ${img.note ? `<div class="lb-note">${esc(img.note)}</div>` : ''}
        ${(img.tags && img.tags.length) ? `<div class="lb-tags">${img.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
        <div style="margin-bottom:10px">${img.w || '?'} × ${img.h || '?'} · ${fmtSize(img.size)}${img.origSize && img.origSize > img.size ? ' · 原图 ' + fmtSize(img.origSize) : ''}</div>
        <div class="lb-link">${linkHtml}</div>
        <div class="lb-bar">
          <button class="btn sm" data-lb-dl>${ICO.download}下载</button>
          <button class="btn sm" data-lb-share>${ICO.share}分享</button>
          <button class="btn sm" data-lb-edit>${ICO.edit}编辑</button>
          <button class="btn sm" data-lb-del>${ICO.trash}删除</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add('lock');
    pushModal();

    const close = () => {
      if (el.dataset.closed) return;
      el.dataset.closed = '1';
      el.remove(); document.body.classList.remove('lock');
      if (lbUrl && lbUrl.indexOf('blob:') === 0) URL.revokeObjectURL(lbUrl);
      lbUrl = null;
      if (!popHandling) dropModal();
    };
    el.querySelector('[data-lb-close]').onclick = close;
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    // 图片 ↔ 提示词关联
    const renderLink = () => {
      const box = el.querySelector('.lb-link');
      if (!box) return;
      const l = img.promptId ? prompts.find((x) => x.id === img.promptId) : null;
      box.innerHTML = l
        ? `<span class="lb-from">来自提示词</span>
           <button class="chip-link" data-lb-prompt>${esc(l.title || '未命名提示词')}</button>
           <button class="icon-btn" data-lb-unlink title="解除关联" style="width:26px;height:26px">${ICO.close}</button>`
        : `<button class="chip-link ghost" data-lb-link>＋ 关联一条提示词</button>`;
      bindLink();
    };
    const bindLink = () => {
      const linkBtn = el.querySelector('[data-lb-link]');
      if (linkBtn) linkBtn.onclick = () => openPromptPicker(img, renderLink);
      const promptBtn = el.querySelector('[data-lb-prompt]');
      if (promptBtn) promptBtn.onclick = () => {
        const l = prompts.find((x) => x.id === img.promptId);
        if (l) doCopy(l, promptBtn);
      };
      const unlinkBtn = el.querySelector('[data-lb-unlink]');
      if (unlinkBtn) unlinkBtn.onclick = async () => {
        delete img.promptId;
        await saveImageMeta(img);
        Toast('已解除关联');
        renderLink();
      };
    };
    bindLink();

    el.querySelector('[data-lb-fav]').onclick = (e) => {
      img.fav = !img.fav;
      e.currentTarget.style.color = img.fav ? '#f0a92b' : '';
      render(); saveImageMeta(img); Toast(img.fav ? '已收藏' : '已取消收藏');
    };
    el.querySelector('[data-lb-dl]').onclick = async () => {
      const name = (img.title || 'image') + (img.mime === 'image/jpeg' ? '.jpg' : '.webp');
      const b = blob || await ImgStore.getBlob(img.id);
      if (!b) { Toast('图片读取失败'); return; }
      saveBlob(b, name);
      Toast('已保存到下载目录');
    };
    el.querySelector('[data-lb-share]').onclick = async () => {
      if (navigator.share && blob) {
        try {
          const f = new File([blob], (img.title || 'image') + '.webp', { type: img.mime || 'image/webp' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) {
            await navigator.share({ files: [f], title: img.title || '' });
            return;
          }
        } catch (e) { }
      }
      Toast('当前环境不支持分享，可用下载', 'err');
    };
    el.querySelector('[data-lb-edit]').onclick = () => { close(); openImageEditor(img); };
    el.querySelector('[data-lb-del]').onclick = () => {
      close();
      (async () => {
        const idx = images.findIndex((x) => x.id === img.id);
        const blob = await ImgStore.getBlob(img.id).catch(() => null);
        await ImgStore.del(img.id);
        images = images.filter((x) => x.id !== img.id);
        render();
        ToastAction('已删除图片', '撤销', async () => {
          try {
            if (!blob) throw new Error('no blob');
            await ImgStore.put(img.id, img, blob);
            images.splice(Math.min(idx, images.length), 0, img);
            render(); Toast('已恢复');
          } catch (e) { Toast('恢复失败，可能已被系统清理', 'err'); }
        });
      })();
    };

    el._close = close;
    currentLightbox = close;
  }

  let currentLightbox = null;

  async function saveImageMeta(img) {
    try {
      const blob = await ImgStore.getBlob(img.id);
      await ImgStore.put(img.id, img, blob);
    } catch (e) { console.warn(e); }
  }

  function openImageEditor(img) {
    openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h2>编辑图片信息</h2><button class="icon-btn" data-close>${ICO.close}</button></div>
      <div class="sheet-body">
        <div class="field"><label>标题</label>
          <input class="input" id="iTitle" value="${esc(img.title || '')}" placeholder="给这张图起个名字" maxlength="80"></div>
        <div class="field"><label>备注 <span class="hint">比如生成它的提示词</span></label>
          <textarea class="area" id="iNote" style="min-height:110px;font-family:inherit;font-size:14px" placeholder="这图是怎么来的？备注一下…">${esc(img.note || '')}</textarea></div>
        <div class="field" style="margin-bottom:4px"><label>标签</label>
          <input class="input" id="iTags" value="${esc((img.tags || []).join(','))}" placeholder="逗号分隔" maxlength="120"></div>
      </div>
      <div class="sheet-foot">
        <button class="btn" data-close>取消</button>
        <button class="btn primary" id="iSave">保存</button>
      </div>`);
    $('#iSave').onclick = async () => {
      img.title = $('#iTitle').value.trim();
      img.note = $('#iNote').value.trim();
      img.tags = $('#iTags').value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
      img.updatedAt = Date.now();
      await saveImageMeta(img);
      closeSheet(); render(); Toast('已保存');
    };
  }

  /* ==========================================================
     13. 通用面板 / 确认
     ========================================================== */
  let sheetCloseFn = null;

  /* ---- 返回键：弹窗打开时先关弹窗，而不是退出 App ---- */
  let modalDepth = 0;
  let popByUi = false;     // 是我们自己调用了 history.back()
  let popHandling = false; // 正在处理一次 popstate

  function pushModal() {
    if (modalDepth > 0) { modalDepth++; return; }
    modalDepth = 1;
    try { history.pushState({ pvModal: 1 }, ''); } catch (e) { }
  }

  function dropModal() {
    if (modalDepth <= 0) return;
    modalDepth--;
    if (modalDepth > 0) return;
    popByUi = true;
    try { history.back(); } catch (e) { popByUi = false; }
    setTimeout(() => { popByUi = false; }, 600);
  }

  function closeTopModal() {
    if ($('#modalRoot').hidden === false) { closeSheet(); return; }
    if (currentLightbox) { const f = currentLightbox; currentLightbox = null; f(); }
  }

  window.addEventListener('popstate', () => {
    if (popByUi) { popByUi = false; return; }
    if (modalDepth > 0) {
      modalDepth = 0;
      popHandling = true;
      closeTopModal();
      popHandling = false;
    }
  });

  function openSheet(html, narrow) {
    const root = $('#modalRoot');
    root.hidden = false;
    root.innerHTML = `<div class="sheet${narrow ? ' plain' : ''}">${html}</div>`;
    document.body.classList.add('lock');
    const sheet = root.firstElementChild;
    $$('[data-close]', sheet).forEach((b) => b.onclick = closeSheet);
    root.onclick = (e) => { if (e.target === root) closeSheet(); };
    sheetCloseFn = closeSheet;
    pushModal();
    return sheet;
  }

  function closeSheet() {
    const root = $('#modalRoot');
    if (root.hidden !== false) return;
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('lock');
    sheetCloseFn = null;
    if (!popHandling) dropModal();
  }

  function confirmSheet(title, text, okLabel, onOk) {
    openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2></div>
      <div class="sheet-body"><p style="margin:0 0 6px;font-size:13.5px;color:var(--text-2);line-height:1.6">${esc(text)}</p></div>
      <div class="sheet-foot">
        <button class="btn" data-close>取消</button>
        <button class="btn danger" id="cfOk">${esc(okLabel || '确定')}</button>
      </div>`, true);
    $('#cfOk').onclick = async () => { closeSheet(); try { await onOk(); } catch (e) { console.warn(e); } };
  }

  /* ==========================================================
     14. 导入 / 导出
     ========================================================== */
  async function exportAll() {
    Toast('正在打包…');
    try {
      const out = {
        app: 'PromptVault', version: 1, exportedAt: new Date().toISOString(),
        prompts: prompts, images: []
      };
      for (const img of images) {
        const blob = await ImgStore.getBlob(img.id);
        if (!blob) continue;
        const data = await blobToDataURL(blob);
        out.images.push(Object.assign({}, img, { data }));
      }
      const json = JSON.stringify(out);
      const blob = new Blob([json], { type: 'application/json' });
      saveBlob(blob, 'promptvault-' + new Date().toISOString().slice(0, 10) + '.json');
      Toast('已导出 ' + fmtSize(blob.size));
    } catch (e) {
      console.warn(e);
      Toast('导出失败：' + (e.message || e), 'err');
    }
  }

  async function importFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || (!Array.isArray(data.prompts) && !Array.isArray(data.images))) {
        Toast('文件格式不正确', 'err'); return;
      }
      let np = 0, ni = 0;
      const existP = new Set(prompts.map((p) => p.id));
      (data.prompts || []).forEach((p) => {
        if (!p || !p.body || existP.has(p.id)) return;
        prompts.push({
          id: p.id || uid(), title: p.title || '未命名', body: p.body,
          cat: p.cat || '未分类', tags: p.tags || [], fav: !!p.fav,
          uses: p.uses || 0, createdAt: p.createdAt || Date.now(), updatedAt: p.updatedAt || Date.now()
        });
        existP.add(p.id); np++;
      });
      const existI = new Set(images.map((p) => p.id));
      for (const im of (data.images || [])) {
        if (!im || !im.data || existI.has(im.id)) continue;
        try {
          const blob = dataURLtoBlob(im.data);
          const rec = {
            id: im.id || uid(), title: im.title || '', note: im.note || '',
            tags: im.tags || [], fav: !!im.fav, w: im.w, h: im.h,
            mime: im.mime || 'image/webp', size: blob.size, origSize: im.origSize || blob.size,
            createdAt: im.createdAt || Date.now(), updatedAt: im.updatedAt || Date.now(),
            thumb: im.thumb || im.data
          };
          await ImgStore.put(rec.id, rec, blob);
          images.unshift(rec); existI.add(rec.id); ni++;
        } catch (e) { console.warn(e); }
      }
      savePrompts();
      render();
      Toast('导入完成：' + np + ' 条提示词 · ' + ni + ' 张图片');
    } catch (e) {
      console.warn(e);
      Toast('导入失败：文件无法解析', 'err');
    }
  }

  /* ==========================================================
     15. 示例内容
     ========================================================== */
  const SEED = [
    {
      title: '电影感人像摄影', cat: 'AI 绘画', tags: ['摄影', '人像', '胶片'],
      body: '一张电影感人像摄影，{{年龄}}岁{{性别}}，{{场景}}，{{光线}}，浅景深，背景虚化，35mm 胶片质感，轻微颗粒，柯达 Portra 400 色调，柔和自然光，真实皮肤纹理，8K 超清，电影级构图。\n\n不要：塑料感、过度锐化、畸变、多余的手指。'
    },
    {
      title: '电商产品主图（白底高质感）', cat: '电商', tags: ['主图', '产品', '商业'],
      body: '为「{{产品名}}」拍摄一张电商主图：纯白背景（#FFFFFF），商品居中，45 度俯拍，柔光箱打光，边缘有轻微落地阴影，材质细节清晰，无文字无道具，1:1 构图，超高清商业摄影。'
    },
    {
      title: '小红书爆款标题生成器', cat: '营销', tags: ['文案', '小红书', '标题'],
      body: '你是小红书爆款内容专家。请围绕「{{主题}}」写 10 个标题，要求：\n1. 每条不超过 20 字，带情绪钩子\n2. 至少 5 条使用「数字 + 痛点 + 结果」结构\n3. 至少 3 条使用「反常识」或「避雷」角度\n4. 不要标题党到失真，要有具体信息量\n5. 结尾附 1 行推荐理由\n\n目标人群：{{目标人群}}'
    },
    {
      title: '长文改写（保留观点，去掉 AI 味）', cat: '写作', tags: ['改写', '润色', '中文'],
      body: '请把下面的文字改写得像真人写的：\n\n要求：\n- 保留全部核心观点和数据，不新增事实\n- 去掉“首先/其次/总之/综上所述”这类连接词\n- 句子长短交错，允许口语化表达\n- 段落之间用逻辑自然过渡，不用小标题\n- 总字数控制在原文 ±10%\n\n原文：\n{{原文}}'
    },
    {
      title: '代码审查（严格模式）', cat: '编程', tags: ['代码', '审查', '工程'],
      body: '请以资深{{语言}}工程师的身份审查下面的代码，按以下顺序输出：\n\n1. 严重问题（会导致 bug / 安全漏洞 / 数据丢失），每条标注行号和修复代码\n2. 性能问题（复杂度、重复计算、不必要的 IO）\n3. 可读性与命名\n4. 边界情况清单\n\n只提真正重要的问题，不要凑数。如果没有问题就直说。\n\n代码：\n{{代码}}'
    },
    {
      title: '周报生成（工作量化）', cat: '办公', tags: ['周报', '汇报', '职场'],
      body: '根据以下零散记录，写一份本周周报：\n\n{{本周记录}}\n\n格式要求：\n- 一句话总结本周产出（带可量化的数字）\n- 分「已完成 / 进行中 / 风险与求助」三块\n- 每条用「动作 + 结果 + 数字」写法，不要写“参与了”\n- 风险项要给出具体需要谁配合\n- 下周计划 3 条以内，每条有明确交付物'
    },
    {
      title: '英语精读拆解', cat: '学习', tags: ['英语', '精读', '学习'],
      body: '请带我精读这段英文：\n\n{{英文段落}}\n\n输出：\n1. 逐句翻译（意译优先，不要直译腔）\n2. 挑出 5 个值得记的搭配/短语，给中文解释 + 一个自造例句\n3. 分析 2 个长难句的结构（主谓宾切分）\n4. 用 3 个问题检验我是否读懂\n5. 最后给一段 80 词的中文复述，让我反译回英文'
    },
    {
      title: '短视频口播脚本（30 秒）', cat: '视频', tags: ['短视频', '脚本', '口播'],
      body: '写一条 30 秒短视频口播脚本，主题「{{主题}}」，面向{{目标人群}}。\n\n结构：\n- 0-3 秒：一句反常识/提问钩子（必须让人停下）\n- 3-20 秒：讲清 1 个核心观点 + 1 个具体例子\n- 20-28 秒：给出可立即执行的动作\n- 28-30 秒：一句话收尾 + 引导互动\n\n每句标注预计秒数，口语化，不要书面语。'
    },
    {
      title: '封面图设计（3:4 竖版）', cat: 'AI 绘画', tags: ['封面', '设计', '排版'],
      body: '设计一张 3:4 竖版知识类封面图，主题「{{主题}}」。\n\n风格：{{风格}}，大字号中文标题位于{{位置}}，副标题小一号，主体元素是{{主体}}，留白充足，对比强烈，杂志排版感。\n\n注意：中文文字必须准确清晰，不要出现错别字或英文乱码。'
    },
    {
      title: '面试 STAR 故事打磨', cat: '求职', tags: ['面试', '求职', 'STAR'],
      body: '我要准备「{{岗位}}」面试。请把我这段经历打磨成 STAR 故事：\n\n{{经历}}\n\n要求：\n1. 用 S/T/A/R 四段重写，每段 2-3 句\n2. A（行动）部分必须体现我的判断和取舍，不能只是执行\n3. 结果要有数字\n4. 最后补 1 个可能的追问和我的回答要点\n5. 全篇口语化，念出来不超过 90 秒'
    },
    {
      title: '会议纪要整理', cat: '办公', tags: ['会议', '纪要', '效率'],
      body: '把这段会议记录整理成纪要：\n\n{{会议记录}}\n\n输出格式：\n## 结论（3 条以内）\n## 待办\n| 事项 | 负责人 | 截止时间 |\n## 有分歧未定的事\n## 需要同步给不在场的人\n\n原则：只写已经决定的，不要替我下结论；信息不全的地方标注“待确认”。'
    },
    {
      title: '提示词优化器（元提示词）', cat: 'AI 绘画', tags: ['元', '优化', '进阶'],
      body: '你是一名提示词工程师。请优化下面这条提示词：\n\n{{原始提示词}}\n\n要求：\n1. 指出它含糊、冲突或缺信息的地方\n2. 重写一版，补齐：角色、任务、约束、输出格式、评判标准\n3. 说明每一处改动的理由\n4. 给出一个输入示例和一个输出示例\n\n优化后要能直接复制使用。'
    }
  ];

  function seedPrompts(force) {
    const seeded = localStorage.getItem(K.seeded) === '1';
    if (!force && (seeded || prompts.length)) return;
    const now = Date.now();
    const fresh = SEED.map((s, i) => ({
      id: uid() + i, title: s.title, body: s.body, cat: s.cat, tags: s.tags.slice(),
      fav: i < 3, uses: 0, createdAt: now - i * 60000, updatedAt: now - i * 60000
    }));
    if (force) {
      const exist = new Set(prompts.map((p) => p.title));
      prompts = fresh.filter((p) => !exist.has(p.title)).concat(prompts);
    } else {
      prompts = fresh.concat(prompts);
    }
    localStorage.setItem(K.seeded, '1');
    savePrompts();
  }

  async function seedSampleImages() {
    const box = window.PV_SAMPLES;
    if (!box || !Array.isArray(box.images) || !box.images.length) return;
    if (images.length) return;
    if (localStorage.getItem('pv.samples.img') === '1') return;
    let n = 0;
    for (const s of box.images) {
      try {
        const blob = dataURLtoBlob(s.data);
        const id = uid() + n;
        const rec = {
          id, title: s.title || '', note: s.note || '', tags: s.tags || [], fav: !!s.fav,
          w: s.w || 0, h: s.h || 0, mime: blob.type || 'image/webp',
          size: blob.size, origSize: blob.size,
          createdAt: Date.now() - n * 3600000, updatedAt: Date.now(),
          thumb: s.thumb || s.data
        };
        await ImgStore.put(id, rec, blob);
        images.push(rec); n++;
      } catch (e) { console.warn(e); }
    }
    if (n) localStorage.setItem('pv.samples.img', '1');
  }

  /* ==========================================================
     16. 安装 PWA
     ========================================================== */
  async function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      Toast(outcome === 'accepted' ? '正在安装…' : '已取消');
      return;
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) { Toast('已经是独立 App 了'); return; }
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      Toast('点浏览器右上角 ⋮ →「安装应用」');
    } else if (/iphone|ipad/i.test(ua)) {
      Toast('点底部分享 →「添加到主屏幕」');
    } else {
      Toast('在浏览器地址栏右侧点「安装」图标');
    }
  }

  /* ==========================================================
     17. 事件绑定
     ========================================================== */
  function setView(v) {
    ui.view = v;
    ui.q = ''; $('#search').value = ''; $('#searchClear').hidden = true;
    if (v !== 'prompts' && v !== 'fav') ui.cat = 'all';
    if (v === 'images') ui.cat = 'all';
    if (v === 'settings') { ui.tag = null; }
    settings.view = v; saveSettings();
    window.scrollTo({ top: 0 });
    render();
    document.querySelector('.main').scrollTop = 0;
  }

  function bindEvents() {
    // 视图切换
    $$('#viewNav .nav-item, #tabbar .tab').forEach((b) => {
      b.addEventListener('click', () => setView(b.dataset.view));
    });

    // 筛选条横向滚动提示（内容超出且未到底时右侧渐隐）
    const fb = $('#filterBar');
    if (fb) {
      const updFade = () => {
        const max = fb.scrollWidth - fb.clientWidth;
        fb.classList.toggle('has-more', max - fb.scrollLeft > 8);
        fb.classList.toggle('has-less', fb.scrollLeft > 8);
      };
      fb.addEventListener('scroll', updFade, { passive: true });
      window.addEventListener('resize', updFade);
      if (window.ResizeObserver) new ResizeObserver(updFade).observe(fb);
      new MutationObserver(updFade).observe(fb, { childList: true, subtree: true });
      setTimeout(updFade, 0);
    }
    $('#brandHome').addEventListener('click', (e) => { e.preventDefault(); setView('prompts'); ui.cat = 'all'; ui.tag = null; render(); });

    // 搜索
    const search = $('#search');
    const doSearch = debounce(() => { ui.q = search.value.trim(); $('#searchClear').hidden = !ui.q; render(); }, 160);
    search.addEventListener('input', doSearch);
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search.blur(); } });
    $('#searchClear').onclick = () => { search.value = ''; ui.q = ''; $('#searchClear').hidden = true; search.focus(); render(); };

    // 新建
    const newPrompt = () => openEditor(null);
    $('#btnNew').onclick = newPrompt;
    $('#fab').onclick = newPrompt;
    $('#btnTheme').onclick = () => {
      const order = ['auto', 'light', 'dark'];
      settings.theme = order[(order.indexOf(settings.theme) + 1) % 3];
      saveSettings(); applyTheme();
      Toast('主题：' + ({ auto: '跟随系统', light: '浅色', dark: '深色' })[settings.theme]);
    };
    $('#btnSort').onclick = () => {
      const order = ['recent', 'created', 'name', 'uses'];
      settings.sort = order[(order.indexOf(settings.sort) + 1) % order.length];
      saveSettings(); render(); Toast('排序：' + SORT_NAME[settings.sort]);
    };
    $('#btnLayout').onclick = () => {
      settings.layout = settings.layout === 'grid' ? 'list' : 'grid';
      saveSettings(); render();
    };
    $('#btnInstall').onclick = doInstall;

    // 筛选点击（侧栏 + 手机筛选条）
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]');
      if (c) { ui.cat = c.dataset.cat || 'all'; ui.tag = null; render(); return; }
      const t = e.target.closest('[data-tag]');
      if (t) {
        const v = t.dataset.tag;
        ui.tag = (ui.tag === v) ? null : v;
        if (ui.tag) ui.cat = 'all';
        render();
      }
    });

    // 内容区委托
    $('#content').addEventListener('click', async (e) => {
      const card = e.target.closest('.p-card');
      const iCard = e.target.closest('.i-card');

      if (iCard) { openLightbox(iCard.dataset.id); return; }

      const actBtn = e.target.closest('[data-act]');
      if (actBtn && !card) {
        const a = actBtn.dataset.act;
        if (a === 'new') return openEditor(null);
        if (a === 'clearFilter') { ui.q = ''; ui.cat = 'all'; ui.tag = null; $('#search').value = ''; $('#searchClear').hidden = true; render(); return; }
        if (a === 'loadSamples') { seedPrompts(true); render(); Toast('示例已载入'); return; }
        if (a === 'addImages') return $('#pickImages').click();
        return;
      }
      if (!card) return;
      const p = prompts.find((x) => x.id === card.dataset.id);
      if (!p) return;

      if (actBtn) {
        const a = actBtn.dataset.act;
        if (a === 'copy') { e.preventDefault(); return doCopy(p, actBtn); }
        if (a === 'fav') {
          p.fav = !p.fav; p.updatedAt = p.updatedAt; savePrompts();
          actBtn.classList.toggle('on', p.fav);
          renderCounts();
          Toast(p.fav ? '已收藏' : '已取消收藏');
          return;
        }
        if (a === 'more') return openCardMenu(p);
        if (a === 'edit') return openEditor(p.id);
        if (a === 'del') return deletePrompt(p);
      }
      // 点卡片空白处 = 查看详情（手机更自然）
      openPreview(p);
    });

    // 图片选择
    $('#pickImages').addEventListener('change', async (e) => {
      await addImageFiles(e.target.files);
      e.target.value = '';
    });
    $('#pickJson').addEventListener('change', async (e) => {
      if (e.target.files[0]) await importFile(e.target.files[0]);
      e.target.value = '';
    });

    // 拖拽
    let dragDepth = 0;
    const overlay = $('#dropOverlay');
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') === -1) return;
      dragDepth++; overlay.hidden = false;
    });
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.hidden = true; });
    window.addEventListener('drop', async (e) => {
      e.preventDefault(); dragDepth = 0; overlay.hidden = true;
      if (e.dataTransfer && e.dataTransfer.files.length) {
        await addImageFiles(e.dataTransfer.files);
        if (ui.view !== 'images') setView('images');
      }
    });

    // 粘贴图片
    document.addEventListener('paste', async (e) => {
      if (!e.clipboardData) return;
      const items = Array.prototype.slice.call(e.clipboardData.items || []);
      const files = items.filter((i) => i.kind === 'file' && /^image\//.test(i.type)).map((i) => i.getAsFile()).filter(Boolean);
      if (files.length) {
        e.preventDefault();
        await addImageFiles(files);
        if (ui.view !== 'images') setView('images');
      }
    });

    // 键盘
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

      if (e.key === 'Escape') {
        if ($('#modalRoot').hidden === false) { closeSheet(); return; }
        if (currentLightbox) { currentLightbox(); currentLightbox = null; return; }
        if (ui.q) { $('#search').value = ''; ui.q = ''; $('#searchClear').hidden = true; render(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); $('#search').focus(); $('#search').select(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault(); openEditor(null); return;
      }
      if (!typing && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault(); openEditor(null);
      }
    });

    // 安装提示
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const b = $('#btnInstall');
      if (b) b.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      Toast('已安装到桌面 🎉');
      const b = $('#btnInstall'); if (b) b.hidden = true;
    });
    if (window.matchMedia('(display-mode: standalone)').matches) {
      const b = $('#btnInstall'); if (b) b.hidden = true;
    }

    // 手机端菜单按钮：切到设置
    // 手机抽屉：左上角按钮打开侧栏（分类 / 标签 / 快捷操作）
    const sidebar = $('#sidebar');
    let scrim = document.getElementById('scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.id = 'scrim';
      document.body.appendChild(scrim);
    }
    // 抽屉头部 + 快捷操作
    if (!sidebar.querySelector('.sb-head')) {
      const head = document.createElement('div');
      head.className = 'sb-head';
      head.innerHTML = `<span class="sb-brand">${ICO.spark}<b>灵感库</b></span>
        <button class="icon-btn" data-drawer-close aria-label="关闭">${ICO.close}</button>`;
      sidebar.insertBefore(head, sidebar.firstChild);
    }
    if (!sidebar.querySelector('.sb-quick')) {
      const quick = document.createElement('div');
      quick.className = 'sb-quick';
      quick.innerHTML = `
        <button class="sb-q" data-q="new">${ICO.plus}新建提示词</button>
        <button class="sb-q" data-q="img">${ICO.image}添加图片</button>
        <button class="sb-q" data-q="import">${ICO.upload}导入备份</button>
        <button class="sb-q" data-q="export">${ICO.download}导出备份</button>`;
      const navEl = sidebar.querySelector('#viewNav');
      const catEl = sidebar.querySelector('#catBlock');
      if (navEl && catEl) sidebar.insertBefore(quick, catEl);
      else if (navEl) navEl.after(quick);
      else sidebar.appendChild(quick);
      quick.addEventListener('click', (e) => {
        const b = e.target.closest('.sb-q');
        if (!b) return;
        const k = b.dataset.q;
        closeDrawer();
        if (k === 'new') setTimeout(() => openEditor(null), 160);
        if (k === 'img') setTimeout(() => $('#pickImages').click(), 160);
        if (k === 'import') setTimeout(() => $('#pickJson').click(), 160);
        if (k === 'export') setTimeout(() => exportAll(), 160);
      });
    }

    const closeDrawer = () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); };
    const openDrawer = () => { sidebar.classList.add('open'); scrim.classList.add('show'); };
    $('#btnMenu').onclick = () => {
      if (sidebar.classList.contains('open')) closeDrawer(); else openDrawer();
    };
    scrim.onclick = closeDrawer;
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item, .chip, [data-drawer-close]')) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) { closeDrawer(); }
    });
  }

  /* ---------- 提示词详情预览 ---------- */
  function openPreview(p) {
    const vars = extractVars(p.body);
    openSheet(`
      <div class="sheet-grab"></div>
      <div class="sheet-head">
        <h2 style="font-size:15.5px">${esc(p.title || '未命名')}</h2>
        <button class="icon-btn" data-close>${ICO.close}</button>
      </div>
      <div class="sheet-body">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          <span class="cat">${esc(p.cat || '未分类')}</span>
          ${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <div class="preview" style="max-height:none;margin-top:0">${esc(p.body)}</div>
        <div style="font-size:11.5px;color:var(--text-3);margin-top:10px">
          ${p.uses ? '用过 ' + p.uses + ' 次 · ' : ''}创建于 ${fmtAgo(p.createdAt)}
          ${vars.length ? ' · 含 ' + vars.length + ' 个变量' : ''}
        </div>
        ${(() => {
          const linked = images.filter((i) => i.promptId === p.id);
          if (!linked.length) return '';
          return `<div class="pv-imgs"><div class="pv-imgs-h">这条提示词生成的图 · ${linked.length} 张</div>
            <div class="pv-imgs-row">${linked.slice(0, 8).map((i) => `<button class="pv-thumb" data-pv-img="${i.id}"><img src="${i.thumb || ''}" alt=""></button>`).join('')}</div></div>`;
        })()}
      </div>
      <div class="sheet-foot">
        <button class="btn" data-close>关闭</button>
        <button class="btn" id="pvEdit">${ICO.edit}编辑</button>
        <button class="btn primary" id="pvCopy">${ICO.copy}复制</button>
      </div>`);
    $$('[data-pv-img]').forEach((b) => {
      b.onclick = () => {
        const im = images.find((x) => x.id === b.dataset.pvImg);
        closeSheet();
        if (im) setTimeout(() => openLightbox(im), 80);
      };
    });
    $('#pvCopy').onclick = () => { closeSheet(); setTimeout(() => doCopy(p, null), 60); };
    $('#pvEdit').onclick = () => { closeSheet(); setTimeout(() => openEditor(p.id), 60); };
  }

  /* 快捷方式深链接：?view=prompts|images|fav|settings 、?action=new */
  function handleDeepLink() {
    let sp;
    try { sp = new URLSearchParams(location.search); } catch (e) { return; }
    const v = sp.get('view');
    if (v && VIEWS[v]) ui.view = v;
    if (sp.get('action') === 'new') setTimeout(() => openEditor(null), 280);
    if (sp.toString()) {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { }
    }
  }

  /* ==========================================================
     18. 启动
     ========================================================== */
  async function boot() {
    ensurePersist();
    loadAll();
    applyTheme();
    await ImgStore.init();
    await loadImages();
    seedPrompts(false);
    await seedSampleImages();

    ui.view = settings.view && VIEWS[settings.view] ? settings.view : 'prompts';
    handleDeepLink();
    document.body.classList.toggle('themed', true);
    render();
    bindEvents();

    if (ImgStore.mode === 'ls') {
      console.warn('[PromptVault] 使用 localStorage 存储图片，容量有限');
    }

    // 首次进入且没有图片时，引导一下
    if (!localStorage.getItem('pv.intro')) {
      localStorage.setItem('pv.intro', '1');
      setTimeout(() => Toast('提示：Ctrl+V 可以直接粘贴图片'), 900);
    }
  }

  /* Service Worker：必须在 load 之后注册，但 boot 可能晚于 load，
     所以这里独立判断就绪状态，避免错过事件导致离线/安装能力永久失效。 */
  (function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    const reg = () => { navigator.serviceWorker.register('sw.js').catch(() => { }); };
    if (document.readyState === 'complete') reg();
    else window.addEventListener('load', reg, { once: true });
  })();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
