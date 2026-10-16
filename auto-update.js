// Auto-update check (plain JS, old-Safari safe: no ??, ?., inset). Load it LAST, after version.js.
// Customize only the two hooks at the top.
(function(){
  // HOOK 1: return true when it is safe to reload silently (e.g. the player is on the title/menu screen, nothing in progress).
  function isIdle(){ return typeof window.EY_isIdle==='function' ? window.EY_isIdle() : false; }
  // HOOK 2: (optional) style the banner to match the game.
  var BANNER_TEXT='Nueva versión lista — toca para actualizar / New version ready';

  var cur=typeof APP_VERSION!=='undefined'?APP_VERSION:'?',busy=false,dismissed='',KEY='upd_reloaded_to';
  function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
  function go(v){ss(KEY,v);var q=location.search.replace(/([?&])u=[^&]*&?/,'$1').replace(/[?&]$/,'');
    location.replace(location.pathname+(q?q+'&':'?')+'u='+Date.now()+location.hash)}
  function tap(el,fn){var t=0;function f(e){var n=Date.now();if(n-t<500)return;t=n;if(e&&e.preventDefault)e.preventDefault();fn()}
    el.addEventListener('click',f);el.addEventListener('touchend',f)}
  function banner(v){
    if(document.getElementById('upd')||dismissed===v)return;
    var d=document.createElement('div');d.id='upd';
    d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;box-sizing:border-box;display:flex;align-items:center;padding:8px 8px 8px 12px;padding-top:max(8px,env(safe-area-inset-top));background:#1f5f3a;color:#fff;font-family:system-ui,sans-serif;box-shadow:0 3px 12px #0006';
    var b=document.createElement('button');b.type='button';b.textContent=BANNER_TEXT;
    b.style.cssText='flex:1;min-height:52px;font-size:19px;font-weight:800;color:#1f5f3a;background:#fff;border:0;border-radius:26px;padding:8px 14px;cursor:pointer;touch-action:manipulation;-webkit-appearance:none';
    var x=document.createElement('button');x.type='button';x.textContent='\u2715';x.setAttribute('aria-label','Later');
    x.style.cssText='min-width:48px;min-height:48px;margin-left:8px;font-size:22px;color:#fff;background:transparent;border:0;cursor:pointer;touch-action:manipulation;-webkit-appearance:none';
    d.appendChild(b);d.appendChild(x);document.body.appendChild(d);
    tap(b,function(){go(v)});tap(x,function(){dismissed=v;if(d.parentNode)d.parentNode.removeChild(d)});
  }
  function newer(v){ if(isIdle()&&ss(KEY)!==v){go(v);return} banner(v); } // auto-reload at most ONCE per new version per tab session
  function check(){
    if(busy||typeof fetch!=='function')return;busy=true;
    try{fetch('version.json?t='+Date.now(),{cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(j){busy=false;if(j&&j.v&&j.v!==cur)newer(j.v)})
      .catch(function(){busy=false})}catch(e){busy=false}
  }
  // strip the cache-busting ?u= from the address bar after a reload
  try{if(/[?&]u=/.test(location.search)&&history.replaceState){var q=location.search.replace(/([?&])u=[^&]*&?/,'$1').replace(/[?&]$/,'');history.replaceState(null,'',location.pathname+q+location.hash)}}catch(e){}
  window.checkForUpdate=check;check();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
  addEventListener('pageshow',function(e){if(e.persisted)check()});
})();
