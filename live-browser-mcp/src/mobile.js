import crypto from 'node:crypto';
import * as b from './browser.js';
import {validateURL} from './network.js';

const cut=(v,n=20000)=>String(v??'').slice(0,n);
export function parse(raw){const t=cut(raw).trim(),u=t.match(/https?:\/\/[^\s]+/i)?.[0];
 if(!t||/^(مساعدة|help|الأوامر|الاوامر)$/i.test(t))return{kind:'help'};
 if(u&&/(تاب جديد|تبويب جديد|new tab)/i.test(t))return{kind:'newTab',url:u};
 if(u&&/(افتح|اذهب|روح|open|go to)/i.test(t))return{kind:'open',url:u};
 if(/^(اقرأ|اقرا|حلل|read|نص الصفحة)/i.test(t))return{kind:'read'};
 if(/^(سكرين|صورة|screenshot)/i.test(t))return{kind:'shot'};
 if(/^(الحالة|حالة المتصفح|status)/i.test(t))return{kind:'status'};
 if(/^(التابات|التبويبات|tabs)/i.test(t))return{kind:'tabs'};
 if(/^(الروابط|links)/i.test(t))return{kind:'links'};
 if(/^(العناصر|elements)/i.test(t))return{kind:'elements'};
 if(/^(ارجع|رجوع|back)/i.test(t))return{kind:'back'};
 if(/^(تحديث|إعادة تحميل|اعادة تحميل|reload)/i.test(t))return{kind:'reload'};
 if(/^(انزل|تحت|scroll down)/i.test(t))return{kind:'scroll',y:700};
 if(/^(اطلع|فوق|scroll up)/i.test(t))return{kind:'scroll',y:-700};
 if(/^(احفظ الجلسة|حفظ الجلسة|save session)/i.test(t))return{kind:'save'};
 const m=t.match(/^(?:اضغط|click)\s+(?:على\s+)?["“]?(.+?)["”]?$/i);if(m)return{kind:'click',text:m[1].trim()};return{kind:'unknown'};}

async function run(raw){const c=parse(raw);return b.serialize(async()=>{
 if(c.kind==='help')return{message:'الأوامر: افتح https://example.com، اقرأ الصفحة، اضغط اسم العنصر، سكرين شوت، التابات، الروابط، العناصر، ارجع، تحديث، انزل، اطلع، احفظ الجلسة.'};
 if(c.kind==='open'){const p=await b.page();await p.goto(await validateURL(c.url),{waitUntil:'domcontentloaded'});return{message:'تم فتح الصفحة.',data:await b.loginStatus()};}
 if(c.kind==='newTab')return{message:'تم فتح تبويب جديد.',data:await b.newTab(c.url)};
 if(c.kind==='read')return{message:'المحتوى الظاهر',data:{...await b.visibleText(),links:await b.links(50)}};
 if(c.kind==='shot'){await b.guard();const p=await b.page();return{message:'صورة الشاشة الحالية',image:'data:image/png;base64,'+(await p.screenshot()).toString('base64'),data:{url:p.url(),title:await p.title()}};}
 if(c.kind==='status')return{message:'حالة المتصفح',data:await b.status()};
 if(c.kind==='tabs')return{message:'التبويبات',data:await b.tabs()};
 if(c.kind==='links')return{message:'الروابط الظاهرة',data:await b.links(100)};
 if(c.kind==='elements')return{message:'العناصر الظاهرة',data:await b.elements(100)};
 if(c.kind==='back'){await(await b.page()).goBack({waitUntil:'domcontentloaded'});return{message:'تم الرجوع.',data:await b.loginStatus()};}
 if(c.kind==='reload'){await b.guard();await(await b.page()).reload({waitUntil:'domcontentloaded'});return{message:'تم تحديث الصفحة.',data:await b.loginStatus()};}
 if(c.kind==='scroll'){await b.guard();await(await b.page()).mouse.wheel(0,c.y);return{message:c.y>0?'تم التمرير لأسفل.':'تم التمرير لأعلى.'};}
 if(c.kind==='save')return{message:'تم حفظ الجلسة داخل بيئة التشغيل.',data:await b.save()};
 if(c.kind==='click'){await b.guard();const l=(await b.page()).getByText(c.text,{exact:true});if(await l.count()!==1)throw Error('العنصر غير موجود أو متكرر. اكتب «العناصر» لمعرفة الاسم الظاهر بدقة.');await l.click();return{message:`تم الضغط على: ${c.text}`,data:await b.loginStatus()};}
 throw Error('الأمر غير معروف. اكتب «مساعدة».');});}

function page(csrf){const live=process.env.CODESPACE_NAME?`https://${process.env.CODESPACE_NAME}-6080.app.github.dev/vnc.html?autoconnect=1&resize=scale`:'#';return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080c16"><title>Live Browser</title><style>
*{box-sizing:border-box}body{margin:0;background:#080c16;color:#f8fafc;font:16px system-ui,-apple-system,sans-serif;min-height:100dvh}.app{max-width:760px;margin:auto;min-height:100dvh;display:flex;flex-direction:column}.head{position:sticky;top:0;z-index:2;padding:calc(14px + env(safe-area-inset-top)) 14px 12px;background:#080c16eF;border-bottom:1px solid #263047;backdrop-filter:blur(14px)}.brand{display:flex;justify-content:space-between;align-items:center}.brand h1{font-size:20px;margin:0}.dot{width:10px;height:10px;border-radius:50%;background:#32d583;box-shadow:0 0 14px #32d583}.quick{display:flex;gap:8px;margin-top:12px;overflow:auto}.quick button,.live{white-space:nowrap;border:1px solid #34405a;background:#141c2d;color:#fff;border-radius:12px;padding:9px 12px;text-decoration:none;font:inherit}.live{background:#6d5dfc;border-color:#6d5dfc}.chat{flex:1;padding:15px;display:flex;flex-direction:column;gap:12px}.msg{max-width:94%;padding:12px 14px;border-radius:17px;line-height:1.55;overflow-wrap:anywhere}.user{align-self:flex-start;background:#6d5dfc}.bot{align-self:flex-end;background:#151e30;border:1px solid #29344b}.msg pre{white-space:pre-wrap;margin:8px 0 0;font:13px ui-monospace,monospace;max-height:45vh;overflow:auto}.msg img{width:100%;border-radius:12px;margin-top:10px}.composer{position:sticky;bottom:0;padding:11px 11px calc(11px + env(safe-area-inset-bottom));background:#080c16f2;border-top:1px solid #263047;display:flex;gap:8px}.composer input{flex:1;min-width:0;background:#111827;border:1px solid #34405a;color:#fff;border-radius:15px;padding:14px;font:inherit}.composer button{border:0;border-radius:14px;padding:0 18px;background:#6d5dfc;color:#fff;font:bold 16px inherit}.muted{color:#aab3c7;font-size:13px}.busy{opacity:.55;pointer-events:none}</style></head><body><main class="app"><header class="head"><div class="brand"><h1>Live Browser</h1><span class="dot"></span></div><div class="quick"><button data-cmd="الحالة">الحالة</button><button data-cmd="اقرأ الصفحة">اقرأ</button><button data-cmd="سكرين شوت">صورة</button><button data-cmd="التابات">التبويبات</button><a class="live" href="${live}" target="_blank" rel="noreferrer">المتصفح المباشر</a></div></header><section class="chat" id="chat"><div class="msg bot"><b>جاهز.</b><br>اكتب أمرًا بالعربي. تسجيل الدخول وكلمات السر يتمان يدويًا من «المتصفح المباشر» فقط.<div class="muted">مثال: افتح https://example.com</div></div></section><form class="composer" id="form"><input id="input" autocomplete="off" placeholder="اكتب أمرًا…"><button>إرسال</button></form></main><script nonce="${csrf}">const chat=document.querySelector('#chat'),form=document.querySelector('#form'),input=document.querySelector('#input');function add(type,text,data,image){const d=document.createElement('div');d.className='msg '+type;const x=document.createElement('div');x.textContent=text;d.append(x);if(data!==undefined){const p=document.createElement('pre');p.textContent=typeof data==='string'?data:JSON.stringify(data,null,2);d.append(p)}if(image){const i=document.createElement('img');i.src=image;i.alt='Browser screenshot';d.append(i)}chat.append(d);d.scrollIntoView({behavior:'smooth',block:'end'})}async function send(c){c=c.trim();if(!c)return;add('user',c);input.value='';document.body.classList.add('busy');try{const r=await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json','x-mobile-csrf':'${csrf}'},body:JSON.stringify({command:c})});const j=await r.json();if(!r.ok)throw Error(j.error||'فشل الطلب');add('bot',j.message||'تم',j.data,j.image)}catch(e){add('bot','خطأ: '+e.message)}finally{document.body.classList.remove('busy');input.focus()}}form.addEventListener('submit',e=>{e.preventDefault();send(input.value)});document.querySelectorAll('[data-cmd]').forEach(x=>x.addEventListener('click',()=>send(x.dataset.cmd)));</script></body></html>`;}

export function installMobile(app){const sessions=new Map();app.get(['/','/app'],(_q,r)=>{const csrf=crypto.randomBytes(18).toString('base64url');sessions.set(csrf,Date.now()+12*60*60*1000);r.set('Content-Security-Policy',`default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'nonce-${csrf}'; connect-src 'self'; frame-ancestors 'none'`).send(page(csrf));});app.post('/api/command',async(q,r)=>{const key=q.get('x-mobile-csrf'),expiry=sessions.get(key);if(!expiry||expiry<Date.now())return r.status(403).json({error:'انتهت جلسة الواجهة. أعد فتح الصفحة.'});try{return r.json(await run(q.body?.command));}catch(e){return r.status(400).json({error:cut(e.message,1000)});}});}
