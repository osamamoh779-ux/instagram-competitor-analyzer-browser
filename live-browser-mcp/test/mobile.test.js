import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '../src/mobile.js';

test('understands core Arabic mobile commands',()=>{
 assert.deepEqual(parse('افتح https://example.com'),{kind:'open',url:'https://example.com'});
 assert.deepEqual(parse('تاب جديد https://example.org'),{kind:'newTab',url:'https://example.org'});
 assert.deepEqual(parse('اقرأ الصفحة'),{kind:'read'});
 assert.deepEqual(parse('اضغط على About'),{kind:'click',text:'About'});
 assert.deepEqual(parse('سكرين شوت'),{kind:'shot'});
});

test('unknown text is not executed as a browser action',()=>{
 assert.deepEqual(parse('نفذ أي شيء'),{kind:'unknown'});
});
