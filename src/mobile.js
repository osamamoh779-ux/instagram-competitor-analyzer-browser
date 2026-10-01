import {inspectContent, loginStatus, profileSnapshot} from './instagram.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

const layout=(title,body)=>`<!doctype html>
<html lang="en" dir="ltr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1020"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="IG Analyzer">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg">
<title>${esc(title)} · Instagram Analyzer</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070a12;color:#f8fafc}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 100% 0,#172554 0,transparent 35%),#070a12;min-height:100vh}.wrap{width:min(760px,100%);margin:auto;padding:max(24px,env(safe-area-inset-top)) 18px max(32px,env(safe-area-inset-bottom))}.hero{padding:18px 0 12px}.eyebrow{color:#7dd3fc;font-weight:800;letter-spacing:.12em;font-size:.72rem;text-transform:uppercase}h1{font-size:clamp(2rem,9vw,3.4rem);line-height:.95;margin:.55rem 0 1rem;letter-spacing:-.05em}.lead{color:#bac5d6;line-height:1.55;margin:0}.card{background:rgba(16,23,42,.88);border:1px solid #26334d;border-radius:22px;padding:18px;margin-top:16px;box-shadow:0 14px 40px #0005}h2{font-size:1rem;margin:0 0 13px}label{display:block;color:#cbd5e1;font-size:.82rem;font-weight:700;margin:12px 0 7px}input{width:100%;border:1px solid #34425f;border-radius:14px;padding:14px 15px;background:#090e1b;color:#fff;font-size:16px;outline:none}input:focus{border-color:#38bdf8;box-shadow:0 0 0 3px #38bdf827}.row{display:grid;grid-template-columns:1fr 88px;gap:10px}.btn,button{display:inline-flex;justify-content:center;align-items:center;width:100%;border:0;border-radius:14px;padding:14px 16px;margin-top:14px;background:linear-gradient(135deg,#38bdf8,#818cf8);color:#06101c;font-size:1rem;font-weight:900;text-decoration:none}.secondary{background:#1b2840;color:#e2e8f0}.status{display:flex;gap:10px;align-items:center}.dot{width:10px;height:10px;border-radius:99px;background:#22c55e;box-shadow:0 0 14px #22c55e}.bad{background:#ef4444;box-shadow:0 0 14px #ef4444}.muted{color:#94a3b8;font-size:.86rem;line-height:1.45}.result{white-space:pre-wrap;overflow-wrap:anywhere;background:#060914;border:1px solid #25314a;border-radius:14px;padding:13px;max-height:45vh;overflow:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}.links{display:grid;gap:8px}.links a{color:#7dd3fc;overflow-wrap:anywhere}.error{color:#fecaca;border-color:#7f1d1d;background:#270b10}.nav{display:flex;gap:10px}.nav a{flex:1}.privacy{text-align:center;margin-top:18px;color:#64748b;font-size:.75rem}
</style></head><body><main class="wrap">${body}</main></body></html>`;

const home=async()=>{
  let status;
  try{status=await loginStatus()}catch(error){status={authenticated:false,error:error.message}}
  return layout('Mobile',`<section class="hero"><div class="eyebrow">Private mobile workspace</div><h1>Instagram<br>Competitor Analyzer</h1><p class="lead">Research public profiles and inspect posts using the Instagram session stored in your Codespace.</p></section>
  <section class="card"><div class="status"><span class="dot ${status.authenticated?'':'bad'}"></span><strong>${status.authenticated?'Instagram session connected':'Instagram session needs login'}</strong></div><p class="muted">${esc(status.url||status.error||'')}</p></section>
  <form class="card" method="post" action="/app/profile"><h2>Research a competitor</h2><div class="row"><div><label for="username">Instagram username</label><input id="username" name="username" placeholder="designs_lab" autocapitalize="none" autocomplete="off" required></div><div><label for="limit">Posts</label><input id="limit" name="limit" type="number" value="12" min="1" max="30"></div></div><button>Open profile research</button></form>
  <form class="card" method="post" action="/app/content"><h2>Inspect a post or Reel</h2><label for="url">Instagram URL</label><input id="url" name="url" type="url" inputmode="url" placeholder="https://www.instagram.com/reel/..." required><button>Inspect content</button></form>
  <p class="privacy">Private Codespaces access · credentials are never shown or stored in this page</p>`);
};

const errorPage=error=>layout('Error',`<section class="hero"><div class="eyebrow">Request failed</div><h1>Couldn’t finish</h1></section><section class="card error"><p>${esc(error?.message||error)}</p><a class="btn secondary" href="/app">Back to analyzer</a></section>`);

export function installMobileApp(admin){
  admin.get('/manifest.webmanifest',(_req,res)=>res.type('application/manifest+json').send({name:'Instagram Competitor Analyzer',short_name:'IG Analyzer',start_url:'/app',display:'standalone',background_color:'#070a12',theme_color:'#0b1020',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]}));
  admin.get('/icon.svg',(_req,res)=>res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs><rect width="256" height="256" rx="58" fill="#0b1020"/><circle cx="128" cy="128" r="72" fill="none" stroke="url(#g)" stroke-width="18"/><circle cx="128" cy="128" r="25" fill="url(#g)"/><circle cx="183" cy="73" r="12" fill="#f8fafc"/></svg>`));
  admin.get('/app',async(_req,res)=>res.send(await home()));
  admin.post('/app/profile',async(req,res)=>{
    try{
      const limit=Math.max(1,Math.min(30,Number(req.body.limit)||12));
      const result=await profileSnapshot(String(req.body.username||''),limit);
      const links=result.recent_content_urls.map((url,index)=>`<a href="${esc(url)}" target="_blank" rel="noreferrer">${index+1}. ${esc(url)}</a>`).join('');
      res.send(layout(`@${result.username}`,`<section class="hero"><div class="eyebrow">Profile research</div><h1>@${esc(result.username)}</h1><p class="lead"><a href="${esc(result.profile_url)}" target="_blank" rel="noreferrer">Open profile on Instagram</a></p></section><section class="card"><h2>Recent content links (${result.recent_content_urls.length})</h2><div class="links">${links||'<p class="muted">No public content links were visible.</p>'}</div></section><section class="card"><h2>Visible profile data</h2><div class="result">${esc(result.visible_text)}</div></section><div class="nav"><a class="btn secondary" href="/app">New research</a></div>`));
    }catch(error){res.status(400).send(errorPage(error))}
  });
  admin.post('/app/content',async(req,res)=>{
    try{
      const result=await inspectContent(String(req.body.url||''));
      res.send(layout('Content',`<section class="hero"><div class="eyebrow">Content inspection</div><h1>Post details</h1><p class="lead"><a href="${esc(result.url)}" target="_blank" rel="noreferrer">Open on Instagram</a></p></section><section class="card"><h2>Instagram description</h2><div class="result">${esc(result.description||'No public description was exposed.')}</div></section><section class="card"><h2>Visible content data</h2><div class="result">${esc(result.visible_text)}</div></section><div class="nav"><a class="btn secondary" href="/app">Inspect another</a></div>`));
    }catch(error){res.status(400).send(errorPage(error))}
  });
}
