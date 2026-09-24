import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHmac,randomUUID} from 'node:crypto';
import {getDb} from '../lib/db/prisma';
import {requireStaff} from '../lib/admin/auth';
import {communicationRead,communicationCommand,preparedText,threadFor} from '../lib/communications/service';
import {ingestWebhook,matchingContext} from '../lib/communications/webhook';
import {MetaCloudProvider,TransportError,type WhatsAppProvider} from '../lib/communications/provider';
import {draftReply} from '../lib/communications/draft';
import {GET,POST} from '../app/api/whatsapp/webhook/route';
if(process.env.ALLOW_DB_TESTS!=='true')throw Error('Explicit QA opt-in required');
const db=getDb(),base='http://localhost:3000',qa=JSON.parse(readFileSync('.cache/phase6-qa.json','utf8'));
const config={phoneNumberId:'888800001111',businessAccountId:'888800002222'};
let phone='+919'+String(Date.now()).slice(-9);const marker='phase8-'+randomUUID();
const headers:Record<string,Headers>={};let id='',sends=0;
const mock:WhatsAppProvider={send:async()=>{sends++;return{id:marker+'-out-'+sends};},templates:async()=>[]};
const payload=(body:string,mid=marker,type='text')=>({object:'whatsapp_business_account',entry:[{id:config.businessAccountId,changes:[{field:'messages',value:{metadata:{phone_number_id:config.phoneNumberId},contacts:[{wa_id:phone.slice(1),profile:{name:'Phase 8 isolated MOCK transport QA'}}],messages:[{id:mid,from:phone.slice(1),timestamp:String(Math.floor(Date.now()/1000)),type,text:{body}}]}}]}]});
const receipt=(wamid:string,status:string,callback?:string)=>({object:'whatsapp_business_account',entry:[{id:config.businessAccountId,changes:[{field:'messages',value:{metadata:{phone_number_id:config.phoneNumberId},statuses:[{id:wamid,recipient_id:phone.slice(1),timestamp:String(Math.floor(Date.now()/1000)),status,...(callback?{biz_opaque_callback_data:callback}:{})}]}}]}]});
const businessBefore={leads:await db.lead.count(),visits:await db.siteVisit.count(),enquiries:await db.enquiry.count()};
if(process.env.PHASE8_RECHECK_OUTBOUND==='true'){
  const existingQa=JSON.parse(readFileSync('.cache/phase8-qa.json','utf8'));id=existingQa.id;phone=existingQa.phone;
  await db.whatsAppConversation.update({where:{id},data:{mode:'HUMAN',lastInboundAt:new Date(),aiDraft:null,contact:{update:{consent:'UNKNOWN'}}}});
}
try {
  for(const role of ['SUPER_ADMIN','ADMIN','SALES_MANAGER','SALES_AGENT','AGENT_B','VIEWER','CUSTOMER']){
    const r=await fetch(base+'/api/auth/sign-in/email/',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:qa.identities[role].email,password:qa.password})});assert.equal(r.status,200);
    headers[role]=new Headers({Cookie:r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),host:'localhost:3000',origin:base});
  }
  await test('signed webhook routes, duplicate inbound, unknown types and minimal retention',async()=>{
    process.env.META_APP_SECRET='phase8-test-secret-not-live';process.env.WHATSAPP_VERIFY_TOKEN='phase8-test-verification-not-live';process.env.WHATSAPP_PHONE_NUMBER_ID=config.phoneNumberId;process.env.WHATSAPP_BUSINESS_ACCOUNT_ID=config.businessAccountId;
    assert.equal((await GET(new Request(base+'/api/whatsapp/webhook/?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1'))).status,403);
    assert.equal(await(await GET(new Request(base+'/api/whatsapp/webhook/?hub.mode=subscribe&hub.verify_token=phase8-test-verification-not-live&hub.challenge=123'))).text(),'123');
    const raw=JSON.stringify(payload('[MOCK TRANSPORT QA] Show available 3 BHK properties under 2 Cr.'));
    assert.equal((await POST(new Request(base,{method:'POST',body:raw}))).status,401);
    const signature='sha256='+createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex');
    const send=()=>POST(new Request(base,{method:'POST',body:raw,headers:{'x-hub-signature-256':signature}}));
    const results=await Promise.all([send(),send()]);assert.ok(results.every(r=>r.status===200));
    const message=await db.whatsAppMessage.findUniqueOrThrow({where:{providerMessageId:marker}});id=message.conversationId;
    assert.equal(await db.whatsAppMessage.count({where:{providerMessageId:marker}}),1);
    await ingestWebhook(payload('ignored',marker+'-image','image'),config);
    const unknown=await db.whatsAppMessage.findUniqueOrThrow({where:{providerMessageId:marker+'-image'}});assert.equal(unknown.body,null);
  });
  await test('staff roles and cross-agent/customer/guest boundaries',async()=>{
    const a=await requireStaff(headers.SALES_AGENT),b=await requireStaff(headers.AGENT_B);
    await db.whatsAppConversation.update({where:{id},data:{agentId:a.id}});
    for(const role of ['SUPER_ADMIN','ADMIN','SALES_MANAGER','SALES_AGENT','VIEWER'])assert.ok('thread' in await communicationRead({},id,headers[role]));
    await assert.rejects(communicationRead({},id,headers.AGENT_B));await assert.rejects(communicationRead({},id,headers.CUSTOMER));await assert.rejects(communicationRead({},id,new Headers()));
    await assert.rejects(communicationCommand(id,{action:'read'},headers.VIEWER));await assert.rejects(communicationCommand(id,{action:'read'},headers.AGENT_B));
    const scoped=await communicationRead({},undefined,headers.AGENT_B);assert.ok('items' in scoped&&!(scoped as {items:{id:unknown}[]}).items.some(t=>t.id===id));assert.notEqual(a.id,b.id);
    for(const role of ['CUSTOMER','VIEWER','AGENT_B']){const r=await fetch(base+'/api/admin/communications/'+id+'/',{method:'POST',headers:{...Object.fromEntries(headers[role]),'Content-Type':'application/json'},body:JSON.stringify({action:'read'})});assert.ok([403,404].includes(r.status));}
    assert.equal((await fetch(base+'/api/admin/communications/')).status,401);
  });
  await test('mock outbound is idempotent; accepted is not delivered; out-of-order receipts and history',async()=>{
    const input={action:'send',idempotencyKey:randomUUID(),text:'[MOCK TRANSPORT QA] Request received, not confirmed.',confirm:true};
    const results=await Promise.all([communicationCommand(id,input,headers.ADMIN,mock),communicationCommand(id,input,headers.ADMIN,mock)]);
    assert.equal(sends,1);const row=await db.whatsAppMessage.findUniqueOrThrow({where:{idempotencyKey:input.idempotencyKey}});assert.equal(row.status,'ACCEPTED');assert.equal(results.length,2);
    const deliveredRead=receipt(row.providerMessageId!,'read');
    await ingestWebhook(deliveredRead,config);await ingestWebhook(receipt(row.providerMessageId!,'delivered'),config);await ingestWebhook(deliveredRead,config);
    assert.equal((await db.whatsAppMessage.findUniqueOrThrow({where:{id:row.id}})).status,'READ');
    assert.equal(await db.whatsAppStatusHistory.count({where:{messageId:row.id}}),4);
    const history=await db.whatsAppStatusHistory.findFirstOrThrow({where:{messageId:row.id}});await assert.rejects(db.whatsAppStatusHistory.update({where:{id:history.id},data:{status:'FAILED'}}));
    const uncertain={...mock,send:async()=>{sends++;throw new TransportError('TRANSPORT_UNCERTAIN',true);}};const attempt={...input,idempotencyKey:randomUUID()};await communicationCommand(id,attempt,headers.ADMIN,uncertain);await communicationCommand(id,attempt,headers.ADMIN,uncertain);assert.equal(sends,2);
  });
  await test('service window, approved utility templates, recorded consent and STOP block sends',async()=>{
    await db.whatsAppConversation.update({where:{id},data:{lastInboundAt:new Date(Date.now()-86400001)}});
    const input={action:'send',idempotencyKey:randomUUID(),text:'Hello',confirm:true};await assert.rejects(communicationCommand(id,input,headers.ADMIN,mock));
    const template=await db.whatsAppTemplate.create({data:{id:marker,name:'phase8_mock_only',language:'en',category:'UTILITY',status:'APPROVED',body:'Hello',parameterCount:0,supported:true}});
    await assert.rejects(communicationCommand(id,{...input,templateId:template.id},headers.ADMIN,mock));
    let t=await db.whatsAppConversation.findUniqueOrThrow({where:{id}});await communicationCommand(id,{action:'consent',version:t.version,consent:'OPTED_IN',evidence:'Fictional isolated transport test only'},headers.ADMIN);
    await communicationCommand(id,{...input,templateId:template.id},headers.ADMIN,mock);
    await db.whatsAppTemplate.delete({where:{id:template.id}});
    await ingestWebhook(payload('STOP',marker+'-stop'),config);await assert.rejects(communicationCommand(id,{...input,idempotencyKey:randomUUID()},headers.ADMIN,mock));
    t=await db.whatsAppConversation.findUniqueOrThrow({where:{id}});assert.equal(t.mode,'PAUSED');
  });
  await test('AI drafts are session-free and reviewed; human takeover discards an in-flight reply',async()=>{
    let t=await db.whatsAppConversation.findUniqueOrThrow({where:{id}});await communicationCommand(id,{action:'consent',version:t.version,consent:'OPTED_IN',evidence:'Fictional QA resume'},headers.ADMIN);t=await db.whatsAppConversation.findUniqueOrThrow({where:{id}});await communicationCommand(id,{action:'mode',mode:'AI_ASSISTED',version:t.version},headers.ADMIN);
    const staff=await requireStaff(headers.ADMIN);
    await draftReply(id,staff,async options=>{assert.equal(options.headers.get('cookie'),null);options.emit({type:'text',text:'Please review the verified catalogue. No request has been submitted.'});return{content:'',references:[]};});
    assert.ok((await db.whatsAppConversation.findUniqueOrThrow({where:{id}})).aiDraft);const before=sends;
    await assert.rejects(draftReply(id,staff,async options=>{await ingestWebhook(payload('Talk to a person.',marker+'-human'),config);options.emit({type:'text',text:'Discard this outdated draft.'});return{content:'',references:[]};}));
    t=await db.whatsAppConversation.findUniqueOrThrow({where:{id}});assert.equal(t.mode,'HUMAN');assert.equal(t.aiDraft,null);assert.equal(t.aiLeaseUntil,null);assert.equal(sends,before);
  });
  await test('exact CRM matching and verified visit/enquiry messages preserve business records',async()=>{
    const lead=await db.lead.findFirstOrThrow({where:{email:'phase7-browser@example.test'},include:{visits:true,enquiries:true}});
    const context=await matchingContext(db,lead.phone);const matches=await db.lead.count({where:{phone:lead.phone,deletedAt:null}});assert.equal(context.leadId,matches===1?lead.id:null);
    const thread=await threadFor(db,await requireStaff(headers.ADMIN),id);
    assert.match(preparedText({...thread,project:{id:lead.projectId,name:'QA project',slug:'the-eastern-grove'},visit:lead.visits[0]},'VISIT_REQUEST_RECEIVED'),/not an appointment confirmation/);
    assert.throws(()=>preparedText({...thread,visit:lead.visits[0]},'VISIT_CONFIRMED'));
    assert.match(preparedText({...thread,enquiry:lead.enquiries[0]},'ENQUIRY_RECEIVED'),/received your enquiry/);
    assert.deepEqual({leads:await db.lead.count(),visits:await db.siteVisit.count(),enquiries:await db.enquiry.count()},businessBefore);
  });
  await test('official adapter contract and failure classification use mock transport only',async()=>{
    const c={token:'mock-only',phoneNumberId:'123',businessAccountId:'456',verifyToken:'mock',appSecret:'mock',version:'v25.0'};
    const provider=new MetaCloudProvider(async(_url,init)=>{const body=JSON.parse(init?.body instanceof Uint8Array?new TextDecoder().decode(init.body):(init?.body as string??''));assert.equal(body.messaging_product,'whatsapp');assert.equal(body.to,'919876543210');return Response.json({messages:[{id:'mock-wamid'}]});},c);
    assert.deepEqual(await provider.send({to:'+919876543210',correlationId:randomUUID(),text:'QA'}),{id:'mock-wamid'});
    const bad=new MetaCloudProvider(async()=>Response.json({error:{code:190,message:'private provider details'}},{status:401}),c);
    await assert.rejects(bad.send({to:'+919876543210',correlationId:randomUUID(),text:'QA'}),(e)=>e instanceof TransportError&&e.code==='META_190'&&!e.uncertain&&!e.message.includes('private'));
  });
  if(process.env.PHASE8_RECHECK_OUTBOUND!=='true')writeFileSync('.cache/phase8-qa.json',JSON.stringify({id,phone,marker,businessBefore,isolated:true},null,2));
}finally{
  if(id)await db.whatsAppConversation.update({where:{id},data:{mode:'PAUSED',aiDraft:null}});
  await db.whatsAppTemplate.deleteMany({where:{id:marker}});
  await db.$disconnect();
}
