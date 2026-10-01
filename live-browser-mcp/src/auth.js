import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const random=()=>crypto.randomBytes(32).toString('base64url');
const hash=v=>crypto.createHash('sha256').update(v).digest('base64url');
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function installAuth(app,privateApp,{base,consentBase}){
 const file=path.resolve('runtime/oauth.json');let db={clients:{},tokens:{},refresh:{}};
 try{db=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const pending=new Map(),codes=new Map();let persistTail=Promise.resolve();
 const persist=()=>{const data=JSON.stringify(db);persistTail=persistTail.then(async()=>{await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.writeFile(file+'.tmp',data,{mode:0o600});await fs.rename(file+'.tmp',file);});return persistTail;};
 const resource=base+'/mcp',scope='browser:control';
 const meta={issuer:base,authorization_endpoint:base+'/authorize',token_endpoint:base+'/token',registration_endpoint:base+'/register',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:[scope]};
 app.get('/.well-known/oauth-authorization-server',(_q,r)=>r.json(meta));
 const resourceMeta={resource,authorization_servers:[base],scopes_supported:[scope],bearer_methods_supported:['header']};
 app.get(['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'],(_q,r)=>r.json(resourceMeta));
 const validRedirect=raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&['chatgpt.com','chat.openai.com'].includes(u.hostname)&&!u.username&&!u.password || process.env.ALLOW_LOCAL_OAUTH_TEST==='true'&&u.protocol==='http:'&&u.hostname==='127.0.0.1';}catch{return false;}};
 let requests=0,windowEnd=Date.now()+600000;
 app.post('/register',async(q,r)=>{if(Date.now()>windowEnd){requests=0;windowEnd=Date.now()+600000;}if(++requests>100)return r.status(429).json({error:'rate_limited'});
   const redirects=q.body.redirect_uris;
   if(!Array.isArray(redirects)||!redirects.length||redirects.length>5||!redirects.every(validRedirect))return r.status(400).json({error:'invalid_redirect_uri'});
   if(q.body.token_endpoint_auth_method&&q.body.token_endpoint_auth_method!=='none')return r.status(400).json({error:'invalid_client_metadata'});
   const id=random();const client={client_id:id,client_name:String(q.body.client_name||'ChatGPT').slice(0,100),redirect_uris:redirects,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']};
   db.clients[id]=client;await persist();r.status(201).json(client);
 });
 app.get('/authorize',(q,r)=>{const a=q.query,c=db.clients[a.client_id];
   if(!c||!c.redirect_uris.includes(a.redirect_uri)||a.response_type!=='code'||a.code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(a.code_challenge||'')||(a.resource&&a.resource!==resource)||(a.scope&&a.scope!==scope))return r.status(400).send('Invalid OAuth authorization request');
   const id=random();pending.set(id,{clientId:a.client_id,redirect:a.redirect_uri,state:a.state||'',challenge:a.code_challenge,csrf:random(),expires:Date.now()+600000});
   r.redirect(consentBase+'/consent?id='+id);
 });
 privateApp.get('/consent',(q,r)=>{const p=pending.get(q.query.id);if(!p||p.expires<Date.now())return r.status(400).send('Authorization expired. Reconnect from ChatGPT.');
   r.set('Cache-Control','no-store').set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'").send(`<!doctype html><meta charset="utf-8"><title>Connect Live Browser MCP</title><style>body{font:18px system-ui;max-width:650px;margin:70px auto;padding:24px}button{font:inherit;padding:12px 22px;margin:10px}</style><h1>Connect Live Browser MCP</h1><p>Allow <b>${escape(db.clients[p.clientId].client_name)}</b> to control this Codespace's dedicated browser, including pages visible to an authenticated session. Passwords and security checks remain manual.</p><p>GitHub private port access protects this approval page. Authorize only the connection you started.</p><form method="post" action="/consent"><input type="hidden" name="id" value="${escape(q.query.id)}"><input type="hidden" name="csrf" value="${p.csrf}"><button name="decision" value="allow">Allow browser access</button><button name="decision" value="deny">Deny</button></form>`);
 });
 privateApp.post('/consent',(q,r)=>{const p=pending.get(q.body.id);if(!p||p.expires<Date.now()||q.body.csrf!==p.csrf)return r.status(400).send('Invalid or expired consent');pending.delete(q.body.id);
   const redirect=new URL(p.redirect);if(p.state)redirect.searchParams.set('state',p.state);
   if(q.body.decision!=='allow'){redirect.searchParams.set('error','access_denied');return r.redirect(redirect.href);}
   const code=random();codes.set(hash(code),{...p,expires:Date.now()+120000});redirect.searchParams.set('code',code);r.redirect(redirect.href);
 });
 const issue=async(clientId)=>{const token=random(),refresh=random();db.tokens[hash(token)]={clientId,resource,scope,expires:Date.now()+3600000};db.refresh[hash(refresh)]={clientId,resource,scope,expires:Date.now()+30*86400000};await persist();return {access_token:token,token_type:'Bearer',expires_in:3600,refresh_token:refresh,scope};};
 app.post('/token',async(q,r)=>{r.set('Cache-Control','no-store');const a=q.body;if(a.resource&&a.resource!==resource)return r.status(400).json({error:'invalid_target'});
   if(a.grant_type==='authorization_code'){const k=hash(a.code||''),p=codes.get(k);if(!p||p.expires<Date.now()||p.clientId!==a.client_id||p.redirect!==a.redirect_uri||!/^[A-Za-z0-9._~-]{43,128}$/.test(a.code_verifier||'')||hash(a.code_verifier)!==p.challenge)return r.status(400).json({error:'invalid_grant'});codes.delete(k);return r.json(await issue(p.clientId));}
   if(a.grant_type==='refresh_token'){const k=hash(a.refresh_token||''),p=db.refresh[k];if(!p||p.expires<Date.now()||p.clientId!==a.client_id)return r.status(400).json({error:'invalid_grant'});delete db.refresh[k];return r.json(await issue(p.clientId));}
   r.status(400).json({error:'unsupported_grant_type'});
 });
 return (q,r,next)=>{const header=q.headers.authorization||'',token=header.startsWith('Bearer ')?header.slice(7):'',p=db.tokens[hash(token)];if(!p||p.expires<Date.now()||p.resource!==resource)return r.status(401).set('WWW-Authenticate',`Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp", scope="${scope}"`).json({error:'authentication_required'});next();};
}
