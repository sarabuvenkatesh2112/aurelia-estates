import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {canonicalWhatsAppPhone,commandSchema,communicationText,inboundIntent,serviceWindow,nextStatus,mayAccess,mayWrite} from '../lib/communications/contracts';
import {validSignature,verifyChallenge} from '../lib/communications/signature';
await test('canonical phones, safe Unicode and strict command boundaries',()=>{
  for(const value of ['9876543210','+919876543210','+91 9876543210','919876543210'])assert.equal(canonicalWhatsAppPhone(value),'+919876543210');
  for(const value of ['123','+19876543210','9999999999'])assert.throws(()=>canonicalWhatsAppPhone(value));
  assert.equal(communicationText.parse('  नमस्ते Aurelia  '),'नमस्ते Aurelia');
  for(const value of ['', 'a'.repeat(2001),'password=not-for-storage','hello\u0000'])assert.equal(communicationText.safeParse(value).success,false);
  assert.equal(commandSchema.safeParse({action:'send',text:'Hi',confirm:false,idempotencyKey:crypto.randomUUID()}).success,false);
  assert.equal(commandSchema.safeParse({action:'send',text:'Hi',confirm:true,idempotencyKey:crypto.randomUUID(),phone:'+919876543210'}).success,false);
});
await test('webhook challenge and constant-time raw-body signature validation',()=>{
  const token='fictional-test-token',raw=Buffer.from('{"text":"नमस्ते"}'),secret='fictional-test-secret';
  const signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  assert.ok(validSignature(raw,signature,secret));assert.equal(validSignature(Buffer.from('{}'),signature,secret),false);assert.equal(validSignature(raw,'sha256=bad',secret),false);assert.equal(validSignature(raw,signature,''),false);
  const p=new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':token,'hub.challenge':'12345'});assert.equal(verifyChallenge(p,token),'12345');assert.equal(verifyChallenge(p,'wrong'),null);
});
await test('five-role policy, exact 24-hour window, opt-out and monotonic delivery states',()=>{
  for(const role of ['SUPER_ADMIN','ADMIN','SALES_MANAGER','SALES_AGENT'] as const)assert.ok(mayWrite(role));assert.equal(mayWrite('VIEWER'),false);
  assert.equal(mayAccess('SALES_AGENT','A','B'),false);assert.equal(mayAccess('SALES_AGENT','A','A'),true);assert.equal(mayAccess('ADMIN','A','B'),true);
  const now=new Date();assert.equal(serviceWindow(new Date(now.getTime()-86400000),now),false);assert.ok(serviceWindow(new Date(now.getTime()-86399000),now));
  assert.equal(inboundIntent('STOP'),'OPT_OUT');assert.equal(inboundIntent('Talk to a person.'),'HUMAN');assert.equal(inboundIntent('Call me'),'HUMAN');
  assert.equal(nextStatus('READ','SENT'),'READ');assert.equal(nextStatus('DELIVERED','FAILED'),'DELIVERED');assert.equal(nextStatus('ACCEPTED','DELIVERED'),'DELIVERED');assert.equal(nextStatus('SENT','FAILED'),'FAILED');
});
