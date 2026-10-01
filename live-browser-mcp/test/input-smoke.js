import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {makeServer} from '../src/tools.js';
import * as b from '../src/browser.js';
import assert from 'node:assert/strict';
const p=await b.page();await p.setContent('<h1>Local browser test fixture</h1><input id="name"><select id="choice"><option value="a">Alpha</option><option value="b">Beta</option></select>');
const [ct,st]=InMemoryTransport.createLinkedPair();const server=makeServer();await server.connect(st);const client=new Client({name:'input-smoke',version:'1'});await client.connect(ct);
for(const [name,args] of [['type_text',{selector:'#name',value:'Usama browser test'}],['press_key',{selector:'#name',key:'Home'}],['select_option',{selector:'#choice',value:'b'}]]){const result=await client.callTool({name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));console.log('PASS: '+name);}
assert.equal(await p.locator('#name').inputValue(),'Usama browser test');assert.equal(await p.locator('#choice').inputValue(),'b');
await p.setContent('<input type="password">');for(const name of ['get_page_text','screenshot','click','type_text']){const args=name==='click'?{selector:'input'}:name==='type_text'?{selector:'input',value:'NOT_A_PASSWORD'}:{};const result=await client.callTool({name,arguments:args});assert.ok(result.isError);console.log('PASS: credentials page blocked for '+name);}
await client.close();await server.close();await b.shutdown();
