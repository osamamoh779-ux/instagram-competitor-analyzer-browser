// Run only inside the Codespace. Does not print tokens, cookies or screenshots.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=process.env.PUBLIC_BASE_URL||'http://127.0.0.1:3100',privateBase='http://127.0.0.1:3101';
const local='http://127.0.0.1:3100';
const registration=await fetch(local+'/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Local verification',redirect_uris:['http://127.0.0.1:3999/callback']})}).then(r=>r.json());
assert.ok(registration.client_id,'local OAuth tests need ALLOW_LOCAL_OAUTH_TEST=true during smoke only');
const verifier=crypto.randomBytes(32).toString('base64url'),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
const query=new URLSearchParams({client_id:registration.client_id,redirect_uri:'http://127.0.0.1:3999/callback',response_type:'code',code_challenge:challenge,code_challenge_method:'S256',resource:base+'/mcp'});
const auth=await fetch(local+'/authorize?'+query,{redirect:'manual'});const id=new URL(auth.headers.get('location')).searchParams.get('id');
const consent=await fetch(privateBase+'/consent?id='+id).then(r=>r.text()),csrf=consent.match(/name="csrf" value="([^"]+)"/)[1];
const approved=await fetch(privateBase+'/consent',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id,csrf,decision:'allow'}),redirect:'manual'});
const code=new URL(approved.headers.get('location')).searchParams.get('code');
const token=await fetch(local+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:registration.client_id,redirect_uri:'http://127.0.0.1:3999/callback',code_verifier:verifier,code,resource:base+'/mcp'})}).then(r=>r.json());assert.ok(token.access_token);
assert.equal((await fetch(local+'/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
const client=new Client({name:'smoke',version:'1.0.0'});await client.connect(new StreamableHTTPClientTransport(new URL(local+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+token.access_token}}}));
const tools=await client.listTools();assert.equal(tools.tools.length,25);console.log('PASS: OAuth PKCE; unauthenticated requests rejected; 25 tools discovered');
async function call(name,args={}){const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,name+': '+JSON.stringify(r));console.log('PASS: '+name);return r;}
const decode=r=>JSON.parse(r.content[0].text);
const before=decode(await call('browser_status'));
await call('open_url',{url:'https://example.com'});assert.ok(decode(await call('read_page')).text.includes('documentation')); await call('get_page_text');await call('get_current_url');await call('get_page_title');await call('inspect_page_links');await call('extract_links');await call('inspect_visible_elements');await call('extract_visible_data');await call('wait_for_element',{role:'link',name:'Learn more'});await call('scroll');await call('screenshot');
const original=decode(await call('list_tabs')).find(x=>x.active).id;
await call('click',{role:'link',name:'Learn more'});await call('go_back');await call('reload_page');
const opened=decode(await call('open_new_tab',{url:'https://example.org'})).find(x=>x.active).id;
await call('switch_tab',{id:original});assert.ok(decode(await call('get_current_url')).url.includes('example.com'));await call('close_tab',{id:opened});await call('save_browser_session');await call('browser_login_status');
const after=decode(await call('browser_status'));assert.equal(after.instanceId,before.instanceId);console.log('PASS: persistent browser instance and active tab state across MCP requests');
const bad=await client.callTool({name:'open_url',arguments:{url:'http://127.0.0.1:3100'}});assert.ok(bad.isError);console.log('PASS: runtime/network URL rejected');
await client.close();
