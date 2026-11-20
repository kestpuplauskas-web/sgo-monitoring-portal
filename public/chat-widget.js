(function(){
  if (window.__sgoChat) return; window.__sgoChat = true;
  var KEY='sgo_chat', st=null; try{st=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  var css='#sgo-chat{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:"IBM Plex Sans",system-ui,sans-serif}'+
  '#sgo-chat *{box-sizing:border-box}'+
  '.sc-fab{width:60px;height:60px;border-radius:50%;border:0;background:#1FB894;color:#052620;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;margin-left:auto}'+
  '.sc-fab svg{width:28px;height:28px}'+
  '.sc-teaser{position:absolute;right:0;bottom:74px;width:min(290px,calc(100vw - 40px));background:#fff;color:#10201C;border:1px solid #DCE5E1;border-radius:16px;padding:14px 36px 14px 14px;box-shadow:0 14px 34px rgba(0,0,0,.2);font-size:14px;line-height:1.45;cursor:pointer;animation:scIn .3s ease}'+
  '.sc-teaser b{display:block;font-size:12px;color:#0E8F71;font-family:"IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}'+
  '.sc-x{position:absolute;top:4px;right:4px;width:32px;height:32px;border:0;background:none;color:#56685F;font-size:20px;cursor:pointer;border-radius:8px}'+
  '.sc-panel{position:absolute;right:0;bottom:74px;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 110px));background:#fff;color:#10201C;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;animation:scIn .25s ease}'+
  '.sc-head{background:#0A141F;color:#E7EDEB;padding:14px 12px 14px 16px;display:flex;align-items:center;gap:10px}'+
  '.sc-av{width:36px;height:36px;border-radius:50%;background:#1FB894;color:#052620;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}'+
  '.sc-head h3{margin:0;font-size:15px}.sc-head p{margin:0;font-size:12px;color:#8CA39B}.sc-head .sc-x{position:static;color:#E7EDEB;margin-left:auto;width:44px;height:44px}'+
  '.sc-body{flex:1;overflow-y:auto;padding:14px;background:#F3F6F5;display:flex;flex-direction:column;gap:8px}'+
  '.sc-m{max-width:85%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}'+
  '.sc-m.v{align-self:flex-end;background:#0E8F71;color:#fff;border-bottom-right-radius:4px}'+
  '.sc-m.a{align-self:flex-start;background:#fff;border:1px solid #DCE5E1;border-bottom-left-radius:4px}'+
  '.sc-m.h{align-self:flex-start;background:#E3F6EF;border:1px solid #1FB894;border-bottom-left-radius:4px}'+
  '.sc-m small{display:block;font-size:11px;color:#56685F;margin-bottom:2px;font-weight:600}'+
  '.sc-m.s{align-self:center;background:none;color:#56685F;font-size:12px;text-align:center}'+
  '.sc-typing{align-self:flex-start;color:#56685F;font-size:13px;padding:4px 8px}'+
  '.sc-human{border:0;border-top:1px solid #DCE5E1;background:#fff;color:#0E8F71;font-weight:600;font-size:13px;padding:10px;cursor:pointer;min-height:44px}'+
  '.sc-form{display:flex;gap:8px;padding:10px;border-top:1px solid #DCE5E1;background:#fff}'+
  '.sc-form textarea{flex:1;resize:none;border:1px solid #DCE5E1;border-radius:12px;padding:10px;font:inherit;font-size:15px;max-height:100px;color:#10201C;background:#fff}'+
  '.sc-form button{width:44px;height:44px;border-radius:50%;border:0;background:#1FB894;color:#052620;cursor:pointer;align-self:flex-end;font-size:18px}'+
  '.sc-form button:disabled{opacity:.5;cursor:default}'+
  '.sc-hf{padding:12px;border-top:1px solid #DCE5E1;background:#fff;display:grid;gap:8px;font-size:13px}'+
  '.sc-hf label{display:grid;gap:4px;font-weight:600}.sc-hf input{border:1px solid #DCE5E1;border-radius:10px;padding:10px;font:inherit;font-size:15px}'+
  '.sc-hf .row{display:flex;gap:8px}.sc-hf .row button{flex:1;min-height:44px;border-radius:999px;border:1px solid #DCE5E1;background:#fff;cursor:pointer;font-weight:600}.sc-hf .row button.p{background:#1FB894;border-color:#1FB894;color:#052620}'+
  '@keyframes scIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'+
  '@media (max-width:480px){#sgo-chat{right:12px;bottom:12px}}';
  var s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  var root=document.createElement('div'); root.id='sgo-chat'; document.body.appendChild(root);
  var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var fab=document.createElement('button'); fab.className='sc-fab'; fab.setAttribute('aria-label','Atidaryti SGO Asistento pokalbį'); fab.innerHTML=ICON; root.appendChild(fab);
  var panel=null, body=null, ta=null, sendBtn=null, humanBtn=null, msgs=[], status='agent', poll=null, waiting=false, teaser=null;

  function save(){ try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){} }
  function api(data){ return fetch('/api/public/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){ if(r.status===404){st=null;save();} return r.json(); }); }
  function ensure(){ if(st) return Promise.resolve(st); return api({action:'start',page:location.pathname}).then(function(r){ if(!r.id) throw 0; st={id:r.id,token:r.token}; save(); return st; }); }
  function load(){ if(!st) return Promise.resolve(); return fetch('/api/public/chat?id='+st.id+'&token='+encodeURIComponent(st.token)).then(function(r){ if(r.status===404){st=null;save();return null;} return r.json(); }).then(function(r){ if(!r||!r.messages) return; status=r.status; var changed=r.messages.length!==msgs.length; msgs=r.messages; if(changed) render(); updHuman(); }).catch(function(){}); }
  function el(t,c,txt){ var e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; return e; }
  function render(){ if(!body) return; body.innerHTML=''; msgs.forEach(function(m){ var cls=m.role==='visitor'?'v':m.role==='admin'?'h':m.role==='system'?'s':'a'; var d=el('div','sc-m '+cls); if(cls==='h'){ d.appendChild(el('small',null,'SGO specialistas')); } d.appendChild(document.createTextNode(m.content)); body.appendChild(d); }); if(waiting) body.appendChild(el('div','sc-typing','SGO Asistentas rašo…')); body.scrollTop=body.scrollHeight; }
  function updHuman(){ if(!humanBtn) return; var lm=null; for(var i=msgs.length-1;i>=0;i--){ if(msgs[i].role!=='visitor'){ lm=msgs[i]; break; } } humanBtn.hidden = !(status==='agent' && lm && lm.role!=='admin' && /sujung\S* su SGO specialist|pasikalbėti su specialistu/i.test(lm.content)); var sub=panel&&panel.querySelector('.sc-head p'); if(sub) sub.textContent = status==='human'?'Kalbate su SGO specialistu':status==='waiting'?'Laukiama specialisto…':'Atsako per kelias sekundes'; }
  function send(){ var t=ta.value.trim(); if(!t||waiting) return; ta.value=''; msgs.push({role:'visitor',content:t}); waiting = status==='agent'; render(); sendBtn.disabled=true;
    ensure().then(function(){ return api({action:'send',id:st.id,token:st.token,text:t}); }).then(function(r){ waiting=false; if(r&&r.error==='too_fast'){ return load().then(function(){ ta.value=t; msgs.push({role:'system',content:'Rašote per greitai — palaukite kelias sekundes ir siųskite dar kartą.'}); render(); }); } return load(); }).catch(function(){ waiting=false; msgs.push({role:'system',content:'Nepavyko išsiųsti. Bandykite dar kartą arba skambinkite +370 606 06222.'}); render(); }).then(function(){ sendBtn.disabled=false; render(); }); }
  function humanForm(){ var f=el('div','sc-hf'); f.innerHTML='<strong>Sujungsime su SGO specialistu</strong><label>Vardas<input name="n" autocomplete="name"></label><label>El. paštas (jei norite atsakymo laišku)<input name="e" type="email" autocomplete="email"></label><div class="row"><button type="button" data-c>Atšaukti</button><button type="button" class="p" data-ok>Kviesti specialistą</button></div>';
    humanBtn.hidden=true; panel.insertBefore(f, panel.querySelector('.sc-form'));
    f.querySelector('[data-c]').onclick=function(){ f.remove(); updHuman(); };
    f.querySelector('[data-ok]').onclick=function(){ var n=f.querySelector('[name=n]').value, e=f.querySelector('[name=e]').value; f.remove(); ensure().then(function(){ return api({action:'human',id:st.id,token:st.token,name:n,email:e}); }).then(load); }; }
  function open(){ if(teaser){teaser.remove();teaser=null;} try{sessionStorage.setItem('sgo_chat_teased','1')}catch(e){} if(panel){ close(); return; }
    panel=el('div','sc-panel'); panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','SGO Asistentas');
    panel.innerHTML='<div class="sc-head"><div class="sc-av">SGO</div><div><h3>SGO Asistentas</h3><p>Atsako per kelias sekundes</p></div><button class="sc-x" aria-label="Uždaryti pokalbį">×</button></div><div class="sc-body" aria-live="polite"></div><button class="sc-human" type="button" hidden>Noriu pasikalbėti su specialistu</button><form class="sc-form"><textarea rows="1" placeholder="Parašykite klausimą…" aria-label="Jūsų žinutė"></textarea><button type="submit" aria-label="Siųsti">➤</button></form>';
    root.insertBefore(panel, fab); body=panel.querySelector('.sc-body'); ta=panel.querySelector('textarea'); sendBtn=panel.querySelector('.sc-form button'); humanBtn=panel.querySelector('.sc-human');
    panel.querySelector('.sc-x').onclick=close; humanBtn.onclick=humanForm;
    panel.querySelector('.sc-form').onsubmit=function(e){ e.preventDefault(); send(); };
    ta.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
    fab.setAttribute('aria-label','Uždaryti pokalbį');
    if(!st){ msgs=[{role:'agent',content:'Sveiki! Aš SGO Asistentas 👋 Padėsiu išsirinkti tinkamiausią elektrinės priežiūros planą ar atsakysiu į klausimus apie gedimus. Kuo galiu padėti?'}]; render(); updHuman(); } else load();
    poll=setInterval(function(){ if(st&&!waiting) load(); }, 3000); setTimeout(function(){ta.focus()},50); }
  function close(){ if(panel){panel.remove();panel=null;} clearInterval(poll); fab.setAttribute('aria-label','Atidaryti SGO Asistento pokalbį'); fab.focus(); }
  fab.onclick=open;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(panel) close(); else if(teaser){teaser.remove();teaser=null;} } });
  // proactive greeting
  var teased=false; try{teased=sessionStorage.getItem('sgo_chat_teased')==='1'}catch(e){}
  if(!teased){ setTimeout(function(){ if(panel) return; teaser=el('div','sc-teaser'); teaser.setAttribute('role','status'); teaser.innerHTML='<b>SGO Asistentas</b>Sveiki! Padėti išsirinkti tinkamiausią elektrinės priežiūros planą ar turite klausimų dėl gedimo?<button class="sc-x" aria-label="Uždaryti">×</button>';
    teaser.onclick=function(e){ if(e.target.classList.contains('sc-x')){ e.stopPropagation(); teaser.remove(); teaser=null; try{sessionStorage.setItem('sgo_chat_teased','1')}catch(_){} return; } open(); };
    root.insertBefore(teaser, fab); }, 8000); }
})();
