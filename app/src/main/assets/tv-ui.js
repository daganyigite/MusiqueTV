/*
 * Musique TV — interface TV injectée dans music.apple.com
 * Utilise le lecteur Apple déjà présent dans la page (window.MusicKit).
 * Navigation : flèches de la télécommande, OK pour valider, Retour géré par l'app.
 */
(function () {
  if (window.__tvui) return;
  window.__tvui = true;

  /* ---------- Réglages ---------- */
  var ACCENTS = ['#7DD3B8', '#F2B544', '#8AB4FF', '#F28B6B'];
  var accent = ACCENTS[0];
  try { accent = localStorage.getItem('tv_accent') || accent; } catch (e) {}

  /* ---------- Styles ---------- */
  var css = [
    '#tvui{position:fixed;inset:0;z-index:2147483647;background:#0E0F13;color:#F2F2F4;',
    'font-family:Manrope,"Segoe UI",Roboto,system-ui,sans-serif;display:flex;overflow:hidden;font-size:16px}',
    '#tvui.tv-hidden{display:none}',
    '#tvui *{box-sizing:border-box}',
    '#tvui .rail{width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:6px;padding:40px 16px 110px;border-right:1px solid #1E2028}',
    '#tvui .logo{width:46px;height:46px;border-radius:12px;background:var(--acc);margin:0 0 24px 12px;display:flex;align-items:center;justify-content:center}',
    '#tvui .tab{height:50px;border-radius:12px;padding:0 16px;display:flex;align-items:center;gap:14px;color:#9A9CA6;font-weight:500;font-size:17px;outline:none}',
    '#tvui .tab.on{background:#1E2028;color:#F2F2F4;font-weight:700}',
    '#tvui .tab:focus{background:#F2F2F4;color:#0E0F13}',
    '#tvui .tab.bottom{margin-top:auto}',
    '#tvui .main{flex:1;min-width:0;overflow-y:auto;padding:44px 56px 130px;scroll-behavior:smooth}',
    '#tvui .main::-webkit-scrollbar,#tvui .row::-webkit-scrollbar{display:none}',
    '#tvui h1{margin:0 0 6px;font-size:36px;font-weight:800;letter-spacing:-.02em}',
    '#tvui h2{margin:34px 0 16px;font-size:21px;font-weight:700}',
    '#tvui .sub{color:#9A9CA6;font-size:15px;margin:0}',
    '#tvui .row{display:flex;gap:24px;overflow-x:auto;padding:18px 18px 18px;margin:-8px -18px 0}',
    '#tvui .card{width:180px;flex-shrink:0;outline:none;display:flex;flex-direction:column;gap:10px;transition:transform .15s}',
    '#tvui .card.wide{width:300px}',
    '#tvui .art{width:100%;aspect-ratio:1/1;border-radius:16px;background:#1E2028 center/cover no-repeat;display:flex;align-items:flex-end;padding:14px;font-size:54px;font-weight:800;color:rgba(14,15,19,.55)}',
    '#tvui .card.wide .art{aspect-ratio:16/9}',
    '#tvui .card:focus{transform:scale(1.06)}',
    '#tvui .card:focus .art{outline:4px solid #F2F2F4;outline-offset:4px}',
    '#tvui .ct{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .cs{font-size:13px;color:#9A9CA6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-6px}',
    '#tvui .btn{height:52px;padding:0 26px;border-radius:26px;background:#1E2028;color:#F2F2F4;display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:16px;outline:none}',
    '#tvui .btn.pri{background:#F2F2F4;color:#0E0F13}',
    '#tvui .btn:focus{outline:3px solid var(--acc);outline-offset:4px}',
    '#tvui .btns{display:flex;gap:14px;flex-wrap:wrap;margin-top:22px}',
    '#tvui .detail{display:flex;gap:56px}',
    '#tvui .dleft{width:340px;flex-shrink:0}',
    '#tvui .dleft .art{width:320px;height:320px;font-size:96px;border-radius:20px;margin-bottom:22px}',
    '#tvui .tracks{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
    '#tvui .trk{display:flex;align-items:center;gap:18px;padding:10px 16px;border-radius:12px;outline:none}',
    '#tvui .trk:focus{background:#1E2028;outline:2px solid #F2F2F4}',
    '#tvui .trk .n{width:28px;text-align:right;color:#9A9CA6;font-size:15px}',
    '#tvui .trk .art{width:46px;height:46px;border-radius:8px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .trk .tx{flex:1;min-width:0}',
    '#tvui .trk .tt{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .trk .ta{font-size:13px;color:#9A9CA6}',
    '#tvui .trk .du{font-size:14px;color:#9A9CA6}',
    '#tvui .mini{position:fixed;left:220px;right:0;bottom:0;height:86px;background:#16171D;border-top:1px solid #1E2028;display:flex;align-items:center;gap:18px;padding:0 56px;outline:none}',
    '#tvui .mini:focus{background:#1E2028;box-shadow:inset 0 0 0 3px #F2F2F4}',
    '#tvui .mini .art{width:52px;height:52px;border-radius:8px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .bar{flex:1;height:5px;border-radius:3px;background:#2A2C36;margin:0 24px;overflow:hidden}',
    '#tvui .bar i{display:block;height:100%;background:var(--acc);width:0}',
    '#tvui .player{position:fixed;inset:0;background:#0E0F13;display:flex;gap:72px;padding:72px 80px;z-index:5}',
    '#tvui .pmain{flex:1;min-width:0;display:flex;gap:56px;align-items:center}',
    '#tvui .player .big{width:400px;height:400px;flex-shrink:0;border-radius:24px;padding:0;font-size:0}',
    '#tvui .pinfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:30px}',
    '#tvui .kick{font-size:14px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase;margin:0}',
    '#tvui .ptitle{font-size:44px;font-weight:800;letter-spacing:-.02em;line-height:1.1;margin:8px 0}',
    '#tvui .partist{font-size:20px;color:#9A9CA6;margin:0}',
    '#tvui .times{display:flex;justify-content:space-between;font-size:14px;color:#9A9CA6;margin-top:10px}',
    '#tvui .ctrls{display:flex;align-items:center;gap:22px}',
    '#tvui .cb{flex-shrink:0;width:60px;height:60px;border-radius:50%;background:#1E2028;color:#F2F2F4;display:flex;align-items:center;justify-content:center;outline:none}',
    '#tvui .cb.sm{width:52px;height:52px;background:transparent;color:#9A9CA6}',
    '#tvui .cb.sm.act{color:var(--acc)}',
    '#tvui .cb.pp{width:84px;height:84px;background:#F2F2F4;color:#0E0F13}',
    '#tvui .cb:focus{outline:4px solid var(--acc);outline-offset:5px}',
    '#tvui .queue{width:290px;flex-shrink:0;border-left:1px solid #1E2028;padding-left:32px;display:flex;flex-direction:column;gap:14px;overflow:hidden}',
    '#tvui .qi{display:flex;align-items:center;gap:12px}',
    '#tvui .qi .art{width:44px;height:44px;border-radius:8px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}',
    '#tvui input.search{width:100%;max-width:720px;height:60px;border-radius:30px;border:0;background:#1E2028;color:#F2F2F4;font:inherit;font-size:20px;padding:0 28px;outline:none}',
    '#tvui input.search:focus{outline:3px solid var(--acc)}',
    '#tvui .msg{color:#9A9CA6;font-size:16px;padding:20px 0}',
    '#tvui .swatch{width:52px;height:52px;border-radius:50%;outline:none}',
    '#tvui .swatch:focus{outline:4px solid #F2F2F4;outline-offset:4px}'
  ].join('');

  /* ---------- Icônes ---------- */
  var IC = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
    home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
    explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    radio: 'M4 9h16v11H4zM8 9l9-5M6.5 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M13 13h4M13 16h4',
    video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3z',
    library: 'M4 4v16M9 4v16M14 4l5 15.5',
    settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3'
  };
  function icon(name, size) {
    size = size || 22;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + IC[name] + '"/></svg>';
  }
  var SVG_PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var SVG_PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var SVG_PREV = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 5v14L8 12z"/><rect x="5" y="5" width="2.5" height="14" rx="1"/></svg>';
  var SVG_NEXT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l10-7z"/><rect x="16.5" y="5" width="2.5" height="14" rx="1"/></svg>';
  var SVG_NOTE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E0F13" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

  /* ---------- Outils ---------- */
  var COLORS = ['#E8A45C', '#6FA8DC', '#93C47D', '#D5A6BD', '#F28B6B', '#8AB4FF', '#F2B544', '#C8A2F0'];
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function artUrl(attrs, size) {
    var a = attrs && attrs.artwork;
    if (!a || !a.url) return '';
    return a.url.replace('{w}', size).replace('{h}', size).replace('{f}', 'jpg');
  }
  function artStyle(attrs, size, seed) {
    var u = artUrl(attrs, size);
    if (u) return 'background-image:url(\'' + u + '\')';
    var i = Math.abs(hash(seed || '')) % COLORS.length;
    return 'background-color:' + COLORS[i];
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function initial(name) { return esc((name || '?').trim().charAt(0).toUpperCase()); }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }
  function fmtMs(ms) { return ms ? fmt(ms / 1000) : ''; }

  /* ---------- Racine ---------- */
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  var font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(font);

  var root = document.createElement('div');
  root.id = 'tvui';
  root.style.setProperty('--acc', accent);
  document.body.appendChild(root);
  document.documentElement.style.overflow = 'hidden';

  function bridgeReady() { try { window.TVBridge && TVBridge.ready(); } catch (e) {} }

  /* ---------- État ---------- */
  var music = null;
  var sf = 'us';
  var tab = 'home';
  var stack = [];          // vues ouvertes par-dessus un onglet (détails)
  var playerOpen = false;
  var videoMode = false;
  var lastFocus = null;

  /* ---------- Navigation télécommande ---------- */
  function focusables() {
    var scope = root.querySelector('.player') || root;
    return Array.prototype.filter.call(scope.querySelectorAll('[data-f]'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  function focusEl(el) {
    if (!el) return;
    var pl = root.querySelector('.player');
    if (pl && !pl.contains(el)) return; // le lecteur plein écran garde le focus
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    lastFocus = el;
  }
  function focusFirst(sel) {
    var el = root.querySelector(sel || '.main [data-f]') || focusables()[0];
    focusEl(el);
  }
  function move(dir) {
    var cur = document.activeElement;
    var list = focusables();
    if (!cur || list.indexOf(cur) < 0) { focusEl(list[0]); return; }
    var a = cur.getBoundingClientRect();
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestScore = Infinity;
    // Haut/bas restent dans la même zone (menu de gauche OU contenu).
    var zone = function (el) { return el.closest('.rail') ? 'rail' : 'content'; };
    var curZone = zone(cur);
    list.forEach(function (el) {
      if (el === cur) return;
      if ((dir === 'up' || dir === 'down') && zone(el) !== curZone) return;
      var b = el.getBoundingClientRect();
      var bx = b.left + b.width / 2, by = b.top + b.height / 2;
      var dx = bx - ax, dy = by - ay, main, cross;
      if (dir === 'left') { if (b.right > a.left + 1) return; main = -dx; cross = Math.abs(dy); }
      if (dir === 'right') { if (b.left < a.right - 1) return; main = dx; cross = Math.abs(dy); }
      if (dir === 'up') { if (b.bottom > a.top + 1) return; main = -dy; cross = Math.abs(dx); }
      if (dir === 'down') { if (b.top < a.bottom - 1) return; main = dy; cross = Math.abs(dx); }
      var score = main + cross * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    // En entrant dans une liste de titres par le côté, on commence par le premier visible.
    if (best && best.classList.contains('trk') && !cur.classList.contains('trk')) {
      var view = root.querySelector('.main').getBoundingClientRect();
      var first = Array.prototype.filter.call(root.querySelectorAll('.trk'), function (t) {
        return t.getBoundingClientRect().top >= view.top - 1;
      })[0];
      if (first) best = first;
    }
    if (best) focusEl(best);
  }
  window.addEventListener('keydown', function (e) {
    if (videoMode || root.classList.contains('tv-hidden')) return;
    var k = e.key;
    var inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
    var dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (dirs[k]) {
      if (inInput && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
      move(dirs[k]);
    } else if (k === 'Enter' || k === ' ') {
      if (inInput) { e.stopPropagation(); if (k === 'Enter') doSearch(document.activeElement.value); return; }
      e.preventDefault(); e.stopPropagation();
      if (document.activeElement && document.activeElement.hasAttribute('data-f')) document.activeElement.click();
    }
  }, true);

  /* Retour (appelé par l'app Android). Renvoie true si géré. */
  window.__tvBack = function () {
    if (videoMode) { exitVideo(); return true; }
    if (playerOpen) { closePlayer(); return true; }
    if (stack.length) { stack.pop(); render(); return true; }
    if (tab !== 'home') { tab = 'home'; render(); return true; }
    return false;
  };
  window.__tvMedia = function (a) {
    if (!music) return;
    try {
      if (a === 'toggle') music.isPlaying ? music.pause() : music.play();
      if (a === 'play') music.play();
      if (a === 'pause') music.pause();
      if (a === 'next') music.skipToNextItem();
      if (a === 'previous') music.skipToPreviousItem();
    } catch (e) {}
  };

  /* ---------- API Apple Music ---------- */
  function api(path, params) {
    return music.api.music(path.replace('{sf}', sf), params || {}).then(function (r) {
      // r.data = la réponse JSON d'Apple ; sa clé "data" contient la liste quand il y en a une.
      var body = r && r.data ? r.data : (r || {});
      return Array.isArray(body.data) ? body.data : body;
    });
  }

  /* ---------- Rendu ---------- */
  var TABS = [
    ['search', 'Rechercher'], ['home', 'Accueil'], ['explore', 'Explorer'], ['radio', 'Radio'],
    ['video', 'Vidéos'], ['library', 'Bibliothèque']
  ];

  function shell(content) {
    var rail = '<div class="rail"><div class="logo">' + SVG_NOTE + '</div>' +
      TABS.map(function (t) {
        return '<div class="tab' + (tab === t[0] && !stack.length ? ' on' : '') + '" data-f tabindex="0" data-tab="' + t[0] + '">' + icon(t[0]) + '<span>' + t[1] + '</span></div>';
      }).join('') +
      '<div class="tab bottom' + (tab === 'settings' ? ' on' : '') + '" data-f tabindex="0" data-tab="settings">' + icon('settings') + '<span>Réglages</span></div></div>';
    root.innerHTML = rail + '<div class="main">' + content + '</div>' + miniHtml();
    bindCommon();
    if (playerOpen) {
      // Un écran s'est rechargé derrière le lecteur : on remet le lecteur au-dessus.
      var p = document.createElement('div');
      p.className = 'player';
      root.appendChild(p);
      drawPlayer();
    }
  }

  function bindCommon() {
    root.querySelectorAll('[data-tab]').forEach(function (el) {
      el.onclick = function () { tab = el.getAttribute('data-tab'); stack = []; render(); };
    });
    var mini = root.querySelector('.mini');
    if (mini) mini.onclick = openPlayer;
    updateMini();
  }

  function cardHtml(item, opts) {
    opts = opts || {};
    var at = item.attributes || {};
    var name = at.name || at.title || '';
    var sub = opts.sub != null ? opts.sub : (at.artistName || at.curatorName || (at.trackCount ? at.trackCount + ' titres' : ''));
    var art = opts.wide ? artUrl(at, 600) : '';
    var st = opts.wide && art ? 'background-image:url(\'' + art + '\')' : artStyle(at, 360, name);
    return '<div class="card' + (opts.wide ? ' wide' : '') + '" data-f tabindex="0" data-id="' + esc(item.id) + '" data-type="' + esc(item.type) + '">' +
      '<div class="art" style="' + st + '">' + (artUrl(at, 10) ? '' : initial(name)) + '</div>' +
      '<div class="ct">' + esc(name) + '</div><div class="cs">' + esc(sub) + '</div></div>';
  }

  function rowHtml(title, items, opts) {
    if (!items || !items.length) return '';
    var key = 'r' + Math.random().toString(36).slice(2);
    rowCache[key] = items;
    return '<h2>' + esc(title) + '</h2><div class="row" data-row="' + key + '">' +
      items.map(function (it) { return cardHtml(it, opts); }).join('') + '</div>';
  }
  var rowCache = {};

  function bindCards() {
    root.querySelectorAll('.main .card').forEach(function (el) {
      el.onclick = function () {
        var rowEl = el.closest('[data-row]');
        var items = rowEl ? rowCache[rowEl.getAttribute('data-row')] : null;
        var item = items && items.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (item) openItem(item);
      };
    });
  }

  function loading(title) {
    shell((title ? '<h1>' + esc(title) + '</h1>' : '') + '<p class="msg">Chargement…</p>');
  }
  function errorView(msg) {
    var m = root.querySelector('.main');
    if (m) m.innerHTML += '<p class="msg">' + esc(msg) + '</p>';
  }

  function render() {
    rowCache = {};
    if (stack.length) { var top = stack[stack.length - 1]; return top(); }
    ({ home: viewHome, search: viewSearch, explore: viewExplore, radio: viewRadio, video: viewVideo,
       library: viewLibrary, settings: viewSettings })[tab]();
  }

  function settle(focusSel) {
    bindCards();
    var sel = focusSel || '.main [data-f]';
    var el = root.querySelector(sel);
    focusEl(el || root.querySelector('.tab.on'));
  }

  /* ----- Accueil ----- */
  function viewHome() {
    var h = new Date().getHours();
    var hello = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    loading(hello);
    Promise.all([
      api('/v1/me/library/playlists', { limit: 25 }).catch(function () { return []; }),
      api('/v1/me/recent/played', { limit: 15 }).catch(function () { return []; }),
      api('/v1/me/recommendations', { limit: 6 }).catch(function () { return []; })
    ]).then(function (r) {
      if (tab !== 'home' || stack.length) return;
      var html = '<h1>' + hello + '</h1><p class="sub">Connecté avec ton compte Apple</p>';
      html += rowHtml('Écoutés récemment', r[1]);
      html += rowHtml('Tes playlists', r[0]);
      (r[2] || []).forEach(function (rec) {
        var t = rec.attributes && rec.attributes.title && rec.attributes.title.stringForDisplay;
        var items = rec.relationships && rec.relationships.contents && rec.relationships.contents.data;
        html += rowHtml(t || 'Pour toi', items);
      });
      if (!r[0].length && !r[1].length) html += '<p class="msg">Rien à afficher pour l\'instant.</p>';
      shell(html);
      settle();
    });
  }

  /* ----- Explorer ----- */
  function viewExplore() {
    loading('Explorer');
    api('/v1/catalog/{sf}/charts', { types: 'playlists,albums,songs', limit: 20 }).then(function (d) {
      if (tab !== 'explore' || stack.length) return;
      var res = (d && d.results) || {};
      var html = '<h1>Explorer</h1><p class="sub">Les tops du moment</p>';
      (res.playlists || []).forEach(function (c) { html += rowHtml(c.name, c.data); });
      (res.albums || []).forEach(function (c) { html += rowHtml(c.name, c.data); });
      (res.songs || []).forEach(function (c) { html += rowHtml(c.name, c.data); });
      shell(html);
      settle();
    }).catch(function () { errorView('Impossible de charger Explorer.'); });
  }

  /* ----- Radio ----- */
  function viewRadio() {
    loading('Radio');
    Promise.all([
      api('/v1/catalog/{sf}/stations', { 'filter[featured]': 'apple-music-live-radio' }).catch(function () { return []; }),
      api('/v1/catalog/{sf}/stations', { 'filter[identity]': 'personal' }).catch(function () { return []; })
    ]).then(function (r) {
      if (tab !== 'radio' || stack.length) return;
      var html = '<h1>Radio</h1><p class="sub">Stations en direct et ta station perso</p>';
      html += rowHtml('Ta station', r[1]);
      html += rowHtml('En direct', r[0]);
      if (!r[0].length && !r[1].length) html += '<p class="msg">Aucune station disponible dans ton pays.</p>';
      shell(html);
      settle();
    });
  }

  /* ----- Vidéos ----- */
  function viewVideo() {
    loading('Vidéos');
    api('/v1/catalog/{sf}/charts', { types: 'music-videos', limit: 24 }).then(function (d) {
      if (tab !== 'video' || stack.length) return;
      var res = (d && d.results) || {};
      var html = '<h1>Vidéos</h1><p class="sub">Clips du moment</p>';
      (res['music-videos'] || []).forEach(function (c) { html += rowHtml(c.name, c.data, { wide: true }); });
      shell(html);
      settle();
    }).catch(function () { errorView('Impossible de charger les vidéos.'); });
  }

  /* ----- Bibliothèque ----- */
  function viewLibrary() {
    loading('Bibliothèque');
    Promise.all([
      api('/v1/me/library/playlists', { limit: 50 }).catch(function () { return []; }),
      api('/v1/me/library/albums', { limit: 50 }).catch(function () { return []; }),
      api('/v1/me/library/artists', { limit: 50 }).catch(function () { return []; })
    ]).then(function (r) {
      if (tab !== 'library' || stack.length) return;
      var html = '<h1>Bibliothèque</h1>';
      html += rowHtml('Playlists', r[0]);
      html += rowHtml('Albums', r[1]);
      html += rowHtml('Artistes', r[2], { sub: '' });
      html += '<div class="btns"><div class="btn" data-f tabindex="0" id="allSongs">Tous mes titres</div></div>';
      shell(html);
      root.querySelector('#allSongs').onclick = function () { pushView(function () { viewSongs(); }); };
      settle();
    });
  }
  function viewSongs() {
    loading('Mes titres');
    api('/v1/me/library/songs', { limit: 100 }).then(function (songs) {
      showTrackList({ attributes: { name: 'Mes titres' }, id: 'songs', type: 'library-songs-all' }, songs);
    });
  }

  /* ----- Rechercher ----- */
  var lastTerm = '';
  function viewSearch() {
    shell('<h1>Rechercher</h1><input class="search" data-f tabindex="0" placeholder="Artiste, titre, album…" value="' + esc(lastTerm) + '"><div id="results"></div>');
    var inp = root.querySelector('input.search');
    focusEl(inp);
    if (lastTerm) doSearch(lastTerm, true);
  }
  function doSearch(term, keepFocus) {
    term = (term || '').trim();
    if (!term) return;
    lastTerm = term;
    var box = root.querySelector('#results');
    if (!box) return;
    box.innerHTML = '<p class="msg">Recherche…</p>';
    api('/v1/catalog/{sf}/search', { term: term, types: 'songs,albums,playlists,artists', limit: 15 }).then(function (d) {
      var res = (d && d.results) || {};
      var html = '';
      if (res.songs) html += rowHtml('Titres', res.songs.data);
      if (res.albums) html += rowHtml('Albums', res.albums.data);
      if (res.playlists) html += rowHtml('Playlists', res.playlists.data);
      if (res.artists) html += rowHtml('Artistes', res.artists.data, { sub: '' });
      box.innerHTML = html || '<p class="msg">Aucun résultat.</p>';
      bindCards();
      if (!keepFocus) focusEl(box.querySelector('[data-f]') || root.querySelector('input.search'));
    }).catch(function () { box.innerHTML = '<p class="msg">La recherche a échoué.</p>'; });
  }

  /* ----- Réglages ----- */
  function viewSettings() {
    var html = '<h1>Réglages</h1>' +
      '<h2>Couleur d\'accent</h2><div class="row" style="gap:20px">' +
      ACCENTS.map(function (c) { return '<div class="swatch" data-f tabindex="0" data-c="' + c + '" style="background:' + c + '"></div>'; }).join('') +
      '</div><h2>Compte</h2><div class="btns">' +
      '<div class="btn" data-f tabindex="0" id="reload">Recharger l\'app</div>' +
      '<div class="btn" data-f tabindex="0" id="logout">Se déconnecter</div></div>' +
      '<p class="sub" style="margin-top:28px">Pays du compte : ' + esc(sf.toUpperCase()) + '</p>';
    shell(html);
    root.querySelectorAll('.swatch').forEach(function (el) {
      el.onclick = function () {
        accent = el.getAttribute('data-c');
        root.style.setProperty('--acc', accent);
        try { localStorage.setItem('tv_accent', accent); } catch (e) {}
      };
    });
    root.querySelector('#reload').onclick = function () { try { TVBridge.reloadUi(); } catch (e) { location.reload(); } };
    root.querySelector('#logout').onclick = function () {
      forgetToken();
      Promise.resolve(music.unauthorize()).then(function () { viewLogin(); });
    };
    settle();
  }

  /* ----- Ouvrir un élément ----- */
  function pushView(fn) { stack.push(fn); fn(); }

  function openItem(item) {
    var t = item.type || '';
    if (t === 'songs' || t === 'library-songs') { playItems([item], 0); return; }
    if (t === 'music-videos') { playVideo(item); return; }
    if (t === 'stations') { playStation(item); return; }
    if (t === 'artists' || t === 'library-artists') { pushView(function () { viewArtist(item); }); return; }
    if (/playlists|albums/.test(t)) { pushView(function () { viewCollection(item); }); return; }
  }

  function viewCollection(item) {
    var at = item.attributes || {};
    loading(at.name);
    var lib = /^library-/.test(item.type);
    var kind = /playlists/.test(item.type) ? 'playlists' : 'albums';
    var p = lib
      ? api('/v1/me/library/' + kind + '/' + item.id + '/tracks', { limit: 100 })
      : api('/v1/catalog/{sf}/' + kind + '/' + item.id, { include: 'tracks' }).then(function (d) {
          var x = Array.isArray(d) ? d[0] : d;
          return (x && x.relationships && x.relationships.tracks && x.relationships.tracks.data) || [];
        });
    p.then(function (tracks) { showTrackList(item, tracks); })
     .catch(function () { errorView('Impossible de charger cette liste.'); });
  }

  function viewArtist(item) {
    var at = item.attributes || {};
    loading(at.name);
    var p = /^library-/.test(item.type)
      ? api('/v1/me/library/artists/' + item.id + '/albums', { limit: 50 })
      : api('/v1/catalog/{sf}/artists/' + item.id + '/albums', { limit: 25 });
    p.then(function (albums) {
      shell('<h1>' + esc(at.name) + '</h1>' + rowHtml('Albums', albums));
      settle();
    }).catch(function () { errorView('Impossible de charger cet artiste.'); });
  }

  function showTrackList(item, tracks) {
    var at = item.attributes || {};
    tracks = (tracks || []).filter(function (t) { return t && t.attributes; });
    var html = '<div class="detail"><div class="dleft">' +
      '<div class="art" style="' + artStyle(at, 640, at.name) + '">' + (artUrl(at, 10) ? '' : initial(at.name)) + '</div>' +
      '<h1>' + esc(at.name) + '</h1><p class="sub">' + tracks.length + ' titres' + (at.artistName ? ' · ' + esc(at.artistName) : '') + '</p>' +
      '<div class="btns"><div class="btn pri" data-f tabindex="0" id="playAll">' + SVG_PLAY + 'Lecture</div>' +
      '<div class="btn" data-f tabindex="0" id="shuffleAll">' + icon('shuffle', 18) + 'Aléatoire</div></div></div>' +
      '<div class="tracks">' + tracks.map(function (t, i) {
        var a = t.attributes;
        return '<div class="trk" data-f tabindex="0" data-i="' + i + '"><span class="n">' + (i + 1) + '</span>' +
          '<div class="art" style="' + artStyle(a, 100, a.name) + '"></div>' +
          '<div class="tx"><div class="tt">' + esc(a.name) + '</div><div class="ta">' + esc(a.artistName) + '</div></div>' +
          '<span class="du">' + fmtMs(a.durationInMillis) + '</span></div>';
      }).join('') + (tracks.length ? '' : '<p class="msg">Liste vide.</p>') + '</div></div>';
    shell(html);
    root.querySelector('#playAll').onclick = function () { setShuffle(false); playItems(tracks, 0); };
    root.querySelector('#shuffleAll').onclick = function () {
      setShuffle(true);
      playItems(tracks, Math.floor(Math.random() * Math.max(1, tracks.length)));
    };
    root.querySelectorAll('.trk').forEach(function (el) {
      el.onclick = function () { playItems(tracks, +el.getAttribute('data-i')); };
    });
    focusEl(root.querySelector('#playAll'));
  }

  /* ---------- Lecture ---------- */
  function setShuffle(on) {
    try { music.shuffleMode = on ? 1 : 0; } catch (e) {}
  }
  function playItems(items, start) {
    if (!items.length) return;
    var descriptors = items.map(function (t) { return { id: t.id, type: t.type, attributes: t.attributes }; });
    Promise.resolve()
      .then(function () { return music.setQueue({ items: descriptors, startWith: start || 0 }); })
      .catch(function () {
        // Repli : on joue juste le morceau choisi.
        var t = items[start || 0];
        return music.setQueue({ song: t.id });
      })
      .then(function () { return music.play(); })
      .then(function () { openPlayer(); })
      .catch(function (e) { toast('Lecture impossible : ' + (e && e.message ? e.message : 'erreur')); });
  }
  function playStation(item) {
    Promise.resolve(music.setQueue({ station: item.id }))
      .then(function () { return music.play(); })
      .then(openPlayer)
      .catch(function () { toast('Impossible de lancer cette radio.'); });
  }
  function playVideo(item) {
    Promise.resolve(music.setQueue({ musicVideo: item.id }))
      .then(function () { return music.play(); })
      .then(function () {
        // On montre le lecteur vidéo du site Apple. Retour pour revenir.
        videoMode = true;
        root.classList.add('tv-hidden');
        toast('Vidéo en cours — touche Retour pour revenir');
      })
      .catch(function () { toast('Impossible de lire cette vidéo.'); });
  }
  function exitVideo() {
    videoMode = false;
    try { music.stop(); } catch (e) {}
    root.classList.remove('tv-hidden');
    render();
  }

  function toast(text) {
    var t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'position:fixed;left:50%;top:32px;transform:translateX(-50%);background:#F2F2F4;color:#0E0F13;padding:14px 26px;border-radius:26px;font:600 16px Manrope,system-ui,sans-serif;z-index:2147483647';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  /* ---------- Mini-lecteur ---------- */
  function nowItem() { try { return music.nowPlayingItem; } catch (e) { return null; } }
  function itemAttrs(it) { return it ? (it.attributes || it) : {}; }

  function miniHtml() {
    return '<div class="mini" data-f tabindex="0" style="display:none"><div class="art"></div>' +
      '<div style="min-width:0;max-width:340px"><div class="ct" id="mt"></div><div class="cs" id="ma" style="margin-top:2px"></div></div>' +
      '<div class="bar"><i id="mb"></i></div><div id="mp" style="width:48px;height:48px;border-radius:50%;background:#F2F2F4;color:#0E0F13;display:flex;align-items:center;justify-content:center"></div></div>';
  }
  function updateMini() {
    var mini = root.querySelector('.mini');
    if (!mini || !music) return;
    var it = nowItem();
    if (!it) { mini.style.display = 'none'; return; }
    var a = itemAttrs(it);
    mini.style.display = 'flex';
    mini.querySelector('.art').setAttribute('style', artStyle(a, 120, a.name));
    mini.querySelector('#mt').textContent = a.name || '';
    mini.querySelector('#ma').textContent = a.artistName || '';
    mini.querySelector('#mp').innerHTML = music.isPlaying ? SVG_PAUSE : SVG_PLAY;
    updateProgress();
  }
  function updateProgress() {
    var d = music.currentPlaybackDuration || 0, t = music.currentPlaybackTime || 0;
    var pct = d ? Math.min(100, (t / d) * 100) : 0;
    var mb = root.querySelector('#mb'); if (mb) mb.style.width = pct + '%';
    var pb = root.querySelector('#pb'); if (pb) pb.style.width = pct + '%';
    var pt = root.querySelector('#pt'); if (pt) pt.textContent = fmt(t);
    var pd = root.querySelector('#pd'); if (pd) pd.textContent = fmt(d);
  }

  /* ---------- Lecteur plein écran ---------- */
  function openPlayer() {
    if (!nowItem()) return;
    playerOpen = true;
    var old = root.querySelector('.player'); if (old) old.remove();
    var p = document.createElement('div');
    p.className = 'player';
    root.appendChild(p);
    drawPlayer();
    focusEl(p.querySelector('#pp'));
  }
  function closePlayer() {
    playerOpen = false;
    var p = root.querySelector('.player'); if (p) p.remove();
    updateMini();
    focusEl(root.querySelector('.mini') && root.querySelector('.mini').style.display !== 'none' ? root.querySelector('.mini') : root.querySelector('.main [data-f]'));
  }
  function drawPlayer() {
    var p = root.querySelector('.player');
    if (!p) return;
    var focusedId = document.activeElement && p.contains(document.activeElement) ? document.activeElement.id : 'pp';
    var a = itemAttrs(nowItem());
    var shuffle = false, repeat = 0;
    try { shuffle = music.shuffleMode === 1; repeat = music.repeatMode; } catch (e) {}
    var q = [];
    try {
      var items = music.queue.items || [];
      q = items.slice(music.queue.position + 1, music.queue.position + 7);
    } catch (e) {}
    p.innerHTML =
      '<div class="pmain"><div class="art big" style="' + artStyle(a, 800, a.name) + '"></div>' +
      '<div class="pinfo"><div><p class="kick">Lecture en cours</p>' +
      '<div class="ptitle">' + esc(a.name) + '</div><p class="partist">' + esc(a.artistName) + (a.albumName ? ' — ' + esc(a.albumName) : '') + '</p></div>' +
      '<div><div class="bar" style="margin:0;height:6px"><i id="pb"></i></div><div class="times"><span id="pt"></span><span id="pd"></span></div></div>' +
      '<div class="ctrls">' +
      '<div class="cb sm' + (shuffle ? ' act' : '') + '" data-f tabindex="0" id="psh">' + icon('shuffle') + '</div>' +
      '<div class="cb" data-f tabindex="0" id="ppr">' + SVG_PREV + '</div>' +
      '<div class="cb pp" data-f tabindex="0" id="pp">' + (music.isPlaying ? SVG_PAUSE : SVG_PLAY) + '</div>' +
      '<div class="cb" data-f tabindex="0" id="pnx">' + SVG_NEXT + '</div>' +
      '<div class="cb sm' + (repeat ? ' act' : '') + '" data-f tabindex="0" id="prp">' + icon('repeat') + (repeat === 1 ? '<span style="font-size:11px;font-weight:800;margin-left:-4px">1</span>' : '') + '</div>' +
      '</div></div></div>' +
      '<div class="queue"><h2 style="margin:0 0 6px">À suivre</h2>' +
      (q.length ? q.map(function (it) {
        var x = itemAttrs(it);
        return '<div class="qi"><div class="art" style="' + artStyle(x, 100, x.name) + '"></div><div style="min-width:0"><div class="ct" style="font-size:14px">' + esc(x.name) + '</div><div class="cs" style="margin-top:2px">' + esc(x.artistName) + '</div></div></div>';
      }).join('') : '<p class="sub">Rien après ce titre.</p>') + '</div>';
    p.querySelector('#pp').onclick = function () { music.isPlaying ? music.pause() : music.play(); };
    p.querySelector('#pnx').onclick = function () { music.skipToNextItem(); };
    p.querySelector('#ppr').onclick = function () {
      if ((music.currentPlaybackTime || 0) > 4) music.seekToTime(0); else music.skipToPreviousItem();
    };
    p.querySelector('#psh').onclick = function () { setShuffle(!(music.shuffleMode === 1)); drawPlayer(); };
    p.querySelector('#prp').onclick = function () { try { music.repeatMode = (music.repeatMode + 1) % 3; } catch (e) {} drawPlayer(); };
    updateProgress();
    var f = p.querySelector('#' + focusedId) || p.querySelector('#pp');
    focusEl(f);
  }

  /* ---------- Connexion ---------- */
  function viewLogin() {
    root.innerHTML = '<div class="center" style="width:100%">' +
      '<div class="logo" style="margin:0;width:72px;height:72px;border-radius:18px">' + SVG_NOTE + '</div>' +
      '<h1>Musique TV</h1><p class="sub">Connecte-toi avec ton compte Apple pour retrouver tes playlists.</p>' +
      '<div class="btns" style="justify-content:center"><div class="btn pri" data-f tabindex="0" id="login">Se connecter avec Apple</div></div></div>';
    root.querySelector('#login').onclick = function () {
      Promise.resolve(music.authorize()).then(function () {
        saveToken();
        tab = 'home'; stack = []; render();
      }).catch(function () { toast('Connexion annulée.'); });
    };
    focusEl(root.querySelector('#login'));
  }

  /* ---------- Démarrage ---------- */
  function boot() {
    root.innerHTML = '<div class="center" style="width:100%"><p class="sub">Connexion au service Apple Music…</p></div>';
    bridgeReady();
    var tries = 0;
    (function wait() {
      var inst = null;
      try { inst = window.MusicKit && MusicKit.getInstance && MusicKit.getInstance(); } catch (e) {}
      if (inst && inst.api) return start(inst);
      if (++tries > 60) {
        root.innerHTML = '<div class="center" style="width:100%"><h1>Oups</h1><p class="sub">Le lecteur Apple Music n\'a pas pu être chargé. Apple a peut-être modifié son site.</p>' +
          '<div class="btns" style="justify-content:center"><div class="btn pri" data-f tabindex="0" id="retry">Réessayer</div></div></div>';
        root.querySelector('#retry').onclick = function () { location.reload(); };
        focusEl(root.querySelector('#retry'));
        return;
      }
      setTimeout(wait, 500);
    })();
  }

  function start(inst) {
    music = inst;
    try { sf = music.storefrontId || sf; } catch (e) {}
    var E = window.MusicKit && MusicKit.Events ? MusicKit.Events : {};
    function on(name, fn) { try { music.addEventListener(E[name] || name, fn); } catch (e) {} }
    on('nowPlayingItemDidChange', function () { updateMini(); if (playerOpen) drawPlayer(); });
    on('playbackStateDidChange', function () { updateMini(); if (playerOpen) drawPlayer(); });
    on('playbackTimeDidChange', updateProgress);
    on('authorizationStatusDidChange', function () {
      if (music.isAuthorized) saveToken();
      else if (!restoring) viewLogin();
    });
    watchSiteDialogs();
    if (music.isAuthorized) { saveToken(); render(); return; }
    restoreToken();
  }

  /* ---------- Garder la connexion ----------
   * Le site Apple oublie la connexion quand l'app se ferme.
   * On garde donc le jeton de connexion dans la mémoire de l'app et on le lui redonne. */
  var TOKEN_KEY = 'tv_music_user_token';
  var restoring = false;
  function saveToken() {
    try {
      var t = music.musicUserToken;
      if (t) localStorage.setItem(TOKEN_KEY, t);
    } catch (e) {}
  }
  function forgetToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function restoreToken() {
    var saved = null;
    try { saved = localStorage.getItem(TOKEN_KEY); } catch (e) {}
    if (!saved) { viewLogin(); return; }
    restoring = true;
    try { music.musicUserToken = saved; } catch (e) {}
    // On vérifie que le jeton est toujours valable avec une petite requête.
    api('/v1/me/storefront').then(function (d) {
      restoring = false;
      var s = Array.isArray(d) && d[0] && d[0].id;
      if (s) sf = s;
      if (music.isAuthorized) { render(); } else { forgetToken(); viewLogin(); }
    }).catch(function () {
      restoring = false;
      forgetToken();
      try { music.musicUserToken = ''; } catch (e) {}
      viewLogin();
    });
  }

  /* ---------- Fenêtres du site Apple ----------
   * Le site caché derrière l'interface ouvre parfois ses propres fenêtres
   * (ex. "Authorization failed"). Elles passent au-dessus de tout : on les ferme. */
  function watchSiteDialogs() {
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    function sweep() {
      var list = document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]');
      Array.prototype.forEach.call(list, function (d) {
        if (root.contains(d)) return;
        var text = (d.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        try { if (d.close) d.close(); } catch (e) {}
        d.style.setProperty('display', 'none', 'important');
        if (seen && seen.has(d)) return;
        if (seen) seen.add(d);
        console.log('[TV] fenêtre du site fermée : ' + text.slice(0, 120));
      });
    }
    sweep();
    try {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        setTimeout(function () { pending = false; sweep(); }, 150);
      }).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['open']
      });
    } catch (e) {}
    setInterval(sweep, 2000);
  }

  boot();
})();
