import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.UI_TEST_BASE_URL||'http://localhost:4300';
const storage='https://qtoujzmmsojwmgpakrbi.supabase.co';
const actor='11111111-1111-4111-8111-111111111111';
const eventId='22222222-2222-4222-8222-222222222222';
const photo=await readFile('docs/branding/original-logo.jpg');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],proxy:base.startsWith('https:')&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},locale:'en-US'});const p=await context.newPage();const png=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=4;c.height=4;const x=c.getContext('2d');x.fillStyle='#ce1126';x.fillRect(0,0,4,4);return c.toDataURL('image/png').split(',')[1]}),'base64');const errors=[];p.on('pageerror',e=>errors.push(e.message));
let authenticated=false,role='student',rsvps=0,uploads=0,created=null,home={};
let news=[{id:'news-1',title:'خبر من الكلية',body:'التفاصيل نزلت من الأسرة.',created_at:'2026-11-16T10:00:00Z'}];
let events=[{id:eventId,title:'لقاء طلاب العلوم الخاص بالأعضاء',description:'تفاصيل اللقاء',location:'كلية العلوم',start_at:'2026-12-05T08:00:00Z',end_at:'2026-12-05T10:00:00Z',points:20,cover_url:null}];
let signedRead=storage+'/storage/v1/object/sign/event-images/'+actor+'/33333333-3333-4333-8333-333333333333.jpg?token=fixture';
const member=()=>({profile:{id:actor,student_code:'2527001',full_name:'طالب اختبار',phone:'00000000000',email:null,role},registrations:rsvps?[{event_id:eventId,going:true,excuse:'',accommodation:'',request_status:'accepted'}]:[],points:[]});
await p.route(storage+'/storage/v1/object/upload/sign/**',async route=>{
 assert.equal(route.request().method(),'PUT');const bytes=route.request().postDataBuffer();assert(bytes.length<2*1024*1024+5000);assert(bytes.includes(Buffer.from([255,216,255])),'Upload must contain a re-encoded JPEG');
 uploads++;return route.fulfill({json:{Key:'fixture'}});
});
await p.route('https://example.invalid/banner.jpg',route=>route.fulfill({body:photo,contentType:'image/jpeg'}));
await p.route(storage+'/storage/v1/object/sign/**',route=>route.fulfill({body:photo,contentType:'image/jpeg'}));
await p.route(storage+'/storage/v1/object/public/site-images/**',route=>route.fulfill({body:photo,contentType:'image/jpeg'}));
await p.route('**/api/action*',async route=>{
 const request=route.request();if(request.method()==='GET')return route.fulfill({json:{events:[],news,home}});
 const b=request.postDataJSON();
 if(!authenticated)return route.fulfill({status:401,json:{error:'Login required'}});
 if(b.action==='me')return route.fulfill({json:member()});
 const list=events.map(e=>({...e,cover_url:e.cover_url?.includes('/object/public/event-images/')?signedRead:e.cover_url}));
 if(b.action==='events')return route.fulfill({json:{events:list}});
 if(b.action==='event')return route.fulfill({json:{event:list.find(e=>e.id===b.event_id)}});
 if(b.action==='rsvp'){rsvps++;return route.fulfill({json:{saved:true,status:'accepted'}})}
 if(role!=='leader')return route.fulfill({status:403,json:{error:'Forbidden'}});
 if(b.action==='event-stats')return route.fulfill({json:{rows:events.map(e=>({event_id:e.id,rsvp_count:rsvps,attended_count:0,pending_count:0}))}});
 if(b.action==='image-upload'){
  assert.deepEqual(Object.keys(b).sort(),['action','purpose']);const bucket=b.purpose==='event'?'event-images':'site-images';
  const path=actor+'/'+('00000000-0000-4000-8000-'+String(uploads+1).padStart(12,'0'))+'.jpg';
  return route.fulfill({json:{upload_url:storage+'/storage/v1/object/upload/sign/'+bucket+'/'+path+'?token=fixture',asset_url:storage+'/storage/v1/object/public/'+bucket+'/'+path}});
 }
 if(b.action==='image-read')return route.fulfill({json:{url:signedRead}});
 if(b.action==='create-event'){created=b;events.push({...b,id:'44444444-4444-4444-8444-444444444444'});return route.fulfill({json:{id:events.at(-1).id,code:'MAM1.fixture.code'}})}
 if(b.action==='home'){home=b.home;return route.fulfill({json:{saved:true}})}
 return route.fulfill({status:400,json:{error:'Unexpected fixture action'}});
});
await p.route('**/api/auth',route=>{const b=route.request().postDataJSON();if(b.action==='logout'){authenticated=false;return route.fulfill({json:{ok:true}})}authenticated=true;return route.fulfill({json:{ok:true,...(b.action==='signup'?{recovery:'fixture-recovery-code-long-enough'}:{})}})});
await p.goto(base);await p.getByRole('heading',{name:'من أجل مصر متاحة للكل',exact:true}).waitFor();assert.equal(await p.getByRole('heading',{name:'آخر أخبارنا',exact:true}).count(),0);assert.equal(await p.getByText('خبر من الكلية',{exact:true}).count(),0);
assert.equal(await p.locator('.dp-timeline,.dp-home-events').count(),0);assert.equal(await p.getByText(events[0].title,{exact:true}).count(),0);
await p.goto(base+'/?event='+eventId);await p.getByRole('heading',{name:'سجّل معانا عشان تأكد مشاركتك',exact:true}).waitFor();assert.equal(await p.getByText(events[0].title,{exact:true}).count(),0);
await p.getByRole('button',{name:'اعمل حسابك',exact:true}).click();const signup=p.getByRole('dialog');await signup.locator('[name="full_name"]').fill('طالب اختبار');await signup.locator('[name="student_code"]').fill('2527001');await signup.locator('[name="phone"]').fill('01012345678');await signup.locator('[name="national_id"]').fill('12345678901234');await signup.locator('[name="password"]').fill('FixturePassword123!');await signup.getByRole('button',{name:'إنشاء حساب',exact:true}).click();
await p.getByRole('dialog',{name:'كود الاستعادة'}).waitFor();await p.getByRole('button',{name:'حفظت الكود في مكان آمن',exact:true}).click();await p.getByRole('heading',{name:events[0].title,exact:true,level:1}).waitFor();assert(p.url().includes('event='+eventId));assert.equal(rsvps,0);
await p.getByRole('button',{name:'أكد مشاركتك واحفظ الطلبات',exact:true}).click();await p.getByText('مشاركة مؤكدة',{exact:true}).waitFor();assert.equal(rsvps,1);
await p.goto(base+'/?view=account');await p.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await p.goto(base+'/?event='+eventId);await p.getByRole('heading',{name:'سجّل معانا عشان تأكد مشاركتك',exact:true}).waitFor();assert.equal(await p.getByText(events[0].title,{exact:true}).count(),0);
await p.getByRole('button',{name:'عندي حساب، سجّل دخولي',exact:true}).click();const login=p.getByRole('dialog');await login.locator('[name="student_code"]').fill('2527001');await login.locator('[name="password"]').fill('FixturePassword123!');await login.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();await p.getByRole('heading',{name:events[0].title,exact:true,level:1}).waitFor();assert(p.url().includes('event='+eventId));
role='leader';await p.goto(base+'/?view=leader');await p.getByRole('heading',{name:'إدارة الأسرة',exact:true}).waitFor();assert.equal(await p.locator('.leader-event-art .event-artwork-fallback').count(),1);assert.equal(await p.locator('.leader-event-art .event-artwork-logo').count(),1);
await p.getByRole('button',{name:'إنشاء فعالية',exact:true}).click();const create=p.getByRole('dialog',{name:'إنشاء فعالية'});await create.getByLabel('العنوان',{exact:true}).fill('فعالية بصورة مرفوعة');await create.getByLabel('الوصف ونقطة التجمع',{exact:true}).fill('تفاصيل للواجهة');await create.getByLabel('المكان',{exact:true}).fill('الكلية');await create.getByLabel('البداية',{exact:true}).fill('2026-12-06T10:00');await create.getByLabel('النهاية',{exact:true}).fill('2026-12-06T12:00');
await create.getByText('أو استخدم رابط صورة',{exact:true}).click();await create.getByRole('textbox',{name:'رابط صورة الفعالية',exact:true}).fill('https://example.invalid/banner.jpg');assert.equal(await create.locator('input[name="cover_url"]').inputValue(),'https://example.invalid/banner.jpg');
await create.locator('input[type="file"]').setInputFiles({name:'cover.jpg',mimeType:'image/jpeg',buffer:photo});await p.waitForFunction(()=>document.querySelector('input[name="cover_url"]')?.value.includes('/object/public/event-images/'));await create.locator('.image-upload-preview').waitFor();await p.waitForFunction(()=>!document.querySelector('.image-upload button')?.disabled);assert.equal(uploads,1);assert.equal(created,null);assert(await create.locator('.image-upload-preview').evaluate(e=>e.complete&&e.naturalWidth>0));
await create.getByRole('button',{name:'إنشاء وحفظ رمز الحضور',exact:true}).click();await p.getByRole('dialog',{name:'رمز حضور الفعالية'}).waitFor();assert(created.cover_url.includes('/object/public/event-images/'));assert(!created.cover_url.includes('token='));await p.getByRole('button',{name:'تم',exact:true}).click();
await p.getByRole('tab',{name:'الصفحة الرئيسية',exact:true}).click();const panel=p.locator('#leader-page-home');const pickers=panel.locator('.image-picker');await pickers.nth(0).locator('input[type="file"]').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:png});await pickers.nth(0).locator('.image-upload-preview').waitFor();await p.waitForFunction(()=>!document.querySelector('#leader-page-home .image-upload button')?.disabled);
await pickers.nth(1).locator('input[type="file"]').setInputFiles([{name:'one.jpg',mimeType:'image/jpeg',buffer:photo},{name:'two.jpg',mimeType:'image/jpeg',buffer:photo}]);await p.waitForFunction(()=>document.querySelectorAll('.gallery-preview img').length===2);await p.waitForFunction(()=>!document.querySelector('#leader-page-home button.primary')?.disabled);
await panel.getByRole('button',{name:'حفظ الوسائط',exact:true}).click();await p.getByRole('status').filter({hasText:'اتحفظت'}).waitFor();assert.equal(home.gallery_urls.length,2);assert(home.poster_url.includes('/site-images/'));
assert.equal(await p.getByRole('tab',{name:'الأخبار',exact:true}).count(),0);await p.getByRole('button',{name:'الرئيسية',exact:true}).first().click();assert.equal(await p.locator('.dp-news,.dp-timeline,.dp-home-events').count(),0);
for(const width of [390,375]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}await p.getByRole('button',{name:'تغيير المظهر',exact:true}).click();assert.equal(await p.getByRole('button',{name:'EN',exact:true}).count(),0);await p.screenshot({path:'/workspace/work/news-home-phone.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS home without news, private guest event gate, signup/login return to RSVP, logout privacy, JPEG upload, private cover, public homepage/gallery uploads, red branded fallback, Arabic/mobile/dark');await browser.close();
