import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateURL} from './network.js';
export const runtime=path.resolve(process.env.RUNTIME_DIR || 'runtime');
let context, starting, current, sequence=0, tail=Promise.resolve();
const ids=new Map();
export const instanceId=crypto.randomUUID();
export function serialize(fn) {const next=tail.then(fn,fn);tail=next.catch(()=>{});return next;}
function track(page){if(!ids.has(page))ids.set(page,String(++sequence));page.on('close',()=>{ids.delete(page);if(current===page)current=undefined;});}
export async function getContext(){
  if(context)return context;
  if(!starting)starting=(async()=>{
    await fs.mkdir(runtime,{recursive:true,mode:0o700});
    context=await chromium.launchPersistentContext(path.join(runtime,'profile'),{headless:process.env.HEADLESS==='true',viewport:{width:1280,height:800},acceptDownloads:false,serviceWorkers:'block'});
    context.setDefaultTimeout(12000); context.setDefaultNavigationTimeout(30000);
    await context.route('**/*',async route=>{try{await validateURL(route.request().url());await route.continue();}catch{await route.abort('blockedbyclient');}});
    await context.routeWebSocket('**/*',async route=>{try{await validateURL(route.url().replace(/^ws/,'http'));route.connectToServer();}catch{route.close();}});
    context.on('page',track);context.pages().forEach(track);
    context.on('close',()=>{context=undefined;starting=undefined;current=undefined;ids.clear();});
    current=context.pages()[0]||await context.newPage();
    return context;
  })().catch(e=>{starting=undefined;throw e;});
  return starting;
}
export async function page(){await getContext();if(!current||current.isClosed())current=context.pages()[0]||await context.newPage();return current;}
export async function tabs(){await getContext();return Promise.all(context.pages().map(async p=>({id:ids.get(p),url:p.url(),title:await p.title(),active:p===current})));}
export async function switchTab(id){await getContext();const p=context.pages().find(p=>ids.get(p)===id);if(!p)throw Error('TAB_NOT_FOUND');current=p;await p.bringToFront();return tabs();}
export async function newTab(url){const c=await getContext();if(c.pages().length>=15)throw Error('TAB_LIMIT: 15');if(url)await validateURL(url);current=await c.newPage();if(url)await current.goto(url,{waitUntil:'domcontentloaded'});return tabs();}
export async function closeTab(id){await switchTab(id);await current.close();await page();return tabs();}
export async function status(){return {running:!!context,instanceId,persistent:true,headless:process.env.HEADLESS==='true',tabs:context?await tabs():[],liveView:process.env.CODESPACE_NAME?`https://${process.env.CODESPACE_NAME}-6080.app.github.dev/vnc.html`:null};}
export async function loginStatus(){const p=await page();const markers=await p.evaluate(()=>({passwordVisible:[...document.querySelectorAll('input[type=password]')].some(e=>e.getClientRects().length),otpVisible:[...document.querySelectorAll('input[autocomplete=one-time-code],input[name*="verification" i],input[name*="otp" i]')].some(e=>e.getClientRects().length),challenge:/captcha|challenge|checkpoint|two_factor/i.test(location.pathname)||[...document.querySelectorAll('iframe')].some(e=>/captcha|challenges.cloudflare/.test(e.src)),securityText:/verify you are human|checking your browser|unusual traffic|automated (queries|traffic)|security check/i.test(document.body?.innerText||'')}));
  const instagram=p.url().includes('instagram.com')?(await context.cookies('https://www.instagram.com')).some(c=>c.name==='sessionid'&&!!c.value):null;
  return {url:p.url(),requiresHuman:markers.passwordVisible||markers.otpVisible||markers.challenge||markers.securityText,instagramSessionPresent:instagram,...markers};
}
export async function guard(){const s=await loginStatus();if(s.requiresHuman)throw Error('HUMAN_LOGIN_OR_SECURITY_CHECK_REQUIRED: hand control to user in private Live View; do not read, type, screenshot, or automate credentials/security checks');}
export async function save(){await getContext();await fs.mkdir(runtime,{recursive:true,mode:0o700});await context.storageState({path:path.join(runtime,'session.json')});await fs.chmod(path.join(runtime,'session.json'),0o600);return {saved:true,credentialsReturned:false,persistentProfile:true};}
export async function shutdown(){if(context){await save();await context.close();}}
export async function visibleText(max=20000){await guard();const p=await page();return {url:p.url(),title:await p.title(),text:(await p.locator('body').innerText()).slice(0,max)};}
export async function links(max=100){await guard();const p=await page();return p.locator('a[href]').evaluateAll((items,limit)=>items.filter(e=>e.getClientRects().length).slice(0,limit).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,250),url:e.href})),max);}
export async function elements(max=100){await guard();const p=await page();return p.locator('a,button,input,select,textarea,[role=button],[role=link]').evaluateAll((items,limit)=>items.filter(e=>e.getClientRects().length).slice(0,limit).map(e=>({tag:e.tagName.toLowerCase(),role:e.getAttribute('role'),text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,200),id:e.id||undefined,name:e.getAttribute('name')||undefined,type:e.getAttribute('type')||undefined,placeholder:e.getAttribute('placeholder')||undefined,href:e.tagName==='A'?e.href:undefined})),max);}
export function locator(p,args){if(args.selector)return p.locator(args.selector);if(args.role&&args.name)return p.getByRole(args.role,{name:args.name,exact:true});if(args.text)return p.getByText(args.text,{exact:true});throw Error('TARGET_REQUIRED: selector or role+name or exact text');}
export async function ensureSafeInput(l){const info=await l.evaluate(e=>({tag:e.tagName,type:e.getAttribute('type')||'',autocomplete:e.getAttribute('autocomplete')||'',name:(e.getAttribute('name')||'')+' '+(e.getAttribute('id')||'')+' '+(e.getAttribute('placeholder')||'')}));if(!['INPUT','TEXTAREA'].includes(info.tag)||/password|one-time-code|cc-|verification|otp|2fa|token|secret|security.?code/i.test(info.type+' '+info.autocomplete+' '+info.name))throw Error('SENSITIVE_INPUT_REQUIRES_USER');}
