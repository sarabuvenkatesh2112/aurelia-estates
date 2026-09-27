import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {getDb} from '../lib/db/prisma';
import {communicationCreate,communicationCommand,communicationRead} from '../lib/communications/service';
import {ingestWebhook} from '../lib/communications/webhook';
if(process.env.ALLOW_DB_TESTS!=='true')throw Error('Explicit QA opt-in required');
const db=getDb(),qa=JSON.parse(readFileSync('.cache/phase6-qa.json','utf8')),base='http://localhost:3000';
const config={phoneNumberId:'888800003333',businessAccountId:'888800004444'};
process.env.WHATSAPP_PHONE_NUMBER_ID=config.phoneNumberId;
let threadId='',followId='';
try {
  const login=await fetch(base+'/api/auth/sign-in/email/',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:qa.identities.ADMIN.email,password:qa.password})});
  assert.equal(login.status,200);
  const headers=new Headers({Cookie:login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),Origin:base,Host:'localhost:3000'});
  const lead=await db.lead.findFirstOrThrow({where:{customerId:{not:null},customer:{email:{endsWith:'@example.test'}},deletedAt:null,visits:{some:{}},enquiries:{some:{}}},include:{visits:true,enquiries:true}});
  const baseline=[await db.lead.count(),await db.customer.count(),await db.siteVisit.count(),await db.enquiry.count()];
  await test('CRM links resolve exact customer and requests; duplicate opens and follow-ups reuse records',async()=>{
    const input={leadId:lead.id,visitId:lead.visits[0].id,enquiryId:lead.enquiries[0].id};
    const opened=await communicationCreate(input,headers);threadId=opened.id;
    assert.equal((await communicationCreate(input,headers)).id,threadId);
    let t=await db.whatsAppConversation.findUniqueOrThrow({where:{id:threadId}});
    await communicationCommand(threadId,{action:'link',version:t.version,...input},headers);
    t=await db.whatsAppConversation.findUniqueOrThrow({where:{id:threadId}});
    assert.equal(t.visitId,input.visitId);assert.equal(t.enquiryId,input.enquiryId);assert.equal(t.projectId,lead.projectId);
    const matches=await db.customer.findMany({where:{phone:lead.phone,deletedAt:null},select:{id:true}});
    const expected=matches.length===1&&matches[0].id===lead.customerId?lead.customerId:null;
    assert.equal((await db.whatsAppContact.findUniqueOrThrow({where:{id:t.contactId}})).customerId,expected);
    await assert.rejects(communicationCommand(threadId,{action:'link',version:t.version,leadId:randomUUID()},headers));
    const task={action:'follow_up',title:'Phase 8 isolated QA '+randomUUID(),dueAt:new Date(Date.now()+86400000).toISOString(),notes:'Fictional QA only; no customer outreach.'};
    const first=await communicationCommand(threadId,task,headers) as {id:string};followId=first.id;
    assert.equal((await communicationCommand(threadId,task,headers) as {id:string}).id,followId);
    assert.deepEqual([await db.lead.count(),await db.customer.count(),await db.siteVisit.count(),await db.enquiry.count()],baseline);
  });
  await test('latest/unread, paused drafts, failed receipt ordering, and webhook-before-response are safe',async()=>{
    const phone=lead.phone,mid='phase8-closeout-'+randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
    const envelope=(value:object)=>({object:'whatsapp_business_account',entry:[{id:config.businessAccountId,changes:[{field:'messages',value:{metadata:{phone_number_id:config.phoneNumberId},...value}}]}]});
    await ingestWebhook(envelope({messages:[{id:mid,from:phone.slice(1),timestamp,type:'text',text:{body:'[ISOLATED QA] Please help with my existing visit request.'}}]}),config);
    let t=await db.whatsAppConversation.findUniqueOrThrow({where:{id:threadId}});assert.ok(t.unreadCount>0);
    await communicationCommand(threadId,{action:'read'},headers);assert.equal((await db.whatsAppConversation.findUniqueOrThrow({where:{id:threadId}})).unreadCount,0);
    const list=await communicationRead({q:phone},undefined,headers) as {items:{id:string,messages:{body:string}[]}[]};
    assert.match(list.items.find(v=>v.id===threadId)!.messages[0].body,/ISOLATED QA/);
    await communicationCommand(threadId,{action:'mode',version:t.version,mode:'PAUSED'},headers);
    await assert.rejects(communicationCommand(threadId,{action:'draft'},headers));
    t=await db.whatsAppConversation.findUniqueOrThrow({where:{id:threadId}});
    await communicationCommand(threadId,{action:'mode',version:t.version,mode:'HUMAN'},headers);
    let sends=0;
    const mock={templates:async()=>[],send:async(input:{correlationId:string})=>{
      sends++;
      await ingestWebhook(envelope({statuses:[{id:mid+'-out',recipient_id:phone.slice(1),timestamp,status:'failed',biz_opaque_callback_data:input.correlationId,errors:[{code:131026}]}]}),config);
      return {id:mid+'-out'};
    }};
    const cmd={action:'send',confirm:true,idempotencyKey:randomUUID(),text:'[MOCK ONLY] Existing request acknowledgement.'};
    const sent=await communicationCommand(threadId,cmd,headers,mock) as {id:string,status:string};assert.equal(sent.status,'FAILED');assert.equal(sends,1);
    await ingestWebhook(envelope({statuses:[{id:mid+'-out',recipient_id:phone.slice(1),timestamp,status:'sent'}]}),config);
    assert.equal((await db.whatsAppMessage.findUniqueOrThrow({where:{id:sent.id}})).status,'FAILED');
    await communicationCommand(threadId,cmd,headers,mock);assert.equal(sends,1);
  });
}finally{
  if(followId)await db.followUp.update({where:{id:followId},data:{status:'CANCELLED'}});
  if(threadId)await db.whatsAppConversation.update({where:{id:threadId},data:{mode:'PAUSED',aiDraft:null}});
  await db.$disconnect();
}
