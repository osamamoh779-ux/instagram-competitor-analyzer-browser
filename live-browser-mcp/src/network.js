import dns from 'node:dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';
const allowed = (process.env.ALLOWED_HOSTS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export function publicAddress(value) {
  try { let address=ipaddr.parse(value); if(address.kind()==='ipv6' && address.isIPv4MappedAddress()) address=address.toIPv4Address(); return address.range()==='unicast'; } catch { return false; }
}
export async function validateURL(raw, resolve=dns.lookup) {
  const url=new URL(raw);
  if(!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Error('URL_REJECTED: HTTP(S) URLs without embedded credentials only');
  if(url.port && !['80','443'].includes(url.port)) throw Error('URL_REJECTED: nonstandard network port');
  const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(host==='localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.app.github.dev') || host.endsWith('.github.dev')) throw Error('URL_REJECTED: local or runtime management host');
  if(allowed.length && !allowed.includes(host)) throw Error('URL_REJECTED: host not allowlisted');
  const results=net.isIP(host)?[{address:host}]:await resolve(host,{all:true,verbatim:true});
  if(!results.length || results.some(x=>!publicAddress(x.address))) throw Error('URL_REJECTED: private/reserved/metadata network');
  return url.href;
}
