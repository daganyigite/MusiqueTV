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

  /* ---------- Réglages (gardés dans la mémoire de l'app) ---------- */
  var SETTINGS = [
    { k: 'scale', sec: 'Apparence', label: 'Taille de l\'interface', def: '1',
      opts: [['0.9', 'Petite'], ['1', 'Normale'], ['1.1', 'Grande'], ['1.25', 'Très grande']] },
    { k: 'blur', sec: 'Apparence', label: 'Flou du fond pendant la lecture', def: '60',
      opts: [['25', 'Léger'], ['60', 'Moyen'], ['100', 'Fort'], ['150', 'Très fort']] },
    { k: 'bgdim', sec: 'Apparence', label: 'Luminosité du fond', def: '0.45',
      opts: [['0.25', 'Clair'], ['0.45', 'Normal'], ['0.65', 'Sombre']] },
    { k: 'pagebg', sec: 'Apparence', label: 'Fond coloré des playlists et albums', def: '1',
      opts: [['1', 'Activé'], ['0', 'Désactivé']] },
    { k: 'clock', sec: 'Apparence', label: 'Horloge à l\'écran', def: '1',
      opts: [['1', 'Affichée'], ['0', 'Masquée']] },
    { k: 'anim', sec: 'Apparence', label: 'Animations', def: '1',
      opts: [['1', 'Activées'], ['0', 'Réduites (plus fluide)']] },
    { k: 'autoplayer', sec: 'Lecture', label: 'Lecteur plein écran au lancement d\'un titre', def: '0',
      opts: [['0', 'Non, rester sur la page'], ['1', 'Oui']] },
    { k: 'idle', sec: 'Lecture', label: 'Lecteur plein écran après inactivité', def: '0',
      opts: [['0', 'Jamais'], ['60', 'Après 1 min'], ['180', 'Après 3 min'], ['300', 'Après 5 min']] },
    { k: 'fade', sec: 'Lecture', label: 'Fondu enchaîné (aussi en « répéter ce morceau »)', def: '0',
      opts: [['0', 'Désactivé'], ['3', '3 secondes'], ['6', '6 secondes'], ['10', '10 secondes']] },
    { k: 'stallfix', sec: 'Lecture', label: 'Relancer un titre qui se bloque', def: '1',
      opts: [['1', 'Activé'], ['0', 'Désactivé']] },
    { k: 'hideexplicit', sec: 'Lecture', label: 'Titres explicites dans les listes', def: '0',
      opts: [['0', 'Affichés'], ['1', 'Masqués']] },
    { k: 'toasts', sec: 'Lecture', label: 'Messages à l\'écran', def: '1',
      opts: [['1', 'Affichés'], ['0', 'Seulement les erreurs']] },
    { k: 'lyrauto', sec: 'Paroles', label: 'Afficher les paroles en ouvrant le lecteur', def: '0',
      opts: [['0', 'Non'], ['1', 'Oui']] },
    { k: 'lyrsize', sec: 'Paroles', label: 'Taille des paroles', def: '1',
      opts: [['0.85', 'Petite'], ['1', 'Normale'], ['1.2', 'Grande'], ['1.45', 'Très grande']] },
    { k: 'lyroffset', sec: 'Paroles', label: 'Décalage des paroles', def: '0',
      opts: [['-1', '1 s plus tôt'], ['-0.5', '0,5 s plus tôt'], ['0', 'Aucun'], ['0.5', '0,5 s plus tard'], ['1', '1 s plus tard']] },
    { k: 'video', sec: 'Vidéo', label: 'Lecteur vidéo', def: 'app',
      opts: [['app', 'Celui de l\'app'], ['apple', 'Celui d\'Apple']] }
  ];
  var settingsStore = {};
  try { settingsStore = JSON.parse(localStorage.getItem('tv_settings') || '{}') || {}; } catch (e) {}
  try { if (localStorage.getItem('tv_video_native') === '1' && !settingsStore.video) settingsStore.video = 'apple'; } catch (e) {}
  function setting(k) {
    if (settingsStore[k] != null) return settingsStore[k];
    var d = SETTINGS.filter(function (x) { return x.k === k; })[0];
    return d ? d.def : null;
  }
  function setSetting(k, v) {
    settingsStore[k] = v;
    try { localStorage.setItem('tv_settings', JSON.stringify(settingsStore)); } catch (e) {}
    if (k === 'video') { try { localStorage.setItem('tv_video_native', v === 'apple' ? '1' : '0'); } catch (e) {} }
    applySettings();
  }
  try { accent = localStorage.getItem('tv_accent') || accent; } catch (e) {}

  /* ---------- Styles ---------- */
  var css = [
    '#tvui{position:fixed;inset:0;z-index:2147483647;background:#0E0F13;color:#F2F2F4;',
    'font-family:Manrope,"Segoe UI",Roboto,system-ui,sans-serif;display:flex;overflow:hidden;font-size:16px}',
    '#tvui.tv-hidden{display:none}',
    'html.tv-on body>*:not(#tvui){content-visibility:hidden!important;visibility:hidden!important}',
    'html.tv-on body{overflow:hidden!important}',
    '#tvui *{box-sizing:border-box}',
    '#tvui .rail{width:270px;flex-shrink:0;display:flex;flex-direction:column;background:#141519;border-right:1px solid #1E2028}',
    '#tvui .rscroll{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:34px 14px 16px}',
    '#tvui .rscroll::-webkit-scrollbar{display:none}',
    '#tvui .rfoot{padding:10px 14px 18px;border-top:1px solid #1E2028}',
    '#tvui .logo{display:flex;align-items:center;gap:12px;margin:0 0 20px 10px;font-size:22px;font-weight:800;letter-spacing:-.01em}',
    '#tvui .logo i{width:38px;height:38px;border-radius:10px;background:var(--acc);display:flex;align-items:center;justify-content:center}',
    '#tvui .tab{min-height:44px;border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:12px;color:#C9CBD3;font-weight:500;font-size:16px;outline:none;flex-shrink:0}',
    '#tvui .tab svg{color:var(--acc);flex-shrink:0}',
    '#tvui .tab span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '#tvui .tab.on{background:#26272E;color:#F2F2F4;font-weight:700}',
    '#tvui .tab:focus{background:#F2F2F4;color:#0E0F13}',
    '#tvui .tab:focus svg{color:#0E0F13}',
    '#tvui .tab.it{min-height:46px;padding-left:12px}',
    '#tvui .tab.sub{padding-left:20px}',
    '#tvui .th{width:30px;height:30px;border-radius:6px;flex-shrink:0;background:#2A2C36 center/cover no-repeat}',
    '#tvui .rsec{font-size:12px;font-weight:700;color:#7E808A;margin:18px 12px 6px;flex-shrink:0}',
    '#tvui .rgrp{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:#C9CBD3;margin:4px 12px 4px;flex-shrink:0}',
    '#tvui .rgrp svg{color:var(--acc)}',
    '#tvui .grid{display:flex;flex-wrap:wrap;gap:28px 24px;padding:18px 18px;margin:-8px -18px 0}',
    '#tvui .clock{position:fixed;top:22px;right:34px;z-index:4;font-size:20px;font-weight:700;color:#E6E7EC;text-shadow:0 2px 8px rgba(0,0,0,.6);pointer-events:none}',
    '#tvui.noclock .clock{display:none}',
    '#tvui.noanim *{transition:none!important;animation-duration:0s!important}',
    '#tvui.noanim .vspin{animation:tvspin 1s linear infinite!important}',
    '#tvui .rail{position:relative;z-index:2}',
    '#tvui .main{position:relative;z-index:1}',
    '#tvui .pagebgw{position:fixed;top:0;right:0;bottom:0;left:270px;overflow:hidden;z-index:0;pointer-events:none}',
    '#tvui .pagebg{position:absolute;inset:-12%;background:#0E0F13 center/cover no-repeat;filter:blur(var(--blur,60px)) saturate(1.5);transform:scale(1.1);opacity:0;transition:opacity .6s}',
    '#tvui .pagebg.on{opacity:.75}',
    '#tvui .pageshade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,15,19,calc(var(--dim,.45) - .1)) 0%,rgba(14,15,19,calc(var(--dim,.45) + .25)) 60%,rgba(14,15,19,.95) 100%)}',
    '#tvui .vstage{position:fixed;inset:0;z-index:20;background:#000}',
    '#tvui .vbox{position:absolute;inset:0}',
    '#tvui .vposter{position:absolute;inset:0;background:#000 center/cover no-repeat;opacity:.35;filter:blur(2px)}',
    '#tvui .vspin{width:44px;height:44px;border-radius:50%;border:4px solid rgba(255,255,255,.2);border-top-color:var(--acc);animation:tvspin 1s linear infinite}',
    '@keyframes tvspin{to{transform:rotate(360deg)}}',
    '#tvui .vctl{position:absolute;left:0;right:0;bottom:0;padding:80px 6vw 36px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s}',
    '#tvui .vstage.show .vctl{opacity:1}',
    '#tvui .vt{font-size:clamp(22px,3vw,34px);font-weight:800}',
    '#tvui .va{font-size:16px;color:#C9CBD3;margin:4px 0 16px}',
    '#tvui .vbar{margin:0;height:5px;background:rgba(255,255,255,.25)}',
    '#tvui .vstage .times{color:#C9CBD3;margin-bottom:14px}',
    '#tvui .vstage .cb{background:rgba(255,255,255,.16);font-size:20px}',
    '#tvui .vstage .cb.pp{background:#F2F2F4}',
    '#tvui .main [data-f]{scroll-margin:40px 30px 140px}',
    '#tvui .main::after{content:"";display:block;height:45vh}',
    '#tvui .main{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 26px);mask-image:linear-gradient(to bottom,transparent 0,#000 26px)}',
    '#tvui .rscroll{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)}',
    '#tvui .rail [data-f]{scroll-margin:28px 0 28px}',
    '#tvui .qrow{scroll-margin:16px 0}',
    '#tvui .dleft{position:sticky;top:0;align-self:flex-start;padding-bottom:120px}',
    '#tvui .dleft h1{font-size:clamp(24px,3vw,36px)}',
    '#tvui .detail{padding-top:4px}',
    '#tvui .main{flex:1;min-width:0;overflow-y:auto;padding:44px 56px 130px}',
    '#tvui .main::-webkit-scrollbar,#tvui .row::-webkit-scrollbar{display:none}',
    '#tvui h1{margin:0 0 6px;font-size:36px;font-weight:800;letter-spacing:-.02em}',
    '#tvui h2{margin:34px 0 16px;font-size:21px;font-weight:700}',
    '#tvui .sub{color:#9A9CA6;font-size:15px;margin:0}',
    '#tvui .row{display:flex;gap:24px;overflow-x:auto;padding:18px 18px 18px;margin:-8px -18px 0}',
    '#tvui .card{width:180px;flex-shrink:0;outline:none;display:flex;flex-direction:column;gap:10px;transition:transform .1s;will-change:transform}',
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
    '#tvui .detail{display:flex;gap:4vw}',
    '#tvui .dleft{width:min(360px,32vw);flex-shrink:0}',
    '#tvui .dleft .btns{flex-wrap:nowrap;gap:10px;margin-top:18px}',
    '#tvui .dleft .btn{height:46px;padding:0 16px;font-size:15px}',
    '#tvui .dleft .art{width:min(320px,26vw,38vh);height:min(320px,26vw,38vh);font-size:96px;border-radius:20px;margin-bottom:22px}',
    '#tvui .tracks{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
    '#tvui .trk{display:flex;align-items:center;gap:18px;padding:10px 16px;border-radius:12px;outline:none}',
    '#tvui .trk:focus{background:#1E2028;outline:2px solid #F2F2F4}',
    '#tvui .trk .n{width:28px;text-align:right;color:#9A9CA6;font-size:15px}',
    '#tvui .trk .art{width:46px;height:46px;border-radius:8px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .trk .tx{flex:1;min-width:0}',
    '#tvui .trk .tt{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .trk .ta{font-size:13px;color:#9A9CA6}',
    '#tvui .trk .du{font-size:14px;color:#9A9CA6}',
    '#tvui .trk.blocked{opacity:.45}',
    '#tvui .ex{display:inline-block;margin-left:8px;padding:0 5px;border-radius:4px;background:#2A2C36;color:#C9CBD3;font-size:11px;font-weight:800;line-height:17px;vertical-align:2px}',
    '#tvui .notice{background:#1E2028;border-radius:12px;padding:14px 18px;margin-bottom:10px;color:#C9CBD3;font-size:14px;line-height:1.5}',
    '#tvui .mini{position:fixed;left:270px;right:0;bottom:22px;display:flex;justify-content:center;pointer-events:none;z-index:3}',
    '#tvui .pill{pointer-events:auto;width:100%;max-width:min(1000px,calc(100% - 48px));height:78px;display:flex;align-items:center;gap:4px;padding:0 14px;border-radius:39px;background:rgba(38,39,46,.94);border:1px solid rgba(255,255,255,.09);box-shadow:0 14px 40px rgba(0,0,0,.55)}',
    '#tvui .mb{width:50px;height:50px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#F2F2F4;outline:none}',
    '#tvui .mb.sm{color:#B9BBC4}',
    '#tvui .mb.sm.act{color:var(--acc)}',
    '#tvui .mb{position:relative}',
    '#tvui .r1{position:absolute;right:9px;bottom:9px;min-width:14px;height:14px;border-radius:7px;background:var(--acc);color:#0E0F13;font-size:10px;font-weight:800;line-height:14px;text-align:center}',
    '#tvui .mb:focus .r1{background:#0E0F13;color:#F2F2F4}',
    '#tvui .mb:focus{background:#F2F2F4;color:#0E0F13}',
    '#tvui .mnow{flex:1;min-width:0;display:flex;align-items:center;gap:14px;padding:8px 14px 12px;margin:0 10px;border-radius:14px;position:relative;outline:none}',
    '#tvui .mnow:focus{background:rgba(255,255,255,.13);box-shadow:inset 0 0 0 2px #F2F2F4}',
    '#tvui .mnow .art{width:48px;height:48px;border-radius:7px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .mtx{min-width:0;flex:1}',
    '#tvui .mt{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .ma{font-size:13px;color:#A6A8B2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
    '#tvui .mnow .bar{position:absolute;left:76px;right:14px;bottom:5px;height:3px;margin:0;background:rgba(255,255,255,.18)}',
    '#tvui .msep{width:1px;height:34px;background:rgba(255,255,255,.12);flex-shrink:0}',
    '#tvui .qpanel{position:fixed;top:0;right:0;bottom:0;width:min(460px,42vw);z-index:8;display:flex;flex-direction:column;padding:34px 18px 24px;background:rgba(24,25,31,.98);border-left:1px solid rgba(255,255,255,.08);box-shadow:-24px 0 60px rgba(0,0,0,.55)}',
    '#tvui .qhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 12px 16px}',
    '#tvui .qhead h2{margin:0;font-size:24px}',
    '#tvui .qlab{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8E909A;margin:14px 12px 6px}',
    '#tvui .qlist{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:2px}',
    '#tvui .qlist::-webkit-scrollbar{display:none}',
    '#tvui .qrow{display:flex;align-items:center;gap:14px;padding:8px 12px;border-radius:10px;outline:none}',
    '#tvui .qrow.cur{background:rgba(255,255,255,.07)}',
    '#tvui .qrow.cur .tt{color:var(--acc)}',
    '#tvui .qrow:focus{background:#F2F2F4;color:#0E0F13}',
    '#tvui .qrow:focus .ta,#tvui .qrow:focus .du{color:#4A4C55}',
    '#tvui .qrow:focus.cur .tt{color:#0E0F13}',
    '#tvui .qrow .art{width:48px;height:48px;border-radius:6px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .qrow .tx{flex:1;min-width:0}',
    '#tvui .qrow .tt{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .qrow .ta{font-size:13px;color:#9A9CA6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tvui .qrow .du{font-size:13px;color:#9A9CA6}',
    '#tvui .bar{flex:1;height:5px;border-radius:3px;background:#2A2C36;margin:0 24px;overflow:hidden}',
    '#tvui .bar i{display:block;height:100%;background:var(--acc);width:0}',
    '#tvui .player{position:fixed;inset:0;background:#0E0F13;display:flex;gap:5vw;padding:7vh 6vw;z-index:5;overflow:hidden}',
    '#tvui .player>.pmain,#tvui .player>.queue{position:relative;z-index:1}',
    '#tvui .pbg{position:absolute;inset:-15%;background:#0E0F13 center/cover no-repeat;filter:blur(var(--blur,60px)) saturate(1.6);transform:scale(1.1);opacity:0;transition:opacity .5s}',
    '#tvui .pbg.on{opacity:1}',
    '#tvui .pshade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,11,14,var(--dim,.45)) 0%,rgba(10,11,14,calc(var(--dim,.45) + .15)) 55%,rgba(10,11,14,calc(var(--dim,.45) + .3)) 100%)}',
    '#tvui .player .big{box-shadow:0 30px 80px rgba(0,0,0,.55)}',
    '#tvui .player .partist,#tvui .player .times,#tvui .player .cb.sm{color:#D5D7DE}',
    '#tvui .player .queue{border-left-color:rgba(255,255,255,.14)}',
    '#tvui .player .cb{background:rgba(255,255,255,.14)}',
    '#tvui .player .cb.sm{background:transparent}',
    '#tvui .player .cb.pp{background:#F2F2F4}',
    '#tvui .player .bar{background:rgba(255,255,255,.22)}',
    '#tvui .seek{padding:12px 0;margin:-12px 0 0;border-radius:10px;outline:none}',
    '#tvui .lyrics{position:relative;z-index:1;flex:1.25;min-width:0;overflow:hidden;-webkit-mask-image:linear-gradient(transparent 0,#000 18%,#000 72%,transparent 100%);mask-image:linear-gradient(transparent 0,#000 18%,#000 72%,transparent 100%)}',
    '#tvui .lyrin{transition:transform .45s ease;padding:30vh 0 50vh}',
    '#tvui .ly{margin:0 0 .55em;font-size:calc(clamp(22px,2.7vw,36px) * var(--lyr,1));font-weight:800;line-height:1.25;color:rgba(255,255,255,.32);transition:color .3s,transform .3s;transform-origin:left center}',
    '#tvui .ly.past{color:rgba(255,255,255,.5)}',
    '#tvui .ly.cur{color:#fff;transform:scale(1.04)}',
    '#tvui .ly.plain{color:rgba(255,255,255,.85);font-size:calc(clamp(18px,2vw,26px) * var(--lyr,1));margin:0 0 .3em}',
    '#tvui .lyrmsg{color:rgba(255,255,255,.65);font-size:18px;margin:0 0 18px}',
    '#tvui .player.lyr .queue{display:none}',
    '#tvui .player.lyr .pmain{flex:0 0 auto;max-width:44%;flex-direction:column;align-items:flex-start;gap:22px}',
    '#tvui .player.lyr .big{width:min(30vh,18vw);height:min(30vh,18vw)}',
    '#tvui .player.lyr .pinfo{width:100%}',
    '#tvui .player.lyr .ptitle{font-size:clamp(22px,2.6vw,34px)}',
    '#tvui .player.lyr .ctrls{gap:8px;flex-wrap:nowrap}',
    '#tvui .player.lyr .cb{width:50px;height:50px}',
    '#tvui .player.lyr .cb.sm{width:42px;height:42px}',
    '#tvui .player.lyr .cb.pp{width:66px;height:66px}',
    '#tvui .player.lyr .lyrics{padding-left:2vw}',
    '#tvui .seek .bar{position:relative;margin:0;height:6px;overflow:visible;transition:height .15s}',
    '#tvui .seek .bar i{border-radius:3px}',
    '#tvui .knob{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#F2F2F4;box-shadow:0 2px 8px rgba(0,0,0,.5);opacity:0;transition:opacity .15s}',
    '#tvui .seek:focus .bar{height:10px}',
    '#tvui .seek:focus .knob{opacity:1}',
    '#tvui .seekhint{opacity:0;transition:opacity .2s;font-size:13px}',
    '#tvui .player:has(.seek:focus) .seekhint{opacity:.8}',
    '#tvui .pmain{flex:1;min-width:0;display:flex;gap:4vw;align-items:center}',
    '#tvui .player .big{width:min(58vh,34vw);height:min(58vh,34vw);flex-shrink:0;border-radius:24px;padding:0;font-size:0}',
    '#tvui .pinfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:30px}',
    '#tvui .kick{font-size:14px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase;margin:0}',
    '#tvui .ptitle{font-size:clamp(26px,4vw,44px);font-weight:800;letter-spacing:-.02em;line-height:1.1;margin:8px 0}',
    '#tvui .partist{font-size:20px;color:#9A9CA6;margin:0}',
    '#tvui .times{display:flex;justify-content:space-between;font-size:14px;color:#9A9CA6;margin-top:10px}',
    '#tvui .ctrls{display:flex;align-items:center;gap:22px}',
    '#tvui .cb{position:relative;flex-shrink:0;width:60px;height:60px;border-radius:50%;background:#1E2028;color:#F2F2F4;display:flex;align-items:center;justify-content:center;outline:none}',
    '#tvui .cb.sm{width:52px;height:52px;background:transparent;color:#9A9CA6}',
    '#tvui .cb.sm.act{color:var(--acc)}',
    '#tvui .cb.pp{width:84px;height:84px;background:#F2F2F4;color:#0E0F13}',
    '#tvui .cb:focus{outline:4px solid var(--acc);outline-offset:5px}',
    '#tvui .queue{width:22vw;flex-shrink:0;border-left:1px solid #1E2028;padding-left:32px;display:flex;flex-direction:column;gap:14px;overflow:hidden}',
    '#tvui .qi{display:flex;align-items:center;gap:12px}',
    '#tvui .qi .art{width:44px;height:44px;border-radius:8px;padding:0;font-size:0;flex-shrink:0}',
    '#tvui .center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}',
    '#tvui input.search{width:100%;max-width:720px;height:60px;border-radius:30px;border:0;background:#1E2028;color:#F2F2F4;font:inherit;font-size:20px;padding:0 28px;outline:none}',
    '#tvui input.search:focus{outline:3px solid var(--acc)}',
    '#tvui .msg{color:#9A9CA6;font-size:16px;padding:20px 0}',
    '#tvui .swatch{width:52px;height:52px;border-radius:50%;outline:none}',
    '#tvui .setlist{display:flex;flex-direction:column;gap:6px;max-width:820px}',
    '#tvui .setrow{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:6px 6px 6px 18px;border-radius:14px;background:rgba(255,255,255,.04)}',
    '#tvui .setl{font-size:16px;color:#E6E7EC}',
    '#tvui .setv{height:46px;min-width:220px;justify-content:space-between;font-size:15px}',
    '#tvui .setarr{font-size:22px;opacity:.6;margin-left:14px}',
    '#tvui .swatch:focus{outline:4px solid #F2F2F4;outline-offset:4px}',
    '@media (max-width:1100px){#tvui .rail{width:230px}#tvui .mini{left:230px}#tvui .pagebgw{left:230px}#tvui .queue{display:none}#tvui .mb{width:44px;height:44px}#tvui .pill{padding:0 10px}#tvui .mnow{margin:0 6px}#tvui .qpanel{width:60vw}#tvui .ctrls{gap:14px}#tvui .cb.pp{width:72px;height:72px}#tvui .main{padding:36px 36px 120px}}'
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
    repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
    list: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
    news: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    pin: 'M12 17v5M8 3h8l-1 6 3 4H6l3-4z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
    album: 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1',
    note: 'M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    person: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    lyrics: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5'
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
  function applySettings() {
    root.style.zoom = setting('scale');
    root.style.setProperty('--blur', setting('blur') + 'px');
    root.style.setProperty('--dim', setting('bgdim'));
    root.style.setProperty('--lyr', setting('lyrsize'));
    root.classList.toggle('noanim', setting('anim') === '0');
    root.classList.toggle('noclock', setting('clock') === '0');
  }
  applySettings();
  // Horloge
  setInterval(function () {
    var c = root.querySelector('.clock');
    if (c) { var d = new Date(); c.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  }, 10000);
  document.documentElement.classList.add('tv-on');
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
  function topLayer() { return root.querySelector('.vstage') || root.querySelector('.qpanel') || root.querySelector('.player') || root; }
  function focusables() {
    var scope = topLayer();
    return Array.prototype.filter.call(scope.querySelectorAll('[data-f]'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  function focusEl(el) {
    if (!el) return;
    var layer = topLayer();
    if (layer !== root && !layer.contains(el)) return; // le panneau ou le lecteur garde le focus
    el.focus({ preventScroll: true });
    if (!smartScroll(el)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    lastFocus = el;
  }
  /* Défilement « par rangée », comme sur Apple TV : la rangée choisie (avec son titre)
   * vient se caler en haut, au lieu de laisser une rangée à moitié coupée. */
  function smartScroll(el) {
    var main = el.closest('.main');
    var rail = el.closest('.rscroll');
    if (rail) {
      var rr = rail.getBoundingClientRect(), er = el.getBoundingClientRect();
      var pad = 24;
      if (er.top < rr.top + pad) rail.scrollTop -= (rr.top + pad - er.top);
      else if (er.bottom > rr.bottom - pad) rail.scrollTop += (er.bottom - (rr.bottom - pad));
      return true;
    }
    if (!main) return false;
    var row = el.closest('.row');
    var grid = el.closest('.grid');
    if (!row && !grid) return false;
    var mr = main.getBoundingClientRect();
    var target;
    if (row) {
      // horizontal : on garde la carte entière visible dans sa rangée
      var rb = row.getBoundingClientRect(), cb = el.getBoundingClientRect();
      if (cb.left < rb.left + 20) row.scrollLeft -= (rb.left + 20 - cb.left);
      else if (cb.right > rb.right - 20) row.scrollLeft += (cb.right - (rb.right - 20));
      var head = row.previousElementSibling && row.previousElementSibling.tagName === 'H2' ? row.previousElementSibling : row;
      var firstRow = main.querySelector('.row');
      target = row === firstRow ? 0 : head.getBoundingClientRect().top - mr.top + main.scrollTop - 28;
    } else {
      var cards = grid.querySelectorAll('[data-f]');
      var firstTop = cards[0] ? cards[0].getBoundingClientRect().top : 0;
      var ct = el.getBoundingClientRect().top;
      target = Math.abs(ct - firstTop) < 4 ? 0 : ct - mr.top + main.scrollTop - 36;
    }
    main.scrollTop = Math.max(0, target);
    return true;
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
    // En revenant dans le menu de gauche, on retombe sur la rubrique active.
    if (dir === 'left' && best && best.closest('.rail') && !cur.closest('.rail')) {
      var on = root.querySelector('.rail .tab.on');
      if (on) best = on;
    }
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
    if (root.classList.contains('tv-hidden')) return;
    var k = e.key;
    if (videoMode) pokeVideoControls();
    var inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
    var dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    var ae = document.activeElement;
    if (ae && ae.hasAttribute && ae.hasAttribute('data-seek') && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      e.preventDefault(); e.stopPropagation();
      seekStep(k === 'ArrowRight' ? 1 : -1, e.repeat);
      return;
    }
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

  /* ---------- Titres qui se bloquent ----------
   * Certains titres s'arrêtent tout seuls après quelques secondes (souci de flux côté Apple).
   * On surveille : si la lecture se fige sans que tu aies appuyé sur pause, on relance au même endroit. */
  var lastUserAction = 0;
  var playErrors = [];
  var stall = { id: null, t: 0, since: 0, tries: 0 };
  function userAction() { lastUserAction = Date.now(); idleSince = Date.now(); }
  var lastSkip = 0;
  function userSkip() { lastSkip = Date.now(); userAction(); }
  function logPlayError(msg) {
    var it = nowItem(), a = itemAttrs(it);
    var d = new Date();
    playErrors.push(('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' · ' + (a.name || '?') + ' · ' + msg);
    if (playErrors.length > 20) playErrors.shift();
  }
  function recoverStall(t, why) {
    stall.tries++;
    logPlayError('bloqué à ' + fmt(t) + ' (' + why + '), relance ' + stall.tries);
    toast('Le titre s\'est bloqué, je le relance…');
    var pos = 0;
    try { pos = music.queue.position; } catch (e) {}
    Promise.resolve(music.changeToMediaAtIndex ? music.changeToMediaAtIndex(pos) : null)
      .then(function () { return t > 1 ? music.seekToTime(t) : null; })
      .then(function () { return music.play(); })
      .catch(function () {
        logPlayError('relance impossible, titre suivant');
        try { music.skipToNextItem(); } catch (e) {}
      });
  }
  setInterval(function () {
    if (!music || videoMode || setting('stallfix') !== '1') return;
    var it = nowItem();
    if (!it) return;
    var t = music.currentPlaybackTime || 0;
    var d = music.currentPlaybackDuration || 0;
    var st = music.playbackState;
    if (it.id !== stall.id) { stall = { id: it.id, t: t, since: Date.now(), tries: 0 }; return; }
    var nearEnd = d && t > d - 3;
    var userPaused = Date.now() - lastUserAction < 3000;
    // Cas 1 : il « joue » mais le temps n'avance plus. Cas 2 : il s'est mis en pause tout seul.
    var frozen = (music.isPlaying || st === 8 || st === 9) && Math.abs(t - stall.t) < 0.05;
    var selfPaused = st === 3 && !userPaused && t > 0.5 && !nearEnd && stall.wasPlaying;
    if ((frozen && Date.now() - stall.since > 4000) || selfPaused) {
      if (stall.tries < 3) { stall.since = Date.now(); recoverStall(t, frozen ? 'figé' : 'arrêt tout seul'); }
      stall.wasPlaying = false;
      return;
    }
    if (Math.abs(t - stall.t) >= 0.05) { stall.t = t; stall.since = Date.now(); }
    stall.wasPlaying = music.isPlaying;
  }, 1000);

  /* ---------- Fondu enchaîné ----------
   * Le lecteur Apple ne lit qu'un titre à la fois : on baisse doucement le son à la fin
   * d'un titre et on le remonte doucement au début du suivant. */
  var fadeBase = 1, fadeIn = 0, fading = false, fadeLastT = 0;
  function onTrackChange() {
    var f = +setting('fade');
    if (!f || videoMode || !music) return;
    fadeIn = Date.now();
    try { music.volume = 0.05 * fadeBase; } catch (e) {}
  }
  setInterval(function () {
    if (!music) return;
    var f = +setting('fade');
    if (!f || videoMode) {
      if (fading || fadeIn) { fading = false; fadeIn = 0; try { music.volume = fadeBase; } catch (e) {} }
      return;
    }
    if (!fading && !fadeIn) { try { if (music.volume > 0.2) fadeBase = music.volume; } catch (e) {} }
    var t = music.currentPlaybackTime || 0, d = music.currentPlaybackDuration || 0;
    // Reboucle (répéter ce morceau) : le titre repart de 0 -> fondu d'entrée aussi.
    if (fadeLastT > 0 && d && fadeLastT > d - f - 1 && t < 1.5 && !fadeIn) fadeIn = Date.now();
    fadeLastT = t;
    var vol = null;
    if (fadeIn) {
      var inDur = Math.max(1.5, f / 2) * 1000;
      var pr = (Date.now() - fadeIn) / inDur;
      if (pr >= 1) { fadeIn = 0; vol = fadeBase; } else vol = Math.max(0.05, pr) * fadeBase;
    }
    if (music.isPlaying && d > f * 3 && d - t <= f && pendingSeek == null) {
      fading = true;
      var out = Math.max(0.05, (d - t) / f) * fadeBase;
      vol = vol == null ? out : Math.min(vol, out);
    } else if (fading && d - t > f) {
      fading = false;
      if (vol == null) vol = fadeBase;
    }
    if (vol != null) { try { music.volume = vol; } catch (e) {} }
  }, 200);

  /* ---------- Répéter ce morceau ----------
   * Le lecteur Apple, en « répéter ce morceau », joue une fraction de seconde du titre
   * suivant avant de revenir. On ramène donc nous-mêmes le titre au début juste avant la fin. */
  var loopGuard = 0, audioEl = null;
  // Le lecteur Apple donne la position en secondes entières : on lit la position précise
  // directement sur l'élément audio qui joue.
  function preciseTime() {
    if (!audioEl || audioEl.paused || !audioEl.isConnected) {
      audioEl = null;
      var list = document.querySelectorAll('audio');
      for (var i = 0; i < list.length; i++) if (!list[i].paused) { audioEl = list[i]; break; }
    }
    var mt = music.currentPlaybackTime || 0;
    if (audioEl && Math.abs(audioEl.currentTime - mt) < 2) return audioEl.currentTime;
    return mt;
  }
  function repeatOneTick() {
    if (!music || videoMode) return;
    var rp = 0; try { rp = music.repeatMode; } catch (e) {}
    if (rp !== 1 || !music.isPlaying || pendingSeek != null) return;
    var t = preciseTime(), d = music.currentPlaybackDuration || 0;
    if (d > 5 && t >= d - 1.6 && Date.now() - loopGuard > 2500) {
      loopGuard = Date.now();
      // 0,05 s et pas 0 : un retour à 0 pile fait recharger le titre au lecteur Apple (coupure).
      Promise.resolve(music.seekToTime(0.05)).then(function () { if (!music.isPlaying) music.play(); }).catch(function () {});
    }
  }
  setInterval(repeatOneTick, 100);

  /* ---------- Lecteur plein écran après inactivité ---------- */
  var idleSince = Date.now();
  window.addEventListener('keydown', function () { idleSince = Date.now(); }, true);
  setInterval(function () {
    var secs = +setting('idle');
    if (!secs || !music || videoMode || playerOpen || queueOpen || signingIn) return;
    if (music.isPlaying && Date.now() - idleSince > secs * 1000) openPlayer();
  }, 5000);

  /* Retour (appelé par l'app Android). Renvoie true si géré. */
  window.__tvBack = function () {
    if (signingIn) { viewLogin(); return true; }
    if (videoMode) { exitVideo(); return true; }
    if (queueOpen) { closeQueue(); return true; }
    if (playerOpen) { closePlayer(); return true; }
    if (stack.length > (tab === 'item' ? 1 : 0)) { stack.pop(); render(); return true; }
    if (tab !== 'home') { tab = 'home'; navKey = 'home'; stack = []; render(); return true; }
    return false;
  };
  window.__tvMedia = function (a) {
    if (!music) return;
    userAction();
    try {
      if (a === 'toggle') music.isPlaying ? music.pause() : music.play();
      if (a === 'play') music.play();
      if (a === 'pause') music.pause();
      if (a === 'next') { userSkip(); music.skipToNextItem(); }
      if (a === 'previous') { userSkip(); music.skipToPreviousItem(); }
    } catch (e) {}
  };

  /* ---------- API Apple Music ---------- */
  /* Les réponses sont gardées 5 minutes : revenir sur un onglet est instantané. */
  var apiCache = {};
  var API_TTL = 5 * 60 * 1000;
  function api(path, params, fresh) {
    var url = path.replace('{sf}', sf);
    var key = url + '?' + JSON.stringify(params || {});
    var hit = apiCache[key];
    if (!fresh && hit && Date.now() - hit.t < API_TTL) return hit.p;
    var p = music.api.music(url, params || {}).then(function (r) {
      // r.data = la réponse JSON d'Apple ; sa clé "data" contient la liste quand il y en a une.
      var body = r && r.data ? r.data : (r || {});
      return Array.isArray(body.data) ? body.data : body;
    });
    apiCache[key] = { t: Date.now(), p: p };
    p.catch(function () { delete apiCache[key]; });
    return p;
  }
  function clearApiCache() { apiCache = {}; }

  /* ---------- Rendu ---------- */

  /* ----- Panneau de gauche (comme Apple Music) ----- */
  var NAV_TOP = [
    ['search', 'Rechercher', 'search'], ['home', 'Accueil', 'home'],
    ['explore', 'Nouveautés', 'news'], ['radio', 'Radio', 'radio']
  ];
  var NAV_LIB = [
    ['recent', 'Ajouts récents', 'clock'], ['artists', 'Artistes', 'mic'],
    ['albums', 'Albums', 'album'], ['songs', 'Morceaux', 'note'],
    ['video', 'Clips vidéo', 'video'], ['mix', 'Vos mix sur mesure', 'person']
  ];
  var side = { pins: [], playlists: [], loaded: false };
  var navKey = 'home';
  /* Chargé au démarrage. Sur la télé, la session Apple peut mettre quelques secondes à être
   * prête : si la liste revient vide ou en erreur, on réessaie (sans garder le résultat vide en cache). */
  var sideTries = 0, sideTimer = null;
  function loadPlaylistsAll() {
    return api('/v1/me/library/playlists', { limit: 100 }, true)
      .catch(function () { return api('/v1/me/library/playlists', { limit: 25 }, true); })
      .catch(function () { return []; });
  }
  function loadSidebar() {
    clearTimeout(sideTimer);
    return Promise.all([
      api('/v1/me/library/pins', {}, true).catch(function () { return []; }),
      loadPlaylistsAll()
    ]).then(function (r) {
      var pins = Array.isArray(r[0]) ? r[0] : [];
      var pls = Array.isArray(r[1]) ? r[1] : [];
      if (pins.length || !side.pins.length) side.pins = pins;
      if (pls.length || !side.playlists.length) side.playlists = pls;
      side.loaded = true;
      if (!pls.length && sideTries < 6) {
        sideTries++;
        sideTimer = setTimeout(loadSidebar, 2000 * sideTries);
      } else if (pls.length) { sideTries = 0; }
      var rail = root.querySelector('.rail');
      if (rail) { var had = rail.contains(document.activeElement) && document.activeElement.getAttribute('data-nav'); rail.outerHTML = railHtml(); bindRail(); if (had) focusEl(root.querySelector('.rail [data-nav="' + had + '"]')); }
    });
  }
  function navItem(key, label, ic) {
    return '<div class="tab' + (navKey === key ? ' on' : '') + '" data-f tabindex="0" data-nav="' + key + '">' + icon(ic, 20) + '<span>' + esc(label) + '</span></div>';
  }
  function thumbItem(item, cls) {
    var a = item.attributes || {};
    var u = artUrl(a, 80);
    var key = 'item:' + item.id;
    return '<div class="tab it ' + (cls || '') + (navKey === key ? ' on' : '') + '" data-f tabindex="0" data-nav="' + esc(key) + '">' +
      '<i class="th" style="' + (u ? 'background-image:url(\'' + u + '\')' : artStyle(a, 80, a.name)) + '"></i><span>' + esc(a.name) + '</span></div>';
  }
  function railHtml() {
    var h = '<div class="rail"><div class="rscroll"><div class="logo"><i>' + SVG_NOTE + '</i>Musique</div>';
    NAV_TOP.forEach(function (t) { h += navItem(t[0], t[1], t[2]); });
    h += '<div class="rsec">Bibliothèque</div>';
    if (side.pins.length) {
      h += '<div class="rgrp">' + icon('pin', 18) + 'Épingles</div>';
      side.pins.forEach(function (it) { h += thumbItem(it, 'sub'); });
    }
    NAV_LIB.forEach(function (t) { h += navItem(t[0], t[1], t[2]); });
    h += '<div class="rsec">Playlists</div>';
    h += navItem('allpl', 'Toutes les playlists', 'grid');
    side.playlists.forEach(function (it) { h += thumbItem(it); });
    if (!side.loaded) h += '<p class="sub" style="margin:8px 12px">Chargement…</p>';
    h += '</div><div class="rfoot">' + navItem('settings', 'Réglages', 'settings') + '</div></div>';
    return h;
  }
  function findSideItem(id) {
    return side.pins.concat(side.playlists).filter(function (x) { return x.id === id; })[0];
  }
  function bindRail() {
    root.querySelectorAll('.rail [data-nav]').forEach(function (el) {
      el.onclick = function () {
        var k = el.getAttribute('data-nav');
        navKey = k;
        stack = [];
        if (k.indexOf('item:') === 0) {
          var it = findSideItem(k.slice(5));
          if (!it) return;
          if (/songs/.test(it.type)) { playItems([it], 0); return; }
          tab = 'item';
          openItem(it);
          return;
        }
        tab = k;
        render();
      };
    });
  }

  function shell(content, opts) {
    opts = opts || {};
    var bg = opts.bg && setting('pagebg') === '1'
      ? '<div class="pagebgw"><div class="pagebg" style="background-image:url(\'' + opts.bg + '\')"></div><div class="pageshade"></div></div>' : '';
    root.innerHTML = railHtml() + bg + '<div class="main">' + content + '</div>' + miniHtml() + '<div class="clock"></div>';
    var ck = root.querySelector('.clock'); if (ck) { var d0 = new Date(); ck.textContent = ('0' + d0.getHours()).slice(-2) + ':' + ('0' + d0.getMinutes()).slice(-2); }
    if (bg) {
      var pb = root.querySelector('.pagebg'), im = new Image();
      im.onload = function () { pb.classList.add('on'); };
      im.src = opts.bg;
    }
    bindRail();
    bindCommon();
    if (playerOpen) {
      // Un écran s'est rechargé derrière le lecteur : on remet le lecteur au-dessus.
      var p = document.createElement('div');
      p.className = 'player';
      root.appendChild(p);
      drawPlayer();
    }
    if (queueOpen) drawQueue(false);
  }

  function bindCommon() {
    var mini = root.querySelector('.mini');
    if (mini) {
      mini.querySelector('#mnow').onclick = openPlayer;
      mini.querySelector('#mp').onclick = togglePlay;
      mini.querySelector('#mnx').onclick = function () { userSkip(); music.skipToNextItem(); };
      mini.querySelector('#mpr').onclick = prevTrack;
      mini.querySelector('#msh').onclick = function () { setShuffle(!(music.shuffleMode === 1)); updateMini(); };
      mini.querySelector('#mrp').onclick = cycleRepeat;
      mini.querySelector('#mq').onclick = function () { openQueue(this); };
      mini.querySelector('#mly').onclick = function () { openPlayer(true); };
    }
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
    var v = ({ home: viewHome, search: viewSearch, explore: viewExplore, radio: viewRadio, video: viewVideo,
       recent: viewRecent, artists: viewArtists, albums: viewAlbums, songs: viewSongs, mix: viewMix,
       allpl: viewAllPlaylists, settings: viewSettings })[tab];
    (v || viewHome)();
  }

  function settle(focusSel) {
    bindCards();
    var sel = focusSel || '.main [data-f]';
    var el = root.querySelector(sel);
    focusEl(el || root.querySelector('.rail .tab.on'));
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
      prefetch();
      if (!side.playlists.length && r[0].length) { side.playlists = r[0]; var rl = root.querySelector('.rail'); if (rl) { rl.outerHTML = railHtml(); bindRail(); } loadSidebar(); }
    });
  }
  var prefetched = false;
  function prefetch() {
    if (prefetched) return;
    prefetched = true;
    setTimeout(function () {
      api('/v1/me/library/playlists', { limit: 50 }).catch(function () {});
      api('/v1/me/library/albums', { limit: 50 }).catch(function () {});
      api('/v1/me/library/artists', { limit: 50 }).catch(function () {});
      api('/v1/catalog/{sf}/charts', { types: 'playlists,albums,songs', limit: 20 }).catch(function () {});
    }, 1500);
  }

  /* ----- Explorer ----- */
  function viewExplore() {
    loading('Nouveautés');
    api('/v1/catalog/{sf}/charts', { types: 'playlists,albums,songs', limit: 20 }).then(function (d) {
      if (tab !== 'explore' || stack.length) return;
      var res = (d && d.results) || {};
      var html = '<h1>Nouveautés</h1><p class="sub">Les tops du moment</p>';
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
    loading('Clips vidéo');
    Promise.all([
      api('/v1/me/library/music-videos', { limit: 50 }).catch(function () { return []; }),
      api('/v1/catalog/{sf}/charts', { types: 'music-videos', limit: 24 })
    ]).then(function (r) {
      var d = r[1];
      if (tab !== 'video' || stack.length) return;
      var res = (d && d.results) || {};
      var html = '<h1>Clips vidéo</h1>';
      html += rowHtml('Dans ta bibliothèque', r[0], { wide: true });
      (res['music-videos'] || []).forEach(function (c) { html += rowHtml(c.name, c.data, { wide: true }); });
      shell(html);
      settle();
    }).catch(function () { errorView('Impossible de charger les vidéos.'); });
  }

  /* ----- Bibliothèque ----- */
  function gridHtml(items, opts) {
    if (!items || !items.length) return '<p class="msg">Rien ici pour l\'instant.</p>';
    var key = 'g' + Math.random().toString(36).slice(2);
    rowCache[key] = items;
    return '<div class="grid" data-row="' + key + '">' + items.map(function (it) { return cardHtml(it, opts); }).join('') + '</div>';
  }
  function gridView(key, title, path, params, opts, filter) {
    loading(title);
    api(path, params).then(function (items) {
      if (tab !== key || stack.length) return;
      items = Array.isArray(items) ? items : [];
      if (filter) items = items.filter(filter);
      shell('<h1>' + esc(title) + '</h1>' + gridHtml(items, opts));
      settle();
    }).catch(function () { errorView('Impossible de charger ' + title + '.'); });
  }
  function viewRecent() { gridView('recent', 'Ajouts récents', '/v1/me/library/recently-added', { limit: 25 }); }
  function viewArtists() { gridView('artists', 'Artistes', '/v1/me/library/artists', { limit: 100 }, { sub: '' }); }
  function viewAlbums() { gridView('albums', 'Albums', '/v1/me/library/albums', { limit: 100 }); }
  function viewAllPlaylists() { gridView('allpl', 'Toutes les playlists', '/v1/me/library/playlists', { limit: 100 }); }
  function viewMix() {
    loading('Vos mix sur mesure');
    api('/v1/me/recommendations', { limit: 20 }).then(function (recs) {
      if (tab !== 'mix' || stack.length) return;
      var seen = {}, mixes = [];
      (recs || []).forEach(function (rec) {
        var c = rec.relationships && rec.relationships.contents && rec.relationships.contents.data || [];
        c.forEach(function (x) {
          var a = x.attributes || {};
          if (x.type === 'playlists' && (a.playlistType === 'personal-mix' || /mix/i.test(a.name || '')) && !seen[x.id]) { seen[x.id] = 1; mixes.push(x); }
        });
      });
      shell('<h1>Vos mix sur mesure</h1>' + gridHtml(mixes));
      settle();
    }).catch(function () { errorView('Impossible de charger tes mix.'); });
  }
  function viewSongs() {
    loading('Morceaux');
    api('/v1/me/library/songs', { limit: 100 }).then(function (songs) {
      if (tab !== 'songs' && !stack.length) return;
      showTrackList({ attributes: { name: 'Morceaux' }, id: 'songs', type: 'library-songs-all' }, songs);
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
    var secs = {};
    SETTINGS.forEach(function (d) { (secs[d.sec] = secs[d.sec] || []).push(d); });
    function rowHtml2(d) {
      var v = setting(d.k);
      var o = d.opts.filter(function (x) { return x[0] === v; })[0] || d.opts[0];
      return '<div class="setrow"><span class="setl">' + esc(d.label) + '</span>' +
        '<div class="btn setv" data-f tabindex="0" data-set="' + d.k + '">' + esc(o[1]) + '<span class="setarr">›</span></div></div>';
    }
    var html = '<h1>Réglages</h1>' +
      '<h2>Couleur d\'accent</h2><div class="row" style="gap:20px">' +
      ACCENTS.map(function (c) { return '<div class="swatch" data-f tabindex="0" data-c="' + c + '" style="background:' + c + '"></div>'; }).join('') +
      '</div>';
    Object.keys(secs).forEach(function (sec) {
      html += '<h2>' + esc(sec) + '</h2><div class="setlist">' + secs[sec].map(rowHtml2).join('') + '</div>';
    });
    html += '<h2>Compte</h2><div class="btns">' +
      '<div class="btn" data-f tabindex="0" id="reload">Recharger l\'app</div>' +
      '<div class="btn" data-f tabindex="0" id="clearcache">Vider le cache</div>' +
      '<div class="btn" data-f tabindex="0" id="logout">Se déconnecter</div></div>' +
      '<h2>Dépannage</h2><div class="btns"><div class="btn" data-f tabindex="0" id="diag">Tester la lecture</div>' +
      '<div class="btn" data-f tabindex="0" id="resetset">Réglages par défaut</div></div>' +
      (playErrors.length ? '<p class="sub" style="margin-top:14px;line-height:1.6">Derniers incidents de lecture :<br>' + playErrors.slice(-5).map(esc).join('<br>') + '</p>' : '') +
      '<h2>Aide</h2><p class="sub" style="max-width:760px;line-height:1.6">Contenu explicite : ' + (restricted() ? '<b style="color:#F28B6B">bloqué</b>' : 'autorisé') +
      '. Ce réglage dépend de ton compte Apple, pas de l\'app : music.apple.com &gt; ton compte &gt; Réglages &gt; Contrôle parental &gt; Musique et podcasts : Explicite. Ensuite : Recharger l\'app.</p>' +
      '<p class="sub" style="margin-top:20px">Pays du compte : ' + esc(sf.toUpperCase()) + ' · Musique TV</p>';
    shell(html);
    root.querySelectorAll('.swatch').forEach(function (el) {
      el.onclick = function () {
        accent = el.getAttribute('data-c');
        root.style.setProperty('--acc', accent);
        try { localStorage.setItem('tv_accent', accent); } catch (e) {}
      };
    });
    root.querySelectorAll('[data-set]').forEach(function (el) {
      el.onclick = function () {
        var k = el.getAttribute('data-set');
        var d = SETTINGS.filter(function (x) { return x.k === k; })[0];
        var v = setting(k);
        var i = 0;
        for (var j = 0; j < d.opts.length; j++) if (d.opts[j][0] === v) i = j;
        var n = d.opts[(i + 1) % d.opts.length];
        setSetting(k, n[0]);
        el.innerHTML = esc(n[1]) + '<span class="setarr">›</span>';
        if (k === 'scale') { focusEl(el); }
      };
    });
    root.querySelector('#reload').onclick = function () { clearApiCache(); side.loaded = false; try { TVBridge.reloadUi(); } catch (e) { location.reload(); } };
    root.querySelector('#clearcache').onclick = function () { clearApiCache(); side.loaded = false; loadSidebar(); toast('Cache vidé'); };
    root.querySelector('#resetset').onclick = function () {
      settingsStore = {};
      try { localStorage.removeItem('tv_settings'); localStorage.removeItem('tv_video_native'); } catch (e) {}
      applySettings(); viewSettings(); toast('Réglages remis par défaut');
    };
    root.querySelector('#diag').onclick = function () { pushView(viewDiagnostic); };
    root.querySelector('#logout').onclick = function () {
      Promise.resolve(music.unauthorize()).then(function () { viewLogin(); });
    };
    settle();
  }

  /* ----- Diagnostic de lecture (à photographier en cas de souci) ----- */
  function viewDiagnostic() {
    shell('<h1>Test de lecture</h1><p class="sub">Prends cet écran en photo et envoie-la à Claude.</p><div id="dg" style="margin-top:24px;font-size:15px;line-height:1.7;white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace"></div>');
    var box = root.querySelector('#dg');
    function line(t) { box.textContent += t + '\n'; }
    line('Pays : ' + sf + ' | connecté : ' + (music.isAuthorized ? 'oui' : 'non') + ' | MusicKit ' + (window.MusicKit && MusicKit.version || '?'));
    line('Navigateur : ' + navigator.userAgent.slice(0, 120));
    var drm = [
      ['Widevine', 'com.widevine.alpha'],
      ['PlayReady', 'com.microsoft.playready'],
      ['ClearKey', 'org.w3.clearkey']
    ];
    var cfg = [{
      initDataTypes: ['cenc', 'keyids'],
      audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }, { contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }]
    }];
    var chain = Promise.resolve();
    drm.forEach(function (d) {
      chain = chain.then(function () {
        if (!navigator.requestMediaKeySystemAccess) { line('DRM ' + d[0] + ' : API absente'); return; }
        return navigator.requestMediaKeySystemAccess(d[1], cfg)
          .then(function () { line('DRM ' + d[0] + ' : OK'); })
          .catch(function (e) { line('DRM ' + d[0] + ' : NON (' + errText(e) + ')'); });
      });
    });
    chain.then(function () {
      line('Codec AAC : ' + (window.MediaSource && MediaSource.isTypeSupported('audio/mp4; codecs="mp4a.40.2"') ? 'OK' : 'NON'));
      if (lastPlayLog.length) line('Dernier essai de lecture :\n  ' + lastPlayLog.join('\n  '));
      line('Test sur ta première playlist…');
      return api('/v1/me/library/playlists', { limit: 1 });
    }).then(function (pls) {
      var pl = pls && pls[0];
      if (!pl) { line('Aucune playlist trouvée.'); return; }
      line('Playlist : ' + (pl.attributes && pl.attributes.name));
      return api('/v1/me/library/playlists/' + pl.id + '/tracks', { limit: 3 }).then(function (tr) {
        var tries = queueAttempts(tr, 0, pl);
        var j = 0;
        var vol = 1;
        try { vol = music.volume; music.volume = 0; } catch (e) {}
        return new Promise(function (done) {
          (function next() {
            if (j >= tries.length) { try { music.pause(); music.volume = vol; } catch (e) {} done(); return; }
            var a = tries[j++];
            Promise.resolve()
              .then(function () { return music.setQueue(a[1]); })
              .then(function () { return music.play(); })
              .then(function () { return new Promise(function (r) { setTimeout(r, 2500); }); })
              .then(function () { line('  ' + a[0] + ' : ' + (music.isPlaying ? 'OK (ça joue)' : 'lancé mais ne joue pas')); try { music.pause(); } catch (e) {} next(); })
              .catch(function (e) { line('  ' + a[0] + ' : ' + errText(e)); next(); });
          })();
        });
      });
    }).then(function () { line('Fin du test.'); })
      .catch(function (e) { line('Erreur du test : ' + errText(e)); });
  }

  /* ----- Ouvrir un élément ----- */
  function pushView(fn) { stack.push(fn); fn(); }

  function openItem(item) {
    var t = item.type || '';
    if (t === 'songs' || t === 'library-songs') { playItems([item], 0); return; }
    if (t === 'music-videos' || t === 'library-music-videos') { playVideo(item); return; }
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
    if (setting('hideexplicit') === '1') tracks = tracks.filter(function (t) { return t.attributes.contentRating !== 'explicit'; });
    var html = '<div class="detail"><div class="dleft">' +
      '<div class="art" style="' + artStyle(at, 640, at.name) + '">' + (artUrl(at, 10) ? '' : initial(at.name)) + '</div>' +
      '<h1>' + esc(at.name) + '</h1><p class="sub">' + tracks.length + ' titres' + (at.artistName ? ' · ' + esc(at.artistName) : '') + '</p>' +
      '<div class="btns"><div class="btn pri" data-f tabindex="0" id="playAll">' + SVG_PLAY + 'Lecture</div>' +
      '<div class="btn" data-f tabindex="0" id="shuffleAll">' + icon('shuffle', 18) + 'Aléatoire</div></div></div>' +
      '<div class="tracks">' + blockedNotice(tracks) + tracks.map(function (t, i) {
        var a = t.attributes;
        var blocked = isBlocked(t);
        return '<div class="trk" data-f tabindex="0" data-i="' + i + '"><span class="n">' + (i + 1) + '</span>' +
          '<div class="art" style="' + artStyle(a, 100, a.name) + '"></div>' +
          '<div class="tx"><div class="tt">' + esc(a.name) + (a.contentRating === 'explicit' ? '<span class="ex">E</span>' : '') + '</div><div class="ta">' + esc(a.artistName) + (blocked ? ' · version non censurée si elle existe' : '') + '</div></div>' +
          '<span class="du">' + fmtMs(a.durationInMillis) + '</span></div>';
      }).join('') + (tracks.length ? '' : '<p class="msg">Liste vide.</p>') + '</div></div>';
    shell(html, { bg: artUrl(at, 300) || null });
    root.querySelector('#playAll').onclick = function () { setShuffle(false); playItems(tracks, 0, item); };
    root.querySelector('#shuffleAll').onclick = function () {
      setShuffle(true);
      playItems(tracks, Math.floor(Math.random() * Math.max(1, tracks.length)), item);
    };
    root.querySelectorAll('.trk').forEach(function (el) {
      el.onclick = function () {
        var idx = +el.getAttribute('data-i');
        playItems(tracks, idx, item);
      };
    });
    focusEl(root.querySelector('#playAll'));
  }

  /* ---------- Lecture ---------- */
  function setShuffle(on) {
    try { music.shuffleMode = on ? 1 : 0; } catch (e) {}
  }
  /* ----- Contenu explicite -----
   * Si le compte Apple bloque le contenu explicite, le lecteur retire ces titres
   * de la file. On les signale au lieu de laisser une erreur incompréhensible. */
  function restricted() {
    try { return !!(music.restrictedEnabled || music.isRestricted); } catch (e) { return false; }
  }
  function isBlocked(t) {
    return restricted() && t && t.attributes && t.attributes.contentRating === 'explicit';
  }
  function blockedNotice(tracks) {
    var n = tracks.filter(isBlocked).length;
    if (!n) return '';
    return '<div class="notice">' + n + ' titre' + (n > 1 ? 's' : '') + ' sur ' + tracks.length +
      ' sont explicites. Ton compte Apple joue leur version non censurée quand elle existe et saute les autres. ' +
      'Pour tout écouter en version originale, voir Réglages &gt; Aide.</div>';
  }

  /* ----- Lancer la lecture -----
   * Le lecteur Apple ignore la position de départ demandée : on charge la liste,
   * puis on saute nous-mêmes au bon morceau dans la file. */
  var lastPlayLog = [];
  function trackKeys(t) {
    var a = t && t.attributes || {};
    var pp = a.playParams || {};
    return [t && t.id, pp.id, pp.catalogId, pp.reportingId].filter(Boolean).map(String);
  }
  function findInQueue(t) {
    var keys = trackKeys(t);
    var name = t && t.attributes && t.attributes.name;
    var items = [];
    try { items = music.queue.items || []; } catch (e) {}
    for (var i = 0; i < items.length; i++) {
      var qi = items[i];
      var qk = trackKeys(qi).concat([qi.songId, qi.container && qi.container.id].filter(Boolean).map(String));
      for (var k = 0; k < keys.length; k++) if (qk.indexOf(keys[k]) >= 0) return i;
    }
    for (var j = 0; j < items.length; j++) {
      if (name && items[j].attributes && items[j].attributes.name === name) return j;
    }
    return -1;
  }
  function queueAttempts(items, start, container) {
    var list = [];
    var ct = container && container.type || '';
    if (container && container.id && /playlists|albums/.test(ct)) {
      var o1 = {};
      o1[/playlists/.test(ct) ? 'playlist' : 'album'] = container.id;
      list.push(['liste', o1]);
    }
    var playable = items.filter(function (t) { return !isBlocked(t); });
    list.push(['éléments', { items: playable.map(function (t) { return { id: t.id, type: t.type, attributes: t.attributes }; }) }]);
    var one = items[start] || items[0];
    var oneId = (one.attributes && one.attributes.playParams && one.attributes.playParams.catalogId) || one.id;
    list.push(['titre seul', { song: oneId }]);
    return list;
  }
  function errText(e) {
    if (!e) return 'erreur';
    return ((e.errorCode ? e.errorCode + ' ' : '') + (e.message || e.name || String(e))).slice(0, 140);
  }
  function friendlyError(e) {
    var t = errText(e);
    if (/CONTENT_EQUIVALENT|CONTENT_RESTRICTED/i.test(t)) return 'contenu explicite bloqué par ton compte Apple, sans version non censurée (voir Réglages > Aide).';
    if (/NOT_FOUND/i.test(t)) return 'ce titre n\'est pas disponible dans ton pays.';
    return t;
  }
  function playItems(items, start, container) {
    if (!items.length) return;
    userSkip();
    start = start || 0;
    var target = items[start];
    var attempts = queueAttempts(items, start, container);
    lastPlayLog = [];
    var lastErr = null;
    var i = 0;
    (function next() {
      if (i >= attempts.length) {
        toast('Lecture impossible : ' + friendlyError(lastErr));
        return;
      }
      var a = attempts[i++];
      Promise.resolve()
        .then(function () { return music.setQueue(a[1]); })
        .then(function () {
          if (a[0] === 'titre seul' || !target) return;
          var idx = findInQueue(target);
          if (idx > 0 && music.changeToMediaAtIndex) return music.changeToMediaAtIndex(idx);
        })
        .then(function () { return music.play(); })
        .then(function () {
          lastPlayLog.push(a[0] + ' : OK');
          updateMini();
          if (setting('autoplayer') === '1') openPlayer();
        })
        .catch(function (e) {
          lastErr = e;
          lastPlayLog.push(a[0] + ' : ' + errText(e));
          next();
        });
    })();
  }
  function playStation(item) {
    Promise.resolve(music.setQueue({ station: item.id }))
      .then(function () { return music.play(); })
      .then(updateMini)
      .catch(function () { toast('Impossible de lancer cette radio.'); });
  }
  /* ---------- Lecteur vidéo ----------
   * Le lecteur Apple crée sa vidéo dans une fenêtre cachée du site.
   * On récupère cet élément vidéo et on l'affiche dans notre propre écran. */
  var vid = null;      // { el, home, next, stage, hideTimer }
  function findSiteVideo() {
    var found = null;
    (function walk(n) {
      if (found) return;
      var all = n.querySelectorAll('*');
      for (var i = 0; i < all.length && !found; i++) {
        var e = all[i];
        if (e.id === 'apple-music-video-player' && e.tagName === 'VIDEO') { found = e; return; }
        if (e.shadowRoot) walk(e.shadowRoot);
      }
    })(document);
    return found;
  }
  function videoId(item) {
    var pp = item.attributes && item.attributes.playParams || {};
    return pp.catalogId || (/^library-/.test(item.type) ? null : item.id) || item.id;
  }
  function playVideo(item) {
    var id = videoId(item);
    // Notre écran noir couvre tout pendant le chargement. Le site Apple doit rester
    // « affiché » derrière, sinon sa vidéo ne démarre jamais.
    var old = root.querySelector('.vstage'); if (old) old.remove();
    var stage = document.createElement('div');
    stage.className = 'vstage show';
    var ia = item.attributes || {};
    var poster = artUrl(ia, 1280);
    stage.innerHTML = (poster ? '<div class="vposter" style="background-image:url(\'' + poster + '\')"></div>' : '') +
      '<div class="center" style="height:100%;position:relative"><div class="vspin"></div>' +
      '<div class="vt">' + esc(ia.name) + '</div><p class="sub">' + esc(ia.artistName) + ' · chargement…</p></div>';
    root.appendChild(stage);
    videoMode = true;
    document.documentElement.classList.remove('tv-on');
    var native = false;
    native = setting('video') === 'apple';
    Promise.resolve(music.setQueue({ musicVideo: id }))
      .then(function () {
        // On lance la lecture sans attendre et on cherche la vidéo en parallèle (plus rapide).
        Promise.resolve(music.play()).catch(function (e) {
          if (videoMode && !vid) { exitVideo(); toast('Impossible de lire cette vidéo : ' + friendlyError(e)); }
        });
        var tries = 0;
        (function grab() {
          if (!videoMode) return;
          var el = findSiteVideo();
          // On attend que la vidéo tourne vraiment avant de la récupérer :
          // la déplacer trop tôt bloque son démarrage.
          var running = el && !el.paused && el.currentTime > 0.15 && el.videoWidth > 0;
          if (el && native) { showNativeVideo(el); return; }
          if (running) { showVideo(el, item); return; }
          tries++;
          if (tries === 75 && el) { showNativeVideo(el); return; }   // ~15 s : on laisse le lecteur Apple
          if (tries > 150) { exitVideo(); toast('La vidéo ne démarre pas. Réessaie.'); return; }
          setTimeout(grab, 200);
        })();
      })
      .catch(function (e) { exitVideo(); toast('Impossible de lire cette vidéo : ' + friendlyError(e)); });
  }
  /* Secours : si la vidéo ne tourne pas dans notre écran (certaines télés), on affiche
   * directement le lecteur vidéo d'Apple, et on s'en souvient pour les fois suivantes. */
  function showNativeVideo(el) {
    var st = root.querySelector('.vstage'); if (st) st.remove();
    vid = { el: el, native: true };
    root.classList.add('tv-hidden');
    toast('Touche Retour pour revenir à l\'app');
  }
  function videoWatchdog() {
    if (!vid || vid.native) return;
    var el = vid.el;
    var t0 = el.currentTime || 0;
    var m0 = music.currentPlaybackTime || 0;
    setTimeout(function () {
      if (!vid || vid.native || vid.el !== el || !videoMode) return;
      var moved = (el.currentTime || 0) - t0 > 0.3 || (music.currentPlaybackTime || 0) - m0 > 0.3;
      var hasPicture = el.videoWidth > 0;
      if (moved && hasPicture) return;
      if (!music.isPlaying && moved) return;
      // Ne marche pas ici : on rend la vidéo au lecteur d'Apple.
      setSetting('video', 'apple');
      restoreSiteVideo();
      vid.stage && vid.stage.remove();
      vid = { el: el, native: true };
      root.classList.add('tv-hidden');
      try { music.play(); } catch (e) {}
      toast('Touche Retour pour revenir à l\'app');
    }, 7000);
  }
  function restoreSiteVideo() {
    if (!vid || vid.native || !vid.el) return;
    try {
      if (vid.style == null) vid.el.removeAttribute('style'); else vid.el.setAttribute('style', vid.style);
      if (vid.home) vid.home.insertBefore(vid.el, vid.next && vid.next.parentNode === vid.home ? vid.next : null);
    } catch (e) {}
  }
  function showVideo(el, item) {
    var a = item.attributes || {};
    var stage = root.querySelector('.vstage');
    if (!stage || !videoMode) return;
    stage.className = 'vstage';
    stage.innerHTML = '<div class="vbox"></div>' +
      '<div class="vctl"><div class="vinfo"><div class="vt">' + esc(a.name) + '</div><div class="va">' + esc(a.artistName) + '</div></div>' +
      '<div class="bar vbar"><i id="vb"></i></div><div class="times"><span id="vt"></span><span id="vd"></span></div>' +
      '<div class="ctrls" style="justify-content:center">' +
      '<div class="cb" data-f tabindex="0" id="vback" aria-label="Reculer de 10 secondes"><b style="font-size:13px">-10</b></div>' +
      '<div class="cb pp" data-f tabindex="0" id="vpp">' + SVG_PAUSE + '</div>' +
      '<div class="cb" data-f tabindex="0" id="vfwd" aria-label="Avancer de 10 secondes"><b style="font-size:13px">+10</b></div>' +
      '<div class="cb" data-f tabindex="0" id="vclose" aria-label="Fermer">✕</div>' +
      '</div></div>';
    vid = { el: el, home: el.parentNode, next: el.nextSibling, stage: stage, style: el.getAttribute('style') };
    stage.querySelector('.vbox').appendChild(el);
    el.setAttribute('style', 'width:100%;height:100%;object-fit:contain;background:#000');
    if (el.paused) { try { el.play(); } catch (e) {} }
    stage.querySelector('#vpp').onclick = function () { userAction(); music.isPlaying ? music.pause() : music.play(); };
    stage.querySelector('#vback').onclick = function () { music.seekToTime(Math.max(0, (music.currentPlaybackTime || 0) - 10)); };
    stage.querySelector('#vfwd').onclick = function () { music.seekToTime((music.currentPlaybackTime || 0) + 10); };
    stage.querySelector('#vclose').onclick = exitVideo;
    focusEl(stage.querySelector('#vpp'));
    pokeVideoControls();
    videoWatchdog();
  }
  function pokeVideoControls() {
    if (!vid) return;
    vid.stage.classList.add('show');
    clearTimeout(vid.hideTimer);
    vid.hideTimer = setTimeout(function () { if (vid && music.isPlaying) vid.stage.classList.remove('show'); }, 4000);
  }
  function updateVideoControls() {
    if (!vid) return;
    var d = music.currentPlaybackDuration || 0, t = music.currentPlaybackTime || 0;
    var b = vid.stage.querySelector('#vb'); if (b) b.style.width = (d ? Math.min(100, t / d * 100) : 0) + '%';
    var x = vid.stage.querySelector('#vt'); if (x) x.textContent = fmt(t);
    var y = vid.stage.querySelector('#vd'); if (y) y.textContent = fmt(d);
    var pp = vid.stage.querySelector('#vpp'); if (pp) pp.innerHTML = music.isPlaying ? SVG_PAUSE : SVG_PLAY;
    if (!music.isPlaying) vid.stage.classList.add('show');
  }
  function exitVideo() {
    videoMode = false;
    try { music.pause(); } catch (e) {}
    try { if (vid) vid.el.pause(); } catch (e) {}
    try { music.stop(); } catch (e) {}
    document.documentElement.classList.add('tv-on');
    var st = root.querySelector('.vstage');
    if (st && !vid) st.remove();
    root.classList.remove('tv-hidden');
    if (vid) {
      clearTimeout(vid.hideTimer);
      restoreSiteVideo();
      if (vid.stage) vid.stage.remove();
      vid = null;
    }
    updateMini();
    focusEl(root.querySelector('.main [data-f]'));
  }

  function toast(text, isError) {
    if (setting('toasts') === '0' && !isError && !/impossible|erreur|ne démarre|bloqu/i.test(text)) return;
    var t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'position:fixed;left:50%;top:32px;transform:translateX(-50%);background:#F2F2F4;color:#0E0F13;padding:14px 26px;border-radius:26px;font:600 16px Manrope,system-ui,sans-serif;z-index:2147483647';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  /* ---------- Mini-lecteur ---------- */
  function realNowItem() { try { return music.nowPlayingItem; } catch (e) { return null; } }
  /* En « répéter ce morceau », le lecteur Apple affiche brièvement un autre titre au moment
   * de reboucler. On garde l'affichage du morceau en cours pendant ce court instant. */
  var shownItem = null, holdUntil = 0, nullSince = 0;
  function nowItem() {
    var it = realNowItem();
    if (!it) {
      // Entre deux passages (reboucle, chargement), le lecteur n'a brièvement aucun titre :
      // on garde l'affichage du dernier titre jusqu'à 4 secondes.
      if (shownItem) {
        if (!nullSince) nullSince = Date.now();
        if (Date.now() - nullSince < 4000) return shownItem;
      }
      return null;
    }
    nullSince = 0;
    if (holdUntil > Date.now() && shownItem && it.id !== shownItem.id) return shownItem;
    shownItem = it;
    return it;
  }
  var lastRealId = null;
  function itemAttrs(it) { return it ? (it.attributes || it) : {}; }

  function miniHtml() {
    return '<div class="mini" style="display:none"><div class="pill">' +
      '<div class="mb sm" data-f tabindex="0" id="msh" aria-label="Aléatoire">' + icon('shuffle', 20) + '</div>' +
      '<div class="mb" data-f tabindex="0" id="mpr" aria-label="Précédent">' + SVG_PREV + '</div>' +
      '<div class="mb keep" data-f tabindex="0" id="mp" aria-label="Lecture"></div>' +
      '<div class="mb" data-f tabindex="0" id="mnx" aria-label="Suivant">' + SVG_NEXT + '</div>' +
      '<div class="mb sm" data-f tabindex="0" id="mrp" aria-label="Répéter">' + icon('repeat', 20) + '</div>' +
      '<div class="mnow" data-f tabindex="0" id="mnow"><div class="art"></div>' +
      '<div class="mtx"><div class="mt" id="mt"></div><div class="ma" id="ma"></div></div>' +
      '<div class="bar"><i id="mb"></i></div></div>' +
      '<div class="msep"></div>' +
      '<div class="mb sm keep" data-f tabindex="0" id="mly" aria-label="Paroles">' + icon('lyrics', 21) + '</div>' +
      '<div class="mb sm keep" data-f tabindex="0" id="mq" aria-label="En attente">' + icon('list', 22) + '</div>' +
      '</div></div>';
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
    mini.querySelector('#ma').textContent = [a.artistName, a.albumName].filter(Boolean).join(' — ');
    mini.querySelector('#mp').innerHTML = music.isPlaying ? SVG_PAUSE : SVG_PLAY;
    var sh = false, rp = 0;
    try { sh = music.shuffleMode === 1; rp = music.repeatMode; } catch (e) {}
    mini.querySelector('#msh').classList.toggle('act', sh);
    var r = mini.querySelector('#mrp');
    r.classList.toggle('act', !!rp);
    r.innerHTML = icon('repeat', 20) + (rp === 1 ? '<span class="r1">1</span>' : '');
    r.setAttribute('aria-label', rp === 1 ? 'Répéter ce morceau' : rp ? 'Répéter tout' : 'Répéter');
    if (queueOpen) markQueueCurrent();
    updateProgress();
  }
  function togglePlay() { userAction(); music.isPlaying ? music.pause() : music.play(); }
  function prevTrack() {
    userSkip();
    if ((music.currentPlaybackTime || 0) > 4) music.seekToTime(0); else music.skipToPreviousItem();
  }
  /* Répéter : désactivé → tout répéter → ce morceau seulement → désactivé (comme Apple Music) */
  function cycleRepeat() {
    var cur = 0;
    try { cur = music.repeatMode || 0; } catch (e) {}
    var next = cur === 0 ? 2 : cur === 2 ? 1 : 0;   // 2 = tout, 1 = un seul morceau
    try { music.repeatMode = next; } catch (e) {}
    toast(next === 2 ? 'Répéter : toute la liste' : next === 1 ? 'Répéter : ce morceau' : 'Répéter : désactivé');
    updateMini();
    if (playerOpen) drawPlayer();
  }

  /* ---------- Panneau « En attente » ---------- */
  var queueOpen = false;
  var queueOpener = null;
  function openQueue(from) {
    if (!nowItem()) return;
    queueOpen = true;
    queueOpener = from && from.id ? from.id : null;
    drawQueue(true);
  }
  function closeQueue() {
    queueOpen = false;
    var q = root.querySelector('.qpanel'); if (q) q.remove();
    var back = (queueOpener && root.querySelector('#' + queueOpener)) || root.querySelector('.player #pp') || root.querySelector('#mq');
    focusEl(back);
  }
  function drawQueue(focusCurrent) {
    var old = root.querySelector('.qpanel'); if (old) old.remove();
    var items = [], pos = 0;
    try { items = music.queue.items || []; pos = music.queue.position; } catch (e) {}
    var start = Math.max(0, pos);
    var end = Math.min(items.length, start + 60);
    var html = '<div class="qhead"><div><h2>En attente</h2><span class="sub">' + Math.max(0, items.length - start - 1) + ' titres à suivre</span></div>' +
      '<div class="btn" data-f tabindex="0" id="qclose" style="height:44px;padding:0 20px;font-size:15px">Fermer</div></div><div class="qlist">';
    for (var i = start; i < end; i++) {
      var x = itemAttrs(items[i]);
      if (i === start) html += '<div class="qlab">Lecture en cours</div>';
      if (i === start + 1) html += '<div class="qlab">À suivre</div>';
      html += '<div class="qrow' + (i === pos ? ' cur' : '') + '" data-f tabindex="0" data-q="' + i + '">' +
        '<div class="art" style="' + artStyle(x, 100, x.name) + '"></div>' +
        '<div class="tx"><div class="tt">' + esc(x.name) + '</div><div class="ta">' + esc(x.artistName) + '</div></div>' +
        '<span class="du">' + fmtMs(x.durationInMillis) + '</span></div>';
    }
    if (end - start <= 1) html += '<p class="sub" style="margin:12px">Rien après ce titre.</p>';
    html += '</div>';
    var panel = document.createElement('div');
    panel.className = 'qpanel';
    panel.innerHTML = html;
    root.appendChild(panel);
    panel.querySelectorAll('.qrow').forEach(function (el) {
      el.onclick = function () {
        userSkip();
        var idx = +el.getAttribute('data-q');
        Promise.resolve(idx === music.queue.position ? null : music.changeToMediaAtIndex(idx))
          .then(function () { return music.play(); })
          .catch(function (e) { toast('Lecture impossible : ' + friendlyError(e)); });
      };
    });
    panel.querySelector('#qclose').onclick = closeQueue;
    if (focusCurrent) focusEl(panel.querySelector('.qrow.cur + .qlab + .qrow') || panel.querySelector('.qrow') || panel.querySelector('#qclose'));
  }
  function markQueueCurrent() {
    var panel = root.querySelector('.qpanel');
    if (!panel) return;
    var pos = -1;
    try { pos = music.queue.position; } catch (e) {}
    var cur = panel.querySelector('.qrow.cur');
    if (cur && +cur.getAttribute('data-q') === pos) return;
    // Le morceau a changé : on redessine en gardant le focus dans le panneau.
    var had = panel.contains(document.activeElement);
    drawQueue(false);
    if (had) focusEl(root.querySelector('.qpanel .qrow.cur') || root.querySelector('.qpanel .qrow'));
  }

  function updateProgress() {
    var d = music.currentPlaybackDuration || 0, t = pendingSeek != null ? pendingSeek : (music.currentPlaybackTime || 0);
    var pct = d ? Math.min(100, (t / d) * 100) : 0;
    var mb = root.querySelector('#mb'); if (mb) mb.style.width = pct + '%';
    var pb = root.querySelector('#pb'); if (pb) pb.style.width = pct + '%';
    var pk = root.querySelector('#pk'); if (pk) pk.style.left = pct + '%';
    var pt = root.querySelector('#pt'); if (pt) pt.textContent = fmt(t);
    var pd = root.querySelector('#pd'); if (pd) pd.textContent = fmt(d);
  }

  /* Avancer / reculer : sur la barre de progression, ◀ ▶ déplacent de 10 s (20 s en restant appuyé). */
  var pendingSeek = null, seekTimer = null;
  function seekStep(dir, held) {
    var d = music.currentPlaybackDuration || 0;
    if (!d) return;
    var base = pendingSeek != null ? pendingSeek : (music.currentPlaybackTime || 0);
    pendingSeek = Math.max(0, Math.min(d - 1, base + dir * (held ? 20 : 10)));
    updateProgress();
    clearTimeout(seekTimer);
    seekTimer = setTimeout(function () {
      var target = pendingSeek;
      Promise.resolve(music.seekToTime(target)).then(function () { pendingSeek = null; updateProgress(); }, function () { pendingSeek = null; });
      userAction();
    }, 450);
  }

  function updatePlayButton() {
    var b = root.querySelector('.player #pp');
    if (b) b.innerHTML = music.isPlaying ? SVG_PAUSE : SVG_PLAY;
  }

  /* ---------- Lecteur plein écran ---------- */
  function openPlayer(withLyrics) {
    if (!nowItem()) return;
    playerOpen = true;
    if (withLyrics === true) lyricsOn = true;
    else if (setting('lyrauto') === '1') lyricsOn = true;
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
    focusEl(root.querySelector('.mini') && root.querySelector('.mini').style.display !== 'none' ? root.querySelector('#mnow') : root.querySelector('.main [data-f]'));
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
    // Fond : la pochette floutée (intensité réglable dans Réglages).
    var bgUrl = artUrl(a, 300);
    var bgKey = bgUrl || (a.name || '');
    var oldBg = p.getAttribute('data-bg');
    p.innerHTML =
      '<div class="pbg' + (oldBg === bgKey ? ' on' : '') + '" style="' + (bgUrl ? 'background-image:url(\'' + bgUrl + '\')' : artStyle(a, 40, a.name)) + '"></div><div class="pshade"></div>' +
      '<div class="pmain"><div class="art big" style="' + artStyle(a, 800, a.name) + '"></div>' +
      '<div class="pinfo"><div><p class="kick">Lecture en cours</p>' +
      '<div class="ptitle">' + esc(a.name) + '</div><p class="partist">' + esc(a.artistName) + (a.albumName ? ' — ' + esc(a.albumName) : '') + '</p></div>' +
      '<div><div class="seek" data-f tabindex="0" data-seek="1" id="pseek" aria-label="Position dans le morceau"><div class="bar"><i id="pb"></i><b class="knob" id="pk"></b></div></div>' +
      '<div class="times"><span id="pt"></span><span class="seekhint">◀ ▶ pour avancer</span><span id="pd"></span></div></div>' +
      '<div class="ctrls">' +
      '<div class="cb sm' + (shuffle ? ' act' : '') + '" data-f tabindex="0" id="psh">' + icon('shuffle') + '</div>' +
      '<div class="cb" data-f tabindex="0" id="ppr">' + SVG_PREV + '</div>' +
      '<div class="cb pp" data-f tabindex="0" id="pp">' + (music.isPlaying ? SVG_PAUSE : SVG_PLAY) + '</div>' +
      '<div class="cb" data-f tabindex="0" id="pnx">' + SVG_NEXT + '</div>' +
      '<div class="cb sm' + (repeat ? ' act' : '') + '" data-f tabindex="0" id="prp">' + icon('repeat') + (repeat === 1 ? '<span class="r1" style="right:12px;bottom:12px">1</span>' : '') + '</div>' +
      '<div class="cb sm' + (lyricsOn ? ' act' : '') + '" data-f tabindex="0" id="plyr" aria-label="Paroles">' + icon('lyrics') + '</div>' +
      '<div class="cb sm" data-f tabindex="0" id="pq" aria-label="En attente">' + icon('list') + '</div>' +
      '</div></div></div>' +
      (lyricsOn ? lyricsHtml() : '') +
      '<div class="queue"><h2 style="margin:0 0 6px">À suivre</h2>' +
      (q.length ? q.map(function (it) {
        var x = itemAttrs(it);
        return '<div class="qi"><div class="art" style="' + artStyle(x, 100, x.name) + '"></div><div style="min-width:0"><div class="ct" style="font-size:14px">' + esc(x.name) + '</div><div class="cs" style="margin-top:2px">' + esc(x.artistName) + '</div></div></div>';
      }).join('') : '<p class="sub">Rien après ce titre.</p>') + '</div>';
    p.setAttribute('data-bg', bgKey);
    var bg = p.querySelector('.pbg');
    if (bgUrl && !bg.classList.contains('on')) {
      var im = new Image();
      im.onload = function () { bg.classList.add('on'); };
      im.src = bgUrl;
    } else { bg.classList.add('on'); }
    p.querySelector('#pp').onclick = function () { userAction(); music.isPlaying ? music.pause() : music.play(); };
    p.querySelector('#pnx').onclick = function () { userSkip(); music.skipToNextItem(); };
    p.querySelector('#pseek').onclick = togglePlay;
    p.querySelector('#ppr').onclick = function () {
      if ((music.currentPlaybackTime || 0) > 4) music.seekToTime(0); else music.skipToPreviousItem();
    };
    p.querySelector('#psh').onclick = function () { setShuffle(!(music.shuffleMode === 1)); this.classList.toggle('act', music.shuffleMode === 1); };
    p.querySelector('#prp').onclick = cycleRepeat;
    p.querySelector('#pq').onclick = function () { openQueue(this); };
    p.querySelector('#plyr').onclick = toggleLyrics;
    p.classList.toggle('lyr', lyricsOn);
    if (lyricsOn) loadLyricsInto();
    updateProgress();
    var f = p.querySelector('#' + focusedId) || p.querySelector('#pp');
    focusEl(f);
  }

  /* ---------- Paroles synchronisées (LRCLIB, lrclib.net) ----------
   * Le site Apple bloque les appels vers d'autres sites : la demande passe par la partie
   * Android de l'app (TVBridge.httpGet), qui ne contacte que lrclib.net. */
  var httpWait = {}, httpSeq = 0;
  window.__tvHttp = function (id, status, body) {
    var cb = httpWait[id]; delete httpWait[id];
    if (cb) cb(status, body);
  };
  function httpGet(url) {
    return new Promise(function (resolve, reject) {
      if (window.TVBridge && TVBridge.httpGet) {
        var id = 'h' + (++httpSeq);
        httpWait[id] = function (status, body) { resolve({ status: status, body: body }); };
        setTimeout(function () { if (httpWait[id]) { delete httpWait[id]; reject(new Error('délai dépassé')); } }, 12000);
        try { TVBridge.httpGet(id, url); } catch (e) { delete httpWait[id]; reject(e); }
      } else {
        fetch(url).then(function (r) { return r.text().then(function (b) { resolve({ status: r.status, body: b }); }); }, reject);
      }
    });
  }
  function cleanName(n) {
    return String(n || '').replace(/\s*[\(\[](feat|ft|with|avec)\.?[^\)\]]*[\)\]]/ig, '')
      .replace(/\s*-\s*(single|ep)$/i, '').replace(/\s*\[[^\]]*\]/g, '').trim();
  }
  function parseLRC(txt) {
    var out = [];
    String(txt || '').split(/\r?\n/).forEach(function (line) {
      var stamps = [], m, re = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g, last = 0;
      while ((m = re.exec(line))) { stamps.push(+m[1] * 60 + parseFloat(m[2].replace(':', '.'))); last = re.lastIndex; }
      var text = line.slice(last).trim();
      stamps.forEach(function (t) { out.push({ t: t, text: text }); });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  var lyricsCache = {};
  function getLyrics(item) {
    var a = itemAttrs(item);
    var key = (item && item.id) || a.name;
    if (lyricsCache[key]) return lyricsCache[key];
    var dur = a.durationInMillis ? Math.round(a.durationInMillis / 1000) : 0;
    var base = 'https://lrclib.net/api/';
    var q = function (o) { return Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); };
    var pick = function (j) {
      if (!j) return null;
      if (j.instrumental) return { instrumental: true };
      if (j.syncedLyrics) return { synced: parseLRC(j.syncedLyrics) };
      if (j.plainLyrics) return { plain: j.plainLyrics };
      return null;
    };
    var p = httpGet(base + 'get?' + q({ track_name: a.name, artist_name: a.artistName, album_name: cleanName(a.albumName), duration: dur }))
      .then(function (r) {
        if (r.status === 200) { var x = pick(JSON.parse(r.body)); if (x && !x.plain) return x; }
        return httpGet(base + 'search?' + q({ track_name: cleanName(a.name), artist_name: (a.artistName || '').split(/,|&| et | x /i)[0].trim() }))
          .then(function (r2) {
            var list = []; try { list = JSON.parse(r2.body) || []; } catch (e) {}
            list.sort(function (x, y) {
              var dx = Math.abs((x.duration || 0) - dur), dy = Math.abs((y.duration || 0) - dur);
              return (y.syncedLyrics ? 1 : 0) - (x.syncedLyrics ? 1 : 0) || dx - dy;
            });
            var best = list.filter(function (x) { return !dur || !x.duration || Math.abs(x.duration - dur) < 8; })[0] || list[0];
            return pick(best) || { none: true };
          });
      })
      .catch(function () { delete lyricsCache[key]; return { error: true }; });
    lyricsCache[key] = p;
    return p;
  }
  var lyricsOn = false, lyrData = null, lyrFor = null, lyrIdx = -2;
  function lyricsHtml() {
    return '<div class="lyrics" id="lyrbox"><div class="lyrin" id="lyrin"><p class="lyrmsg">Recherche des paroles…</p></div></div>';
  }
  function loadLyricsInto() {
    var it = nowItem();
    var box = root.querySelector('#lyrin');
    if (!box || !it) return;
    var key = it.id;
    lyrFor = key; lyrIdx = -2;
    getLyrics(it).then(function (L) {
      if (lyrFor !== key || !root.querySelector('#lyrin')) return;
      lyrData = L;
      var b = root.querySelector('#lyrin');
      if (L.synced && L.synced.length) {
        b.innerHTML = L.synced.map(function (l, i) { return '<p class="ly" data-l="' + i + '">' + (l.text ? esc(l.text) : '♪') + '</p>'; }).join('');
      } else if (L.plain) {
        b.innerHTML = '<p class="lyrmsg">Paroles non synchronisées</p>' + L.plain.split(/\n/).map(function (l) { return '<p class="ly plain">' + (esc(l) || '&nbsp;') + '</p>'; }).join('');
      } else if (L.instrumental) {
        b.innerHTML = '<p class="lyrmsg">Morceau instrumental ♪</p>';
      } else {
        b.innerHTML = '<p class="lyrmsg">' + (L.error ? 'Impossible de joindre LRCLIB.' : 'Paroles introuvables pour ce titre.') + '</p>';
      }
      syncLyrics(true);
    });
  }
  function syncLyrics(force) {
    if (!lyricsOn || !lyrData || !lyrData.synced) return;
    var box = root.querySelector('#lyrbox'), inner = root.querySelector('#lyrin');
    if (!box || !inner) return;
    var t = (pendingSeek != null ? pendingSeek : (music.currentPlaybackTime || 0)) - (+setting('lyroffset') || 0) + 0.15;
    var L = lyrData.synced, idx = -1;
    for (var i = 0; i < L.length; i++) { if (L[i].t <= t) idx = i; else break; }
    if (idx === lyrIdx && !force) return;
    lyrIdx = idx;
    var ps = inner.children;
    for (var j = 0; j < ps.length; j++) {
      ps[j].className = 'ly' + (j === idx ? ' cur' : j < idx ? ' past' : '');
    }
    var cur = ps[Math.max(0, idx)];
    if (cur) {
      var y = cur.offsetTop - box.clientHeight * 0.38 + cur.offsetHeight / 2;
      inner.style.transform = 'translateY(' + (-Math.max(0, y)) + 'px)';
    }
  }
  setInterval(function () { if (playerOpen && lyricsOn) syncLyrics(false); }, 200);
  function toggleLyrics() {
    lyricsOn = !lyricsOn;
    drawPlayer();
  }

  /* ---------- Connexion ----------
   * On utilise le bouton « Sign In » officiel du site Apple : c'est la seule
   * connexion qu'Apple accepte, et elle est gardée d'une ouverture à l'autre. */
  var signingIn = false;
  var signWatch = null;

  function siteSignInButton() {
    return document.querySelector('[data-testid="sign-in-button"]') ||
      Array.prototype.filter.call(document.querySelectorAll('button, a'), function (e) {
        return !root.contains(e) && /^(sign in|se connecter|connexion)$/i.test((e.textContent || '').trim());
      })[0];
  }

  function viewLogin() {
    endSignIn(false);
    root.innerHTML = '<div class="center" style="width:100%">' +
      '<div class="logo" style="margin:0;width:72px;height:72px;border-radius:18px">' + SVG_NOTE + '</div>' +
      '<h1>Musique TV</h1><p class="sub">Connecte-toi avec ton compte Apple pour retrouver tes playlists.</p>' +
      '<div class="btns" style="justify-content:center"><div class="btn pri" data-f tabindex="0" id="login">Se connecter avec Apple</div></div>' +
      '<p class="sub" style="margin-top:24px;max-width:640px">La page de connexion d\'Apple va s\'ouvrir. Utilise les flèches et OK pour remplir les champs. Touche Retour pour annuler.</p></div>';
    root.querySelector('#login').onclick = startSignIn;
    focusEl(root.querySelector('#login'));
  }

  function startSignIn() {
    var btn = null, tries = 0;
    (function find() {
      btn = siteSignInButton();
      if (!btn && ++tries < 20) { setTimeout(find, 500); return; }
      if (!btn) {
        toast('Bouton de connexion Apple introuvable. Réglages > Recharger l\'app.');
        return;
      }
      signingIn = true;
      // On cache notre interface pour laisser voir la page de connexion d'Apple.
      root.classList.add('tv-hidden'); document.documentElement.classList.remove('tv-on');
      try { btn.click(); } catch (e) {}
      // On attend que la connexion réussisse.
      clearInterval(signWatch);
      signWatch = setInterval(function () {
        if (music && music.isAuthorized) {
          endSignIn(true);
          tab = 'home'; navKey = 'home'; stack = []; render(); loadSidebar();
        }
      }, 1000);
    })();
  }

  function endSignIn(ok) {
    signingIn = false;
    clearInterval(signWatch);
    signWatch = null;
    root.classList.remove('tv-hidden'); document.documentElement.classList.add('tv-on');
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
    on('nowPlayingItemDidChange', function () {
      var it = realNowItem();
      if (!it) {
        setTimeout(function () { updateMini(); if (playerOpen) drawPlayer(); }, 4100);
        return;
      }
      var rp = 0; try { rp = music.repeatMode; } catch (e) {}
      if (rp === 1 && shownItem && it && it.id !== shownItem.id && Date.now() - lastSkip > 2000) {
        holdUntil = Date.now() + 3500;
        setTimeout(function () { holdUntil = 0; updateMini(); if (playerOpen) drawPlayer(); }, 3600);
        return;
      }
      holdUntil = 0;
      if (it.id !== lastRealId) { lastRealId = it.id; onTrackChange(); }
      var sameAsShown = shownItem && shownItem.id === it.id && playerOpen && root.querySelector('.player .big');
      updateMini();
      if (playerOpen && !sameAsShown) drawPlayer();
    });
    on('playbackStateDidChange', function () { updateMini(); updatePlayButton(); updateVideoControls(); });
    var lastTick = 0;
    on('mediaPlaybackError', function (e) {
      var code = e && (e.errorCode || (e.error && (e.error.errorCode || e.error.message)) || e.message) || 'erreur';
      logPlayError('erreur ' + code);
    });
    on('playbackTimeDidChange', function () {
      var now = Date.now();
      if (now - lastTick < 500) return;
      lastTick = now;
      updateProgress();
      updateVideoControls();
    });
    on('authorizationStatusDidChange', function () {
      if (signingIn) return;
      try { sf = music.storefrontId || sf; } catch (e) {}
      if (!music.isAuthorized) { viewLogin(); return; }
      // Session revenue après coup : on affiche l'accueil si on était sur l'écran de connexion.
      if (root.querySelector('#login')) { tab = 'home'; navKey = 'home'; stack = []; render(); }
      sideTries = 0; loadSidebar();
    });
    watchSiteDialogs();
    // La session met parfois une seconde à revenir au démarrage : on patiente un peu.
    var waited = 0;
    (function check() {
      if (music.isAuthorized) { try { sf = music.storefrontId || sf; } catch (e) {} render(); loadSidebar(); return; }
      if ((waited += 500) < 3000) { setTimeout(check, 500); return; }
      viewLogin();
    })();
  }

  /* ---------- Fenêtres du site Apple ----------
   * Le site caché derrière l'interface ouvre parfois ses propres fenêtres
   * (messages d'erreur). Elles passent au-dessus de tout : on les ferme,
   * sauf pendant la connexion où c'est la page d'Apple qu'on veut voir. */
  function watchSiteDialogs() {
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    function sweep() {
      if (signingIn || videoMode) return;
      var list = document.querySelectorAll('dialog[open], [role="alertdialog"]');
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
    setInterval(sweep, 1000);
  }

  boot();
})();
