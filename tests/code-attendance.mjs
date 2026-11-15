import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.UI_TEST_BASE_URL||'http://localhost:4100';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],proxy:base.startsWith('https:')&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
const event={id:'11111111-1111-4111-8111-111111111111',title:'فعالية سابقة للاختبار',description:'تفاصيل',location:'الكلية',start_at:new Date(Date.now()-172800000).toISOString(),end_at:new Date(Date.now()-86400000).toISOString(),points:20,cover_url:null};
const future={...event,id:'22222222-2222-4222-8222-222222222222',title:'فعالية قادمة للاختبار',start_at:new Date(Date.now()+172800000).toISOString(),end_at:new Date(Date.now()+180000000).toISOString()};
const user={profile:{id:'fixture-leader',full_name:'قائد اختبار',student_code:'0000000',phone:'00000000000',role:'leader'},registrations:[],points:[]};
const row=(code,pending)=>({user_id:pending?null:'user-'+code,profiles:{full_name:pending?'':'طالب لديه حساب',phone:pending?'':'00000000000',student_code:code},going:true,present:true,has_rsvp:false,registered_before:false,pending_account:pending,points:20,excuse:'',accommodation:''});
let rows=[],failStats=false,addedCalls=0,actorRole='leader';
await p.route('**/api/action*',async route=>{
 const req=route.request();if(req.method()==='GET')return route.fulfill({json:{events:[event,future],home:{},news:[]}});
 const b=req.postDataJSON();if(b.action==='events')return route.fulfill({json:{events:[event,future]}});if(b.action==='event')return route.fulfill({json:{event:b.event_id===event.id?event:future}});if(b.action==='me')return route.fulfill({json:{...user,profile:{...user.profile,role:actorRole}}});
 if(b.action==='event-stats'){if(failStats)return route.fulfill({status:503,json:{error:'temporary'}});return route.fulfill({json:{rows:[{event_id:event.id,rsvp_count:3,attended_count:2+rows.length,pending_count:rows.filter(r=>r.pending_account).length},{event_id:future.id,rsvp_count:5,attended_count:0,pending_count:0}]}})}
 if(b.action==='attendees')return route.fulfill({json:{rows,attendance:rows.filter(r=>r.user_id).map(r=>({user_id:r.user_id}))}});
 if(b.action==='manual-code'){addedCalls++;assert.deepEqual(Object.keys(b).sort(),['action','event_id','student_code']);assert(/^[0-9]{7}$/.test(b.student_code));const existed=rows.some(r=>r.profiles.student_code===b.student_code);const pending=b.student_code!=='2527002';if(!existed)rows.push(row(b.student_code,pending));return route.fulfill({json:{saved:true,pendingAccount:pending,alreadyRecorded:existed,points:20,creditedPoints:pending||existed?0:20}})}
 return route.fulfill({status:400,json:{error:'Fixture operation unavailable'}});
});
await p.goto(base+'/?view=leader');await p.locator('.leader-event-counts').filter({hasText:'5'}).waitFor();assert.equal(await p.locator('.leader-event-counts').getByText('حضروا',{exact:false}).count(),0);
await p.getByRole('button',{name:'السابقة',exact:true}).click();await p.getByRole('heading',{name:event.title,exact:true}).waitFor();
let counts=p.locator('.leader-event-counts');assert((await counts.innerText()).includes('3'));assert((await counts.innerText()).includes('2'));assert((await counts.innerText()).includes('حضروا'));
await p.getByRole('button',{name:'إدارة الحضور',exact:true}).click();await p.getByRole('heading',{name:'لم يسجل أحد بعد',exact:true}).waitFor();
const form=p.locator('.leader-add-code');assert.deepEqual(await form.locator('input').evaluateAll(els=>els.map(e=>e.name)),['student_code']);assert.equal(await form.getByRole('button',{name:'تسجيل الحضور',exact:true}).isEnabled(),true,'Leaders can record past event attendance');
await p.getByLabel('إضافة حضور بكود الطالب',{exact:true}).fill('٢٥٢٧٠٠١');await form.getByRole('button',{name:'تسجيل الحضور',exact:true}).click();await p.getByText('20 نقطة محفوظة',{exact:true}).waitFor();
assert.equal(await p.locator('.leader-person a[href^="tel:"]').count(),0);assert.equal(await p.locator('.leader-person').count(),1);assert((await p.getByRole('status').filter({hasText:'تم حفظ حضور'}).innerText()).includes('تلقائيًا'));
await p.getByLabel('إضافة حضور بكود الطالب',{exact:true}).fill('2527001');await form.getByRole('button',{name:'تسجيل الحضور',exact:true}).click();await p.getByRole('status').filter({hasText:'الحضور مسجل بالفعل'}).waitFor();assert.equal(await p.locator('.leader-person').count(),1);
await p.getByLabel('إضافة حضور بكود الطالب',{exact:true}).fill('2527002');await form.getByRole('button',{name:'تسجيل الحضور',exact:true}).click();await p.getByText('طالب لديه حساب',{exact:true}).waitFor();assert.equal(addedCalls,3);assert.equal(await p.locator('.leader-person').count(),2);
for(const width of [390,375]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
await p.screenshot({path:'/workspace/work/code-attendance-phone.png',fullPage:true});
await p.getByRole('button',{name:'العودة للإدارة',exact:true}).click();await p.getByRole('button',{name:'السابقة',exact:true}).click();await p.locator('.leader-event-counts').filter({hasText:'4'}).waitFor();counts=p.locator('.leader-event-counts');assert((await counts.innerText()).includes('3'));assert((await counts.innerText()).includes('1 بانتظار إنشاء الحساب'));
failStats=true;await p.getByRole('button',{name:'تحديث الأعداد',exact:true}).click();await p.getByRole('alert').filter({hasText:'تعذّر تحديث الأعداد'}).waitFor();assert((await counts.innerText()).includes('4'),'A failed refresh must not replace known counts with zero');
failStats=false;await p.getByRole('button',{name:'تحديث الأعداد',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.leader-count-refresh button').disabled);
await p.screenshot({path:'/workspace/work/event-counts-phone.png',fullPage:true});
actorRole='student';await p.goto(base+'/?event='+event.id);await p.getByRole('heading',{name:event.title,exact:true,level:1}).waitFor();assert.equal(await p.locator('.leader-add-code,.leader-roster').count(),0);
assert.deepEqual(errors,[]);console.log('PASS event-list RSVP/past attendance counts, code-only form, Arabic digits, pending credit, duplicate handling, existing-account walk-in, refresh error, mobile, student visibility');await browser.close();
